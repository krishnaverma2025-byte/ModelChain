import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createStorage } from '../src/storage.js';
import { createRecordStore } from '../src/record-store.js';
import { deploymentConfig } from '../src/config.js';

const contractAddress='0x0000000000000000000000000000000000000001';
const bucket='montai-private-records';
const cid='bafybeiencryptedremoteidentifier';
const base={url:'https://records.example.invalid',serviceRoleKey:'fixture-service-only',bucket,chainId:'11155111',contractAddress};
function remote() {
  const records=new Map(); let ciphertext, publicBucket=false, fail=false;
  const requests=[];
  const fetchImpl=async(url,options={})=>{
    requests.push({url,options});
    if(url.startsWith(base.url)) {
      assert.equal(options.headers.Authorization,'Bearer fixture-service-only');
      assert.equal(options.headers.apikey,'fixture-service-only');
      assert.equal(options.redirect,'error');
      if(fail) return new Response('private remote failure detail',{status:503});
      if(url.endsWith(`/bucket/${bucket}`)) return Response.json({id:bucket,public:publicBucket});
      const key=url.replace('/authenticated','');
      if(options.method==='POST') {
        assert.equal(options.headers['x-upsert'],'false');
        assert.equal(records.has(key),false);
        records.set(key,JSON.parse(options.body)); return Response.json({Key:key});
      }
      return records.has(key)?Response.json(records.get(key)):new Response('',{status:404});
    }
    if(url==='https://uploads.pinata.cloud/v3/files') {
      ciphertext=Buffer.from(await options.body.get('file').arrayBuffer());
      return Response.json({data:{cid}});
    }
    assert.equal(url,`https://gateway.pinata.cloud/ipfs/${cid}`);
    return new Response(ciphertext);
  };
  return {fetchImpl,records,requests,setPublic:()=>{publicBucket=true;},setFailure:()=>{fail=true;},tamper:()=>{ciphertext[13]^=1;}};
}
test('production records persist remotely across an empty filesystem; IPFS ciphertext and wrapped keys verify',async()=>{
  const fixture=remote();
  const masterKey=randomBytes(32).toString('hex'),bytes=Buffer.from('remote protected original model');
  const directory=await mkdtemp(path.join(tmpdir(),'montai-remote-records-'));
  const recordStore=createRecordStore({...base,fetchImpl:fixture.fetchImpl});
  await recordStore.verifyPrivate();
  const storage=createStorage({directory,masterKey,pinataJwt:'fixture-pinata',recordStore,production:true,fetchImpl:fixture.fetchImpl});
  const result=await storage.save(bytes,{name:'Fixture',description:'test',category:'Computer Vision',fileName:'fixture.onnx',cid:'override-must-not-win',modelHash:'override-must-not-win'},contractAddress);
  assert.equal(result.cid,cid); assert.equal(result.wrappedKey,undefined);
  const expected=`${base.url}/storage/v1/object/${bucket}/11155111/${contractAddress}/${cid}.json`;
  assert.ok(fixture.records.has(expected));
  assert.equal(JSON.stringify([...fixture.records.values()]).includes(masterKey),false);
  assert.equal(JSON.stringify([...fixture.records.values()]).includes(bytes.toString()),false);
  await assert.rejects(readFile(path.join(directory, cid+'.json')), {code:'ENOENT'});
  const empty=await mkdtemp(path.join(tmpdir(),'montai-remote-restart-'));
  const restarted=createStorage({directory:empty,masterKey,pinataJwt:'fixture-pinata',production:true,recordStore:createRecordStore({...base,fetchImpl:fixture.fetchImpl}),fetchImpl:fixture.fetchImpl});
  const record=await restarted.record(cid);
  assert.deepEqual(await restarted.decrypt(record),bytes);
  assert.ok(fixture.requests.some(r=>r.url.includes('/object/authenticated/')));
  const wrong=createStorage({directory:empty,masterKey:randomBytes(32).toString('hex'),recordStore,fetchImpl:fixture.fetchImpl});
  await assert.rejects(()=>wrong.decrypt(record));
  const wrapped = Buffer.from(record.wrappedKey,'base64'); wrapped[13]^=1;
  await assert.rejects(()=>restarted.decrypt({...record,wrappedKey:wrapped.toString('base64')}));
  await assert.rejects(()=>restarted.decrypt({...record,encryptedHash:'0'.repeat(64)}),/Ciphertext integrity/);
  fixture.tamper();await assert.rejects(()=>restarted.decrypt(record),/Ciphertext integrity/);
  fixture.setFailure();await assert.rejects(()=>restarted.record(cid),/HTTP 503/);
  await assert.rejects(()=>restarted.save(bytes,{fileName:'fixture.onnx'},contractAddress),/HTTP 503/);
});
test('private bucket, no fallback, bounded records and namespace validation fail closed',async()=>{
  const fixture=remote(), store=createRecordStore({...base,fetchImpl:fixture.fetchImpl});
  fixture.setPublic(); await assert.rejects(()=>store.verifyPrivate(),/PRIVATE/);
  await assert.rejects(()=>store.record(cid),/PRIVATE/);
  assert.throws(()=>createRecordStore({...base,bucket:'../public'}),/namespace/);
  assert.throws(()=>createRecordStore({...base,url:'http://records.invalid'}),/HTTPS/);
  const masterKey=randomBytes(32).toString('hex');
  assert.throws(()=>createStorage({directory:tmpdir(),masterKey,pinataJwt:'fixture',production:true}),/persistent/);
  const oversized=createRecordStore({...base,fetchImpl:async()=>new Response('x'.repeat(17000))});
  await assert.rejects(()=>oversized.verifyPrivate(),/size limit/);
  await assert.rejects(()=>store.record('../unsafe'),/PRIVATE|Invalid CID/);
});
test('public startup configuration requires all secrets and storage; supports Render PORT without mainnet',()=>{
  const env={NODE_ENV:'production',RPC_URL:'https://rpc.example.invalid',CHAIN_ID:'11155111',CONTRACT_ADDRESS:contractAddress,CLIENT_ORIGIN:'https://montai.example.invalid',MODEL_MASTER_KEY:randomBytes(32).toString('hex'),PINATA_JWT:'fixture',SUPABASE_URL:base.url,SUPABASE_SERVICE_ROLE_KEY:'fixture',SUPABASE_RECORD_BUCKET:bucket,PORT:'10000'};
  assert.deepEqual(deploymentConfig(env),{production:true,port:10000,host:'0.0.0.0'});
  for (const name of ['RPC_URL','CHAIN_ID','CONTRACT_ADDRESS','CLIENT_ORIGIN','MODEL_MASTER_KEY','PINATA_JWT','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_RECORD_BUCKET']) assert.throws(()=>deploymentConfig({...env,[name]:''}),new RegExp(name));
  assert.throws(()=>deploymentConfig({...env,CHAIN_ID:'1'}),/localhost\/Sepolia/);
  assert.throws(()=>deploymentConfig({...env,CHAIN_ID:'31337'}),/Sepolia/);
  assert.throws(()=>deploymentConfig({...env,CLIENT_ORIGIN:'http://localhost:5173'}),/HTTPS/);
  assert.throws(()=>deploymentConfig({...env,PORT:'NaN'}),/PORT/);
  const local={NODE_ENV:'development',RPC_URL:'http://127.0.0.1:8545',CHAIN_ID:'31337',CONTRACT_ADDRESS:contractAddress,CLIENT_ORIGIN:'http://localhost:5173',MODEL_MASTER_KEY:env.MODEL_MASTER_KEY};
  assert.equal(deploymentConfig(local).host,'127.0.0.1');
});
