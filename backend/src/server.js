import { Contract, JsonRpcProvider, isAddress } from 'ethers';
import { createApp } from './app.js';
import { createStorage } from './storage.js';
const {RPC_URL,CONTRACT_ADDRESS,CHAIN_ID,MODEL_MASTER_KEY,PINATA_JWT,CLIENT_ORIGIN}=process.env;
if(!RPC_URL || !isAddress(CONTRACT_ADDRESS) || !CHAIN_ID || !CLIENT_ORIGIN) throw new Error('Set RPC_URL, CONTRACT_ADDRESS, CHAIN_ID, CLIENT_ORIGIN');
const provider=new JsonRpcProvider(RPC_URL);
if((await provider.getNetwork()).chainId!==BigInt(CHAIN_ID)) throw new Error('RPC chain ID mismatch');
if(await provider.getCode(CONTRACT_ADDRESS)==='0x') throw new Error('No contract at configured address');
const chain=new Contract(CONTRACT_ADDRESS,[
 'function getModelCount() view returns(uint256)',
 'function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))',
 'function hasLicense(uint256,address) view returns(bool)'
],provider);
const directory=`${process.env.DATA_DIR||'./data'}/${CHAIN_ID}-${CONTRACT_ADDRESS.toLowerCase()}`;
if(process.env.NODE_ENV==='production' && new URL(CLIENT_ORIGIN).protocol!=='https:') throw new Error('Production CLIENT_ORIGIN must use HTTPS');
if(process.env.IPFS_GATEWAY && new URL(process.env.IPFS_GATEWAY).protocol!=='https:') throw new Error('IPFS_GATEWAY must use HTTPS');
const storage=createStorage({directory,masterKey:MODEL_MASTER_KEY,pinataJwt:PINATA_JWT,gateway:process.env.IPFS_GATEWAY,production:process.env.NODE_ENV==='production'});
createApp({chain,storage,origin:CLIENT_ORIGIN,chainId:CHAIN_ID,contractAddress:CONTRACT_ADDRESS}).listen(Number(process.env.PORT||4000),process.env.HOST||'127.0.0.1',()=>console.log('MontAI access API ready'));
