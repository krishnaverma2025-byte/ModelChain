import test from 'node:test';
import assert from 'node:assert/strict';
import {createWalletSession,restoreWalletSession} from '../src/walletSession.mjs';
import {createReadPool,apiError} from '../src/read-pool.mjs';
import {rollbackUpload,shouldCleanupUpload} from '../src/upload-rollback.mjs';
import {walletHandoff} from '../src/mobile-wallet.mjs';

const address='0x'+'a'.repeat(40), other='0x'+'b'.repeat(40), chain='11155111';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),data};};
const provider=(account=address,network='0xaa36a7')=>({request:async({method})=>method==='eth_accounts'?[account]:network});
function savedSession(memory) {
  const store=createWalletSession(Date.now,{storage:memory});
  store.connection(address,chain);
  store.authenticated({address,headers:{Authorization:'Bearer opaque-fixture'},expiresAt:Date.now()+60000},store.snapshot().revision);
  return store;
}
test('reload restores only after provider and backend verification, storing only four safe fields',async()=>{
  const memory=storage(); savedSession(memory);
  const serialized=JSON.parse([...memory.data.values()][0]);
  assert.deepEqual(Object.keys(serialized).sort(),['address','chain','expiresAt','token']);
  const store=createWalletSession(Date.now,{storage:memory});
  let release; const result=restoreWalletSession({store,ethereum:provider(),chainId:chain,verify:()=>new Promise(resolve=>{release=resolve;})});
  await new Promise(r=>setTimeout(r,0));
  assert.equal(store.snapshot().authenticated,'');
  release({address,expiresAt:Date.now()+30000});
  assert.equal(await result,true);
  assert.equal(store.require(chain).authenticated,address);
});
for(const scenario of ['expired','backend rejection','wrong account','wrong chain','profile mismatch','missing provider','malformed storage','backend wallet mismatch','backend missing expiry']) {
  test(`reload rejects ${scenario} and clears storage`,async()=>{
    const memory=storage(); savedSession(memory);
    if(scenario==='expired') {const [key,value]=[...memory.data.entries()][0];memory.setItem(key,JSON.stringify({...JSON.parse(value),expiresAt:1}));}
    if(scenario==='malformed storage') memory.setItem('montai.wallet-session.v1','{"signature":"never-trust"}');
    const store=createWalletSession(Date.now,{storage:memory});
    if(scenario==='profile mismatch') store.profile({user_metadata:{linked_wallet_address:other}});
    let checks=0;
    const restored=await restoreWalletSession({store,chainId:chain,ethereum:scenario==='missing provider'?null:provider(scenario==='wrong account'?other:address,scenario==='wrong chain'?'0x1':'0xaa36a7'),verify:async()=>{
      checks++; if(scenario==='backend rejection') throw new Error('401');
      return {address:scenario==='backend wallet mismatch'?other:address,expiresAt:scenario==='backend missing expiry'?undefined:Date.now()+30000};
    }});
    assert.equal(restored,false);assert.equal(store.snapshot().authenticated,'');assert.equal(memory.data.size,0);
    if(['expired','wrong account','wrong chain','profile mismatch','missing provider','malformed storage'].includes(scenario)) assert.equal(checks,0);
  });
}
test('duplicate events and successful actions preserve auth; real changes/logout/disconnect clear it',async()=>{
  const memory=storage(),store=savedSession(memory), revision=store.snapshot().revision;
  store.connection(address.toUpperCase().replace('0X','0x'),chain);
  store.connection(address,'0xaa36a7');
  assert.equal(store.snapshot().revision,revision);
  for(const action of ['registerModel','purchaseLicense','setModelActive','withdrawRevenue']) {
    await Promise.resolve(action);assert.equal(store.require(chain).authenticated,address);
  }
  store.connection(other,chain);assert.equal(memory.data.size,0);assert.equal(store.snapshot().authenticated,'');
  savedSession(memory).connection(address,'1');assert.equal(memory.data.size,0);
  savedSession(memory).invalidate();assert.equal(memory.data.size,0);
  savedSession(memory).connection('','');assert.equal(memory.data.size,0);
});
test('late reload verification cannot revive an account-changed or logged-out session',async()=>{
  for(const change of [s=>s.connection(other,chain),s=>s.invalidate(),s=>s.profile({user_metadata:{linked_wallet_address:other}})]) {
    const memory=storage();savedSession(memory);const store=createWalletSession(Date.now,{storage:memory});let release;
    const restore=restoreWalletSession({store,ethereum:provider(),chainId:chain,verify:()=>new Promise(resolve=>release=resolve)});
    await new Promise(r=>setTimeout(r,0));change(store);release({address,expiresAt:Date.now()+30000});
    assert.equal(await restore,false);assert.equal(store.snapshot().authenticated,'');assert.equal(memory.data.size,0);
  }
});
test('rollback once for rejection/pre-send failure/mined failure; never for success or uncertain broadcasts',async()=>{
  for(const context of [{error:{code:4001},sendStarted:true},{error:new Error('creation failed')},{receipt:{status:0},transaction:{hash:'fixture'}},{error:{receipt:{status:0,hash:'fixture'}}}]) {
    let calls=0;const result=await rollbackUpload({...context,cid:'fixture-cid'},async()=>calls++);assert.equal(result.removed,true);assert.equal(calls,1);
  }
  for(const context of [{receipt:{status:1}},{transaction:{hash:'pending'}},{error:{transactionHash:'pending'}},{error:{code:'NETWORK_ERROR'},sendStarted:true},{error:{code:'TIMEOUT'},sendStarted:true},{error:{receipt:{status:1}}}]) assert.equal(shouldCleanupUpload(context),false);
  let calls=0;const result=await rollbackUpload({cid:'fixture-cid',error:{code:4001}},async()=>{calls++;throw new Error('sensitive provider details');});
  assert.equal(calls,1);assert.equal(result.removed,false);assert.doesNotMatch(result.message,/sensitive/);
});
test('identical reads deduplicate, cancel independently, stop abandoned work, and never retry after 429',async()=>{
  const read=createReadPool();let calls=0,release;
  const loader=()=>{calls++;return new Promise(resolve=>release=resolve);};
  const first=new AbortController(),second=new AbortController();
  const a=read('metadata',loader,first.signal),b=read('metadata',loader,second.signal);
  first.abort();await assert.rejects(a,{name:'AbortError'});await new Promise(r=>setTimeout(r,0));release('model');
  assert.equal(await b,'model');assert.equal(calls,1);
  let aborted=false;const cancel=new AbortController();
  const abandoned=read('abandoned',signal=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('cancelled'));})),cancel.signal);
  await new Promise(r=>setTimeout(r,0));cancel.abort();await assert.rejects(abandoned,{name:'AbortError'});await new Promise(r=>setTimeout(r,70));assert.equal(aborted,true);
  let failures=0;await assert.rejects(read('429',async()=>{failures++;throw new Error(apiError(429));}),/Too many requests/);assert.equal(failures,1);
});
test('mobile handoff is explicit HTTPS dapp link, preserves safe paths and drops sensitive query/fragment',()=>{
  assert.equal(walletHandoff({userAgent:'iPhone',href:'https://montai-six.vercel.app/model/1?token=private#secret'}),'https://metamask.app.link/dapp/montai-six.vercel.app/model/1');
  assert.equal(walletHandoff({userAgent:'Android',href:'https://montai-preview.vercel.app/upload-model'}),'https://metamask.app.link/dapp/montai-preview.vercel.app/upload-model');
  assert.equal(walletHandoff({userAgent:'Desktop'}),null);
  assert.ok(walletHandoff({userAgent:'Macintosh',maxTouchPoints:5}));
  assert.equal(walletHandoff({userAgent:'iPhone',hasProvider:true}),null);
  for(const href of ['javascript:alert(1)','http://localhost:5173/model/1','https://user:pass@example.com','https://127.0.0.1']) assert.equal(walletHandoff({userAgent:'iPhone',href}),'https://metamask.app.link/dapp/montai-six.vercel.app/');
});
