import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { validateCid, validateRecord } from './record-store.js';

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
export function createStorage({directory, masterKey, pinataJwt, gateway = 'https://gateway.pinata.cloud/ipfs', production = false, recordStore, fetchImpl = fetch}) {
  if (!/^[a-f0-9]{64}$/i.test(masterKey || '')) throw new Error('MODEL_MASTER_KEY must be 32 random bytes encoded as 64 hex characters');
  if (production && !pinataJwt) throw new Error('Production requires PINATA_JWT');
  if (production && !recordStore) throw new Error('Production requires a persistent protected record store');
  const key = Buffer.from(masterKey,'hex');
  const safeCid = validateCid;
  const recordPath = cid => path.join(directory, safeCid(cid)+'.json');
  const unpin = async id => {
    let response;
    try { response=await fetchImpl(`https://api.pinata.cloud/v3/files/public/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${pinataJwt}`},signal:AbortSignal.timeout(30000),redirect:'error'}); }
    catch { throw new Error('Encrypted upload cleanup unavailable'); }
    if(!response.ok && response.status!==404) throw new Error('Encrypted upload cleanup failed; manual review required');
  };
  const removeCache = async cid => {
    try { await unlink(path.join(directory,safeCid(cid)+'.enc')); } catch(error) { if(error.code!=='ENOENT') throw error; }
  };
  return {
    async save(bytes, metadata, owner) {
      if(recordStore) { try { await mkdir(directory,{recursive:true,mode:0o700}); } catch {} }
      else await mkdir(directory,{recursive:true,mode:0o700});
      const fileKey = randomBytes(32);
      const ciphertext = seal(bytes,fileKey);
      let cid = 'local-'+digest(ciphertext);
      let pinataFileId;
      if (pinataJwt) {
        const form = new FormData();
        // Public IPFS carries authenticated ciphertext only, never model bytes or keys.
        form.append('network','public');
        form.append('file',new Blob([ciphertext]),'model.enc');
        const response = await fetchImpl('https://uploads.pinata.cloud/v3/files',{method:'POST',headers:{Authorization:`Bearer ${pinataJwt}`},body:form,signal:AbortSignal.timeout(60000)});
        if (!response.ok) throw new Error(`IPFS pinning failed (HTTP ${response.status})`);
        const data = (await response.json()).data;
        cid = safeCid(data?.cid);
        pinataFileId = data?.id;
        if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(pinataFileId || '')) throw new Error('Storage returned no valid cleanup identifier');
      }
      const record = {...metadata, cid, modelHash:digest(bytes), encryptedHash:digest(ciphertext), owner:owner.toLowerCase(), wrappedKey:seal(fileKey,key).toString('base64'), ...(pinataFileId ? {pinataFileId} : {})};
      validateRecord(record,cid);
      if (recordStore) {
        // A CID is returned only after its wrapped key is durably protected remotely.
        try { await recordStore.save(record); }
        catch(error) {
          // No CID has been returned to a registrant yet. One best-effort
          // compensation, not a background retry loop; preserve remote records.
          if(pinataFileId) try { await unpin(pinataFileId); } catch { console.warn('[UPLOAD CLEANUP] persistence failed; manual Pinata review required'); }
          throw error;
        }
        // Ephemeral cache is optional, never authoritative in this mode.
        try { await writeFile(path.join(directory,cid+'.enc'),ciphertext,{mode:0o600,flag:'wx'}); } catch {}
      } else {
        await writeFile(path.join(directory,cid+'.enc'),ciphertext,{mode:0o600,flag:'wx'});
        await writeFile(recordPath(cid),JSON.stringify(record),{mode:0o600,flag:'wx'});
      }
      return {cid,modelHash:record.modelHash,storage:pinataJwt?'ipfs':'local'};
    },
    async record(cid) { return recordStore ? recordStore.record(safeCid(cid)) : validateRecord(JSON.parse(await readFile(recordPath(cid),'utf8')),cid); },
    async remove(record) {
      validateRecord(record,record.cid);
      if(!record.cid.startsWith('local-')) {
        // Older protected records still download normally, but must never be
        // guessed/unpinned by CID without their server-side file identifier.
        if(!record.pinataFileId || !pinataJwt) throw Object.assign(new Error('Legacy upload cleanup requires manual review'),{status:409});
        await unpin(record.pinataFileId);
      }
      if(recordStore) await recordStore.remove(record.cid);
      await removeCache(record.cid);
      if(!recordStore) await unlink(recordPath(record.cid));
    },
    async decrypt(record) {
      validateRecord(record,record.cid);
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
