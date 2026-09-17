import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function seal(bytes, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]);
}
function open(bytes, key) {
  const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0,12));
  cipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([cipher.update(bytes.subarray(12,-16)), cipher.final()]);
}
export function createStorage({directory, masterKey, pinataJwt, gateway = 'https://gateway.pinata.cloud/ipfs', production = false, fetchImpl = fetch}) {
  if (!/^[a-f0-9]{64}$/i.test(masterKey || '')) throw new Error('MODEL_MASTER_KEY must be 32 random bytes encoded as 64 hex characters');
  if (production && !pinataJwt) throw new Error('Production requires PINATA_JWT');
  const key = Buffer.from(masterKey,'hex');
  const safeCid = cid => { if (!/^[a-zA-Z0-9-]{10,160}$/.test(cid)) throw new Error('Invalid CID'); return cid; };
  const recordPath = cid => path.join(directory, safeCid(cid)+'.json');
  return {
    async save(bytes, metadata, owner) {
      await mkdir(directory,{recursive:true,mode:0o700});
      const fileKey = randomBytes(32);
      const ciphertext = seal(bytes,fileKey);
      let cid = 'local-'+digest(ciphertext);
      if (pinataJwt) {
        const form = new FormData();
        form.append('file',new Blob([ciphertext]),'model.enc');
        const response = await fetchImpl('https://api.pinata.cloud/pinning/pinFileToIPFS',{method:'POST',headers:{Authorization:`Bearer ${pinataJwt}`},body:form,signal:AbortSignal.timeout(60000)});
        if (!response.ok) throw new Error(`IPFS pinning failed (HTTP ${response.status})`);
        cid = safeCid((await response.json()).IpfsHash);
      }
      const record = {cid, modelHash:digest(bytes), encryptedHash:digest(ciphertext), owner:owner.toLowerCase(), ...metadata, wrappedKey:seal(fileKey,key).toString('base64')};
      // Local ciphertext cache and encrypted key records must be backed up together.
      await writeFile(path.join(directory,cid+'.enc'),ciphertext,{mode:0o600,flag:'wx'});
      await writeFile(recordPath(cid),JSON.stringify(record),{mode:0o600,flag:'wx'});
      return {cid,modelHash:record.modelHash,storage:pinataJwt?'ipfs':'local'};
    },
    async record(cid) { return JSON.parse(await readFile(recordPath(cid),'utf8')); },
    async decrypt(record) {
      let ciphertext;
      try { ciphertext = await readFile(path.join(directory,safeCid(record.cid)+'.enc')); }
      catch (error) {
        if(error.code !== 'ENOENT' || record.cid.startsWith('local-')) throw error;
        const response = await fetchImpl(`${gateway.replace(/\/$/,'')}/${safeCid(record.cid)}`,{signal:AbortSignal.timeout(60000)});
        if(!response.ok) throw new Error('Encrypted content unavailable');
        const limit=25*1024*1024+28;
        if(Number(response.headers.get('content-length'))>limit) throw new Error('Encrypted content exceeds size limit');
        const chunks=[];let size=0;
        for await(const chunk of response.body){size+=chunk.length;if(size>limit)throw new Error('Encrypted content exceeds size limit');chunks.push(Buffer.from(chunk));}
        ciphertext = Buffer.concat(chunks);
      }
      if(digest(ciphertext)!==record.encryptedHash) throw new Error('Ciphertext integrity failed');
      const plaintext = open(ciphertext,open(Buffer.from(record.wrappedKey,'base64'),key));
      if(digest(plaintext)!==record.modelHash) throw new Error('Model integrity failed');
      return plaintext;
    }
  };
}
