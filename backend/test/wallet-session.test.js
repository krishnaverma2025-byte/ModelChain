import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { createApp } from '../src/app.js';

test('authenticated wallets stay isolated and challenge/session expiry is enforced',async()=>{
 const creator=Wallet.createRandom(), buyer2=Wallet.createRandom(), buyer3=Wallet.createRandom(), buyer4=Wallet.createRandom();
 let now=Date.now();const licenses=new Set([buyer2.address.toLowerCase()]);const queried=[];
 const model={owner:creator.address,cid:'encrypted-test',modelHash:'ab'};
 const chain={getModelCount:async()=>1n,getModel:async()=>model,hasLicense:async(id,wallet)=>{queried.push(wallet);return licenses.has(wallet);}};
 const storage={record:async()=>({...model,owner:creator.address.toLowerCase(),fileName:'model.bin'}),decrypt:async()=>Buffer.from('authorized fixture')};
 const server=createApp({chain,storage,origin:'http://localhost:5173',chainId:'31337',contractAddress:creator.address,now:()=>now}).listen(0,'127.0.0.1');
 await new Promise(r=>server.on('listening',r));const url=`http://127.0.0.1:${server.address().port}`;
 const post=(path,body)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 async function challenge(w){return (await post('/api/auth/challenge',{address:w.address})).json();}
 async function login(w){const c=await challenge(w);const r=await post('/api/auth/session',{address:w.address,nonce:c.nonce,signature:await w.signMessage(c.message)});assert.equal(r.status,200);const s=await r.json();assert.equal(s.address,w.address.toLowerCase());return s.token;}
 const download=token=>fetch(url+'/api/models/1/download',{headers:{Authorization:`Bearer ${token}`}});
 try{
  const token2=await login(buyer2),token3=await login(buyer3),token4=await login(buyer4);
  assert.equal((await download(token2)).status,200);assert.equal((await download(token3)).status,403);
  licenses.add(buyer3.address.toLowerCase());assert.equal((await download(token3)).status,200);
  const denied=await download(token4);assert.equal(denied.status,403);assert.equal((await denied.json()).wallet,buyer4.address.toLowerCase());
  assert.equal((await download(token3)).status,200);assert.equal((await download(token2)).status,200);
  assert.deepEqual(queried,[buyer2,buyer3,buyer3,buyer4,buyer3,buyer2].map(w=>w.address.toLowerCase()));
  const c=await challenge(buyer3);
  assert.equal((await post('/api/auth/session',{address:buyer4.address,nonce:c.nonce,signature:await buyer3.signMessage(c.message)})).status,401);
  const expired=await challenge(buyer3);now+=300001;
  assert.equal((await post('/api/auth/session',{address:buyer3.address,nonce:expired.nonce,signature:await buyer3.signMessage(expired.message)})).status,401);
  now+=3600001;assert.equal((await download(token3)).status,401);
 }finally{await new Promise(r=>server.close(r));}
});
