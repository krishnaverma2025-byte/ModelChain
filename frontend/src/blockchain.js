import { BrowserProvider, Contract, JsonRpcProvider, isAddress } from 'ethers';
export const config={rpc:import.meta.env.VITE_RPC_URL||'http://127.0.0.1:8545',chainId:BigInt(import.meta.env.VITE_CHAIN_ID||31337),address:import.meta.env.VITE_CONTRACT_ADDRESS||'',api:import.meta.env.VITE_API_URL||'http://127.0.0.1:4000'};
export const ABI=[
 'function getModelCount() view returns(uint256)',
 'function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))',
 'function registerModel(string,string,string,uint256,uint256) returns(uint256)',
 'function hasLicense(uint256,address) view returns(bool)',
 'function purchaseLicense(uint256) payable',
 'function pendingWithdrawals(address) view returns(uint256)',
 'function withdrawRevenue()',
 'function setModelActive(uint256,bool)',
 'event ModelRegistered(uint256 indexed modelId,address indexed owner,string name,string cid,uint256 price)'
];
export async function readContract(){
 if(!isAddress(config.address)) throw new Error('Set VITE_CONTRACT_ADDRESS to your deployed ModelChain address.');
 const provider=new JsonRpcProvider(config.rpc);
 if((await provider.getNetwork()).chainId!==config.chainId) throw new Error('Configured RPC is on the wrong network.');
 if(await provider.getCode(config.address)==='0x') throw new Error('No ModelChain contract at the configured address. Deploy and configure it first.');
 return new Contract(config.address,ABI,provider);
}
export async function wallet(){
 if(!window.ethereum) throw new Error('Install MetaMask to continue.');
 const provider=new BrowserProvider(window.ethereum);
 await provider.send('eth_requestAccounts',[]);
 if((await provider.getNetwork()).chainId!==config.chainId) throw new Error(`Select network ${config.chainId} in MetaMask, then retry.`);
 const signer=await provider.getSigner();
 const address=await signer.getAddress();
 await readContract();
 return {signer,address,contract:new Contract(config.address,ABI,signer)};
}
export async function api(path,options={}){
 const response=await fetch(config.api+path,options);
 if(!response.ok){let data;try{data=await response.json();}catch{data={error:'Access API unavailable'};}throw new Error(data.error);}
 return response;
}
export async function authenticate(signer){
 const address=await signer.getAddress();
 const headers={'Content-Type':'application/json'};
 const challenge=await(await api('/api/auth/challenge',{method:'POST',headers,body:JSON.stringify({address})})).json();
 const signature=await signer.signMessage(challenge.message);
 const session=await(await api('/api/auth/session',{method:'POST',headers,body:JSON.stringify({nonce:challenge.nonce,signature})})).json();
 return {Authorization:`Bearer ${session.token}`};
}
export async function metadata(id){try{return await(await api(`/api/models/${id}/metadata`)).json();}catch{return {category:'AI Model',description:'Registered on ModelChain. Supporting metadata is unavailable.'};}}
export async function hashFile(file){const bytes=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export const short=value=>value?.length>22?`${value.slice(0,10)}…${value.slice(-8)}`:value;
export const errorText=error=>error.code==='ACTION_REJECTED'?'Request rejected in MetaMask. Nothing was confirmed.':error.reason||error.shortMessage||error.message;
