import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {Wallet} from 'ethers';
import {createApp} from '../src/app.js';
import {createStorage} from '../src/storage.js';
import {REQUEST_LIMITS} from '../src/request-limits.js';

async function fixture(t,storageOptions={}) {
  const owner=Wallet.createRandom(),other=Wallet.createRandom();let models=[],unavailable=false,growing=false,checks=0;
  const directory=await mkdtemp(path.join(tmpdir(),'montai-stability-'));
  const storage=createStorage({directory,masterKey:randomBytes(32).toString('hex'),...storageOptions});
  const chain={getModelCount:async()=>{if(unavailable)throw new Error('private-rpc-canary');if(growing)return BigInt(checks++);return BigInt(models.length);},getModel:async id=>models[Number(id)-1],hasLicense:async()=>false};
  const server=createApp({chain,storage,chainId:'31337',contractAddress:owner.address,origin:'http://localhost:5173'}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.on('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const api=`http://127.0.0.1:${server.address().port}`;
  const request=(route,options={})=>fetch(api+route,options);
  const post=(route,body)=>request(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const login=async wallet=>{
    const challenge=await (await post('/api/auth/challenge',{address:wallet.address})).json();
    const session=await(await post('/api/auth/session',{address:wallet.address,nonce:challenge.nonce,signature:await wallet.signMessage(challenge.message)})).json();
    return {Authorization:`Bearer ${session.token}`};
  };
  return {owner,other,storage,directory,request,post,login,setModels:value=>models=value,failRpc:()=>unavailable=true,grow:()=>growing=true};
}
test('cleanup authenticates owner, rejects registered/inactive CIDs and removes only unregistered local packages',async t=>{
  const f=await fixture(t), headers=await f.login(f.owner), wrong=await f.login(f.other);
  const upload=await f.storage.save(Buffer.from('safe fixture'),{fileName:'safe.onnx'},f.owner.address);
  const endpoint=`/api/uploads/${upload.cid}`;
  assert.equal((await f.request(endpoint,{method:'DELETE'})).status,401);
  assert.equal((await f.request('/api/uploads/bad',{method:'DELETE',headers})).status,400);
  assert.equal((await f.request(endpoint,{method:'DELETE',headers:wrong})).status,403);
  f.setModels([{owner:f.owner.address,cid:upload.cid,active:false}]);
  assert.equal((await f.request(endpoint,{method:'DELETE',headers})).status,409);
  assert.equal((await f.storage.record(upload.cid)).owner,f.owner.address.toLowerCase());
  f.setModels([]);
  const session=await(await f.request('/api/auth/session',{headers})).json();
  assert.equal(session.address,f.owner.address.toLowerCase());assert.equal(session.chainId,'31337');assert.ok(session.expiresAt>Date.now());
  assert.equal((await f.request(endpoint,{method:'DELETE',headers})).status,204);
  await assert.rejects(f.storage.record(upload.cid),{code:'ENOENT'});
  await assert.rejects(readFile(path.join(f.directory,upload.cid+'.enc')),{code:'ENOENT'});
});
test('cleanup fails closed on RPC errors and registry changes',async t=>{
  for(const scenario of ['rpc','growth','large']) {
    const f=await fixture(t),headers=await f.login(f.owner);
    const upload=await f.storage.save(Buffer.from('safe fixture'),{fileName:'safe.onnx'},f.owner.address);
    if(scenario==='rpc')f.failRpc();else if(scenario==='growth')f.grow();else f.setModels(Array(501));
    const result=await f.request(`/api/uploads/${upload.cid}`,{method:'DELETE',headers});
    assert.equal(result.status,scenario==='rpc'?500:409);assert.doesNotMatch(await result.text(),/private-rpc-canary/);
    assert.ok(await f.storage.record(upload.cid));
  }
});
test('Pinata file ID stays server-side; delete failures preserve records; legacy records still decrypt',async t=>{
  let ciphertext,allow=false,deleteCalls=0;
  const cid='bafybeicleanupfixtureidentifier',id='11111111-1111-1111-1111-111111111111';
  const f=await fixture(t,{pinataJwt:'fixture-private',fetchImpl:async(url,options)=>{
    if(options.method==='POST') {ciphertext=Buffer.from(await options.body.get('file').arrayBuffer());return Response.json({data:{cid,id}});}
    if(!options.method) {assert.equal(url,`https://gateway.pinata.cloud/ipfs/${cid}`);return new Response(ciphertext);}
    assert.equal(url,`https://api.pinata.cloud/v3/files/public/${id}`);assert.equal(options.method,'DELETE');deleteCalls++;return new Response(null,{status:allow?204:403});
  }});
  const headers=await f.login(f.owner),bytes=Buffer.from('safe encrypted fixture');
  const upload=await f.storage.save(bytes,{fileName:'safe.onnx'},f.owner.address);
  assert.equal(upload.pinataFileId,undefined);assert.equal(ciphertext.includes(bytes),false);
  const record=await f.storage.record(cid);assert.equal(record.pinataFileId,id);
  const legacy={...record};delete legacy.pinataFileId;
  await writeFile(path.join(f.directory,cid+'.json'),JSON.stringify(legacy));
  await unlink(path.join(f.directory,cid+'.enc'));
  assert.deepEqual(await f.storage.decrypt(await f.storage.record(cid)),bytes);
  assert.equal((await f.request(`/api/uploads/${cid}`,{method:'DELETE',headers})).status,409);assert.equal(deleteCalls,0);
  await writeFile(path.join(f.directory,cid+'.json'),JSON.stringify(record));
  assert.equal((await f.request(`/api/uploads/${cid}`,{method:'DELETE',headers})).status,500);assert.ok(await f.storage.record(cid));assert.equal(deleteCalls,1);
  allow=true;
  assert.equal((await f.request(`/api/uploads/${cid}`,{method:'DELETE',headers})).status,204);assert.equal(deleteCalls,2);
});
test('endpoint budgets isolate metadata/health, protect auth/uploads and return safe JSON without trusting forwarded IPs',async t=>{
  const f=await fixture(t),headers=await f.login(f.owner);
  const upload=await f.storage.save(Buffer.from('safe fixture'),{fileName:'safe.onnx'},f.owner.address);
  f.setModels([{owner:f.owner.address,cid:upload.cid,modelHash:upload.modelHash}]);
  assert.ok(REQUEST_LIMITS.challenge<REQUEST_LIMITS.metadata);assert.ok(REQUEST_LIMITS.upload<REQUEST_LIMITS.metadata);
  for(let i=0;i<65;i++)assert.equal((await f.request('/api/models/1/metadata')).status,200);
  for(let i=0;i<REQUEST_LIMITS.upload;i++)assert.equal((await f.request('/api/uploads',{method:'POST',headers:{'X-Forwarded-For':`203.0.113.${i+1}`}})).status,401);
  const limited=await f.request('/api/uploads',{method:'POST'});assert.equal(limited.status,429);assert.deepEqual(await limited.json(),{error:'Too many requests. Wait a moment before trying again.'});
  for(let i=1;i<REQUEST_LIMITS.challenge;i++)assert.equal((await f.post('/api/auth/challenge',{address:f.owner.address})).status,200);
  assert.equal((await f.post('/api/auth/challenge',{address:f.owner.address})).status,429);
  assert.equal((await f.request('/api/models/1/metadata')).status,200);
  assert.equal((await f.request('/health')).status,200);
  assert.equal((await f.request('/api/auth/session',{headers})).status,200);
});
