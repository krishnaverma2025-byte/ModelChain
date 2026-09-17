import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Wallet } from 'ethers';
import { createStorage, digest } from '../src/storage.js';
import { createApp } from '../src/app.js';

test('encrypted upload, signature replay prevention and server-side license checks',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'montai-test-'));
 const storage=createStorage({directory,masterKey:randomBytes(32).toString('hex')});
 const owner=Wallet.createRandom(), buyer=Wallet.createRandom(); let licensed=false,m;
 const chain={getModelCount:async()=>1n,getModel:async()=>m,hasLicense:async(id,address)=>licensed&&address===buyer.address.toLowerCase()};
 const server=createApp({chain,storage,origin:'http://localhost:5173',chainId:'31337',contractAddress:owner.address}).listen(0,'127.0.0.1');
 await new Promise(r=>server.on('listening',r));
 const api=`http://127.0.0.1:${server.address().port}`;
 const post=(url,body)=>fetch(api+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 async function login(w){const challenge=await(await post('/api/auth/challenge',{address:w.address})).json();const body={nonce:challenge.nonce,signature:await w.signMessage(challenge.message)};const session=await(await post('/api/auth/session',body)).json();assert.equal((await post('/api/auth/session',body)).status,401);return {Authorization:`Bearer ${session.token}`};}
 try {
 const ownerHeaders=await login(owner), buyerHeaders=await login(buyer);
 assert.equal((await post('/api/auth/challenge',{})).status,400);
 assert.equal((await post('/api/auth/session',{})).status,401);
 const challenge=await(await post('/api/auth/challenge',{address:buyer.address})).json();
 assert.equal((await post('/api/auth/session',{nonce:challenge.nonce,signature:await owner.signMessage(challenge.message)})).status,401);
 const bytes=Buffer.from('private original model bytes');
 const form=new FormData();form.append('model',new Blob([bytes]),'model.onnx');form.append('name','Model');
 const uploaded=await fetch(api+'/api/uploads',{method:'POST',headers:ownerHeaders,body:form}); assert.equal(uploaded.status,201);
 const result=await uploaded.json(); assert.equal(result.wrappedKey,undefined); assert.equal(result.modelHash,digest(bytes));
 const ciphertext=await readFile(path.join(directory,result.cid+'.enc')); assert.equal(ciphertext.includes(bytes),false);
 m={id:1n,owner:owner.address,cid:result.cid,modelHash:result.modelHash};
 assert.equal((await fetch(api+'/api/models/1/download')).status,401);
 assert.equal((await fetch(api+'/api/models/1/download',{headers:buyerHeaders})).status,403);
 assert.equal((await fetch(api+'/api/models/1/download?licensed=true',{headers:buyerHeaders})).status,403);
 assert.equal((await fetch(api+'/api/models/0/download',{headers:buyerHeaders})).status,400);
 assert.equal((await fetch(api+'/api/models/1/download',{headers:ownerHeaders})).status,200);
 const metadata=await(await fetch(api+'/api/models/1/metadata')).json();assert.equal(metadata.wrappedKey,undefined);
 licensed=true;
 const download=await fetch(api+'/api/models/1/download',{headers:buyerHeaders});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);
 m.modelHash='0'.repeat(64);assert.equal((await fetch(api+'/api/models/1/download',{headers:buyerHeaders})).status,409);
 }finally{await new Promise(r=>server.close(r));}
});
