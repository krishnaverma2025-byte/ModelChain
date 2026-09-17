import { useState } from 'react';
import { wallet,authenticate,api,hashFile,readContract,errorText,short } from '../blockchain';
export function CopyValue({value}){
 const [copied,setCopied]=useState(false);
 return <button className="copy-value" title={value} onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}}>{short(value)} <small>{copied?'Copied':'Copy'}</small></button>;
}
export default function ModelAccess({id}){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 async function verify(file){
   const contract=await readContract();const model=await contract.getModel(id);
   const hash=await hashFile(file);
   return hash===model.modelHash.replace(/^0x/,'').toLowerCase();
 }
 async function download(){setBusy(true);try{
   const {signer}=await wallet();setStatus('Sign in to request licensed access…');
   const headers=await authenticate(signer);
   const response=await api(`/api/models/${id}/download`,{headers});const blob=await response.blob();
   if(!await verify(blob)) throw new Error('Model integrity verification failed. Download blocked.');
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||`model-${id}.bin`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setStatus('Model integrity verified. Download ready.');
 }catch(e){setStatus(errorText(e));}finally{setBusy(false);}}
 return <section className="model-access"><h3>Access & verify</h3><p>Wallet authentication and an on-chain license are checked before decryption.</p><button disabled={busy} onClick={download}>{busy?'Checking access…':'Download licensed model'}</button><label>Verify a local model file<input type="file" onChange={async e=>{if(!e.target.files[0])return;try{setStatus(await verify(e.target.files[0])?'✓ Model integrity verified':'✕ Model integrity verification failed');}catch(err){setStatus(errorText(err));}}}/></label><p role="status">{status}</p></section>;
}
