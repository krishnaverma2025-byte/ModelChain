import { Contract, JsonRpcProvider, isAddress } from 'ethers';
import { createApp } from './app.js';
import { createStorage } from './storage.js';
import { createRecordStore } from './record-store.js';
import { deploymentConfig } from './config.js';
let startupStage = 'configuration';
function checkpoint(stage, result) {
  // Only fixed stage names and outcomes may reach startup logs.
  console.log(`[STARTUP] ${result}: ${stage}`);
}
function begin(stage) { startupStage = stage; checkpoint(stage, 'CHECK'); }
function complete() { checkpoint(startupStage, 'OK'); }
async function start() {
begin('configuration');
const {production,host,port}=deploymentConfig(process.env);
const {RPC_URL,CONTRACT_ADDRESS,CHAIN_ID,MODEL_MASTER_KEY,PINATA_JWT,CLIENT_ORIGIN}=process.env;
if(!RPC_URL || !isAddress(CONTRACT_ADDRESS) || !CHAIN_ID || !CLIENT_ORIGIN) throw new Error('Set RPC_URL, CONTRACT_ADDRESS, CHAIN_ID, CLIENT_ORIGIN');
complete();
begin('rpc-network');
const provider=new JsonRpcProvider(RPC_URL,undefined,{cacheTimeout:-1});
try {
if((await provider.getNetwork()).chainId!==BigInt(CHAIN_ID)) throw new Error('RPC chain ID mismatch');
complete();
begin('contract-bytecode');
if(await provider.getCode(CONTRACT_ADDRESS)==='0x') throw new Error('No contract at configured address');
const chain=new Contract(CONTRACT_ADDRESS,[
 'function getModelCount() view returns(uint256)',
 'function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))',
 'function hasLicense(uint256,address) view returns(bool)'
],provider);
const directory=`${process.env.DATA_DIR||'./data'}/${CHAIN_ID}-${CONTRACT_ADDRESS.toLowerCase()}`;
complete();
begin('production-urls');
if(process.env.NODE_ENV==='production' && new URL(CLIENT_ORIGIN).protocol!=='https:') throw new Error('Production CLIENT_ORIGIN must use HTTPS');
if(process.env.IPFS_GATEWAY && new URL(process.env.IPFS_GATEWAY).protocol!=='https:') throw new Error('IPFS_GATEWAY must use HTTPS');
complete();
begin('supabase-private-bucket');
const recordStore=process.env.SUPABASE_RECORD_BUCKET ? createRecordStore({url:process.env.SUPABASE_URL,serviceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY,bucket:process.env.SUPABASE_RECORD_BUCKET,chainId:CHAIN_ID,contractAddress:CONTRACT_ADDRESS}) : undefined;
if(recordStore) await recordStore.verifyPrivate();
if(recordStore) complete();
else checkpoint(startupStage, 'SKIPPED');
begin('storage-initialization');
const storage=createStorage({directory,masterKey:MODEL_MASTER_KEY,pinataJwt:PINATA_JWT,gateway:process.env.IPFS_GATEWAY,production,recordStore});
complete();
begin('server-listen');
await new Promise((resolve, reject) => {
  const server=createApp({chain,storage,origin:CLIENT_ORIGIN,chainId:CHAIN_ID,contractAddress:CONTRACT_ADDRESS}).listen(port,host,()=> {
    complete();
    console.log('MontAI access API ready');
    resolve();
  });
  server.once('error', reject);
});
} catch(error) { provider.destroy(); throw error; }
}
start().catch(() => {
  console.error(`[STARTUP] FAILED: ${startupStage}`);
  console.error('MontAI startup failed. Check required environment, RPC/contract and PRIVATE protected record bucket. Remote error details are suppressed to protect credentials.');
  process.exitCode=1;
});
