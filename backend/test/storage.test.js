import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createStorage } from '../src/storage.js';

test('IPFS receives ciphertext only; wrapped keys survive restart; tampering fails',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'montai-ipfs-test-'));
 const masterKey=randomBytes(32).toString('hex'), bytes=Buffer.from('licensed original bytes');
 let pinned;
 const cid='bafybeiencryptedtestidentifier';
 const fetchImpl=async(url,options)=>{
   if(options.method==='POST'){
     assert.equal(url,'https://uploads.pinata.cloud/v3/files');
     assert.equal(options.body.get('network'),'public');
     assert.equal(options.body.get('file').name,'model.enc');
     pinned=Buffer.from(await options.body.get('file').arrayBuffer());
     assert.equal(pinned.includes(bytes),false);
     return Response.json({data:{cid}});
   }
   return new Response(pinned);
 };
 const storage=createStorage({directory,masterKey,pinataJwt:'test-only',production:true,fetchImpl});
 const result=await storage.save(bytes,{fileName:'model.bin'},'0xowner');
 assert.equal(result.storage,'ipfs');assert.equal(result.wrappedKey,undefined);
 const record=await storage.record(cid);
 await unlink(path.join(directory,cid+'.enc'));
 const restarted=createStorage({directory,masterKey,fetchImpl});
 assert.deepEqual(await restarted.decrypt(record),bytes);
 pinned[15]^=1;await assert.rejects(()=>restarted.decrypt(record),/integrity/);
 const oversized=createStorage({directory,masterKey,fetchImpl:async()=>new Response('oversized',{headers:{'Content-Length':String(26*1024*1024)}})});
 await assert.rejects(()=>oversized.decrypt(record),/size limit/);
 await writeFile(path.join(directory,cid+'.enc'),await readFile(path.join(directory,cid+'.json')));
 await assert.rejects(()=>restarted.decrypt(record),/integrity/);
 assert.throws(()=>createStorage({directory,masterKey,production:true}),/PINATA_JWT/);
 assert.throws(()=>createStorage({directory,masterKey:'invalid'}),/MODEL_MASTER_KEY/);
});
