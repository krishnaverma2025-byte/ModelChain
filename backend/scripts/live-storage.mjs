// Explicit live smoke test: pins only a tiny encrypted fixture, never a user model.
import { mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { createStorage } from '../src/storage.js';
if(!process.env.PINATA_JWT) throw new Error('PINATA_JWT required in server environment');
const directory=await mkdtemp(path.join(tmpdir(),'montai-live-ipfs-'));
const storage=createStorage({directory,masterKey:randomBytes(32).toString('hex'),pinataJwt:process.env.PINATA_JWT,gateway:process.env.IPFS_GATEWAY,production:true});
try {
 const bytes=Buffer.from('MontAI encrypted storage readiness fixture');
 const result=await storage.save(bytes,{fileName:'fixture.bin'},'0x0000000000000000000000000000000000000000');
 console.log('Encrypted fixture pinned:',result.cid);
 const record=await storage.record(result.cid);
 await unlink(path.join(directory,result.cid+'.enc'));
 assert.deepEqual(await storage.decrypt(record),bytes);
 console.log('PASS: live ciphertext pin, gateway retrieval and authenticated decryption. Fixture remains pinned; no user model or credential was published.');
} catch(error) {console.error(/^IPFS pinning failed \(HTTP \d+\)$/.test(error.message)?error.message:'Live storage verification failed (service or gateway unavailable). No credential details printed.');process.exitCode=1;}
