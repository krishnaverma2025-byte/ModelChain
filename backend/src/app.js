import { randomBytes } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { isAddress, verifyMessage } from 'ethers';

export function createApp({chain,storage,origin,chainId,contractAddress}) {
  const app = express();
  const challenges = new Map(), sessions = new Map();
  app.use(helmet());
  app.use(cors({origin,exposedHeaders:['Content-Disposition']}));
  app.use(express.json({limit:'16kb'}));
  app.use('/api',rateLimit({windowMs:60000,limit:60}));
  const clean = () => { for(const map of [challenges,sessions]) for(const [k,v] of map) if(v.expires<Date.now()) map.delete(k); };
  const auth = (req,res,next) => {
    clean(); const session = sessions.get(req.headers.authorization?.replace(/^Bearer /,''));
    if(!session) return res.status(401).json({error:'Connect and authenticate your wallet'});
    req.wallet=session.address; next();
  };
  const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1,fields:5}});
  const validId = id => { if(!/^[1-9]\d{0,18}$/.test(id)) throw Object.assign(new Error('Invalid model ID'),{status:400}); return id; };
  async function model(id) { try { return await chain.getModel(validId(id)); } catch(e) { if(e.code==='CALL_EXCEPTION') e.status=404; throw e; } }
  function checkRecord(record,m) {
    if(record.cid!==m.cid || record.modelHash!==m.modelHash.replace(/^0x/,'').toLowerCase() || record.owner!==m.owner.toLowerCase()) throw Object.assign(new Error('Stored package does not match the blockchain record'),{status:409});
  }
  app.get('/health',async(req,res)=>{ await chain.getModelCount(); res.json({status:'ok',chainId,contractAddress}); });
  app.post('/api/auth/challenge',(req,res)=>{
    clean();
    if(!isAddress(req.body.address)) return res.status(400).json({error:'Invalid wallet'});
    const nonce=randomBytes(24).toString('hex');
    const message=`MontAI wallet authentication\nOrigin: ${origin}\nChain: ${chainId}\nContract: ${contractAddress}\nWallet: ${req.body.address.toLowerCase()}\nNonce: ${nonce}\nExpires: ${new Date(Date.now()+300000).toISOString()}`;
    challenges.set(nonce,{address:req.body.address.toLowerCase(),message,expires:Date.now()+300000});
    res.json({nonce,message});
  });
  app.post('/api/auth/session',(req,res)=>{
    clean(); const challenge=challenges.get(req.body.nonce); challenges.delete(req.body.nonce);
    try {
      if(!challenge || verifyMessage(challenge.message,req.body.signature).toLowerCase()!==challenge.address) throw new Error();
      const token=randomBytes(32).toString('hex'); sessions.set(token,{address:challenge.address,expires:Date.now()+3600000});
      res.json({token,address:challenge.address});
    } catch { res.status(401).json({error:'Invalid or expired signature'}); }
  });
  app.post('/api/uploads',auth,upload.single('model'),async(req,res)=>{
    const {name,description='',category='AI Model'}=req.body;
    if(!req.file || !/\.(zip|onnx|pt|pkl|bin|safetensors)$/i.test(req.file.originalname) || !req.file.size || typeof name!=='string' || !name.trim() || name.length>160 || typeof description!=='string' || description.length>2000 || typeof category!=='string' || category.length>80) return res.status(400).json({error:'Provide a supported model file, name, description and category (max 25 MB)'});
    const fileName=req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_').slice(-120);
    res.status(201).json(await storage.save(req.file.buffer,{name:name.trim(),description,category,fileName},req.wallet));
  });
  app.get('/api/models/:id/metadata',async(req,res)=>{
    const m=await model(req.params.id); const record=await storage.record(m.cid); checkRecord(record,m);
    res.json({description:record.description,category:record.category,fileName:record.fileName});
  });
  app.get('/api/models/:id/download',auth,async(req,res)=>{
    const id=validId(req.params.id), m=await model(id);
    if(m.owner.toLowerCase()!==req.wallet && !await chain.hasLicense(id,req.wallet)) return res.status(403).json({error:'An on-chain license is required'});
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
