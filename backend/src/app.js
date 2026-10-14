import { randomBytes } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import { requestLimiter } from './request-limits.js';
import { validateCid } from './record-store.js';
import { isAddress, verifyMessage } from 'ethers';

export function createApp({chain,storage,origin,chainId,contractAddress,now=Date.now}) {
  const app = express();
  const challenges = new Map(), sessions = new Map();
  app.use(helmet());
  app.use(cors({origin,exposedHeaders:['Content-Disposition']}));
  app.use(express.json({limit:'16kb'}));
  const clean = () => { for(const map of [challenges,sessions]) for(const [k,v] of map) if(v.expires<=now()) map.delete(k); };
  const auth = (req,res,next) => {
    clean(); const session = sessions.get(req.headers.authorization?.replace(/^Bearer /,''));
    if(!session) return res.status(401).json({error:'Connect and authenticate your wallet'});
    req.wallet=session.address; req.session=session; next();
  };
  const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1,fields:5}});
  const validId = id => { if(!/^[1-9]\d{0,18}$/.test(id)) throw Object.assign(new Error('Invalid model ID'),{status:400}); return id; };
  async function model(id) { try { return await chain.getModel(validId(id)); } catch(e) { if(e.code==='CALL_EXCEPTION') e.status=404; throw e; } }
  function checkRecord(record,m) {
    if(record.cid!==m.cid || record.modelHash!==m.modelHash.replace(/^0x/,'').toLowerCase() || record.owner!==m.owner.toLowerCase()) throw Object.assign(new Error('Stored package does not match the blockchain record'),{status:409});
  }
  app.get('/health',async(req,res)=>{ await chain.getModelCount(); res.json({status:'ok',chainId,contractAddress}); });
  app.post('/api/auth/challenge',requestLimiter('challenge'),(req,res)=>{
    clean();
    if(!isAddress(req.body?.address)) return res.status(400).json({error:'Invalid wallet'});
    const nonce=randomBytes(24).toString('hex');
    const message=`MontAI wallet authentication\nOrigin: ${origin}\nChain: ${chainId}\nContract: ${contractAddress}\nWallet: ${req.body.address.toLowerCase()}\nNonce: ${nonce}\nExpires: ${new Date(now()+300000).toISOString()}`;
    challenges.set(nonce,{address:req.body.address.toLowerCase(),message,expires:now()+300000});
    res.json({nonce,message});
  });
  app.post('/api/auth/session',requestLimiter('sessionCreate'),(req,res)=>{
    clean(); const challenge=challenges.get(req.body?.nonce); challenges.delete(req.body?.nonce);
    try {
      if(!challenge || (req.body?.address!==undefined && (!isAddress(req.body.address) || req.body.address.toLowerCase()!==challenge.address)) || verifyMessage(challenge.message,req.body?.signature).toLowerCase()!==challenge.address) throw new Error();
      const token=randomBytes(32).toString('hex'), expiresAt=now()+3600000; sessions.set(token,{address:challenge.address,expires:expiresAt});
      res.set('Cache-Control','no-store'); res.json({token,address:challenge.address,expiresAt});
    } catch { res.status(401).json({error:'Invalid or expired signature'}); }
  });
  app.get('/api/auth/session',requestLimiter('sessionRead'),auth,(req,res)=>{
    res.set('Cache-Control','no-store'); res.json({address:req.wallet,expiresAt:req.session.expires,chainId,contractAddress});
  });
  app.delete('/api/auth/session',requestLimiter('sessionDelete'),auth,(req,res)=>{
    sessions.delete(req.headers.authorization.replace(/^Bearer /,'')); res.status(204).end();
  });
  app.post('/api/uploads',requestLimiter('upload'),auth,upload.single('model'),async(req,res)=>{
    const {name,description='',category='AI Model'}=req.body;
    if(!req.file || !/\.(zip|onnx|pt|pkl|bin|safetensors)$/i.test(req.file.originalname) || !req.file.size || typeof name!=='string' || !name.trim() || name.length>160 || typeof description!=='string' || description.length>2000 || typeof category!=='string' || category.length>80) return res.status(400).json({error:'Provide a supported model file, name, description and category (max 25 MB)'});
    const fileName=req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(-120);
    res.status(201).json(await storage.save(req.file.buffer,{name:name.trim(),description,category,fileName},req.wallet));
  });
  const cleaning = new Set();
  app.delete('/api/uploads/:cid',requestLimiter('cleanup'),auth,async(req,res)=>{
    let cid;
    try { cid=validateCid(req.params.cid); } catch { return res.status(400).json({error:'Invalid CID'}); }
    if(cleaning.has(cid)) return res.status(409).json({error:'Cleanup is already in progress'});
    cleaning.add(cid);
    try {
      const record=await storage.record(cid);
      if(record.owner.toLowerCase()!==req.wallet) return res.status(403).json({error:'Only the upload owner may request cleanup'});
      // Enumerate authoritative state, including inactive models. Fail closed on
      // RPC errors or registries too large for a bounded synchronous scan.
      const count=BigInt(await chain.getModelCount());
      if(count>500n) return res.status(409).json({error:'Cleanup requires manual review for this registry size'});
      for(let id=1n;id<=count;id++) {
        const registered=await chain.getModel(id);
        if(registered.cid===cid) return res.status(409).json({error:'Registered model packages cannot be deleted'});
      }
      if(BigInt(await chain.getModelCount())!==count) return res.status(409).json({error:'Registry changed during cleanup verification. No deletion performed.'});
      await storage.remove(record);
      res.status(204).end();
    } catch(error) {
      // Never log a provider response, wrapped record, credential or request headers.
      console.warn('[UPLOAD CLEANUP] failed; manual review may be required');
      throw error;
    } finally { cleaning.delete(cid); }
  });
  app.get('/api/models/:id/metadata',requestLimiter('metadata'),async(req,res)=>{
    const m=await model(req.params.id); const record=await storage.record(m.cid); checkRecord(record,m);
    res.json({description:record.description,category:record.category,fileName:record.fileName});
  });
  app.get('/api/models/:id/download',requestLimiter('download'),auth,async(req,res)=>{
    const id=validId(req.params.id), m=await model(id);
    if(m.owner.toLowerCase()!==req.wallet && !await chain.hasLicense(id,req.wallet)) return res.status(403).json({error:'An on-chain license is required',wallet:req.wallet,chainId,contractAddress,modelId:id});
    const record=await storage.record(m.cid); checkRecord(record,m);
    const bytes=await storage.decrypt(record);
    res.set('Cache-Control','no-store'); res.attachment(record.fileName); res.send(bytes);
  });
  app.use((err,req,res,next)=>{
    const status=err.code==='LIMIT_FILE_SIZE'?413:err.code==='ENOENT'?404:err.status||500;
    res.status(status).json({error:status===500?'Request failed; check backend configuration':status===404?'Model package not available':err.message});
  });
  return app;
}
