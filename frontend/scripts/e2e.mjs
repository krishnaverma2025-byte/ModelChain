// Isolated local integration test. Never uses a funded wallet or public network.
import { chromium } from '@playwright/test';
import { ContractFactory, JsonRpcProvider } from 'ethers';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const processes=[];
const temporary=await mkdtemp(resolve(tmpdir(),'montai-e2e-'));
const rpc='http://127.0.0.1:18545', origin='http://127.0.0.1:15173', api='http://127.0.0.1:14000';
let browser;
function start(command,args,cwd,env={}) {
 const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
 child.on('error',error=>output+=error.message);
 processes.push(child);return ()=>output;
}
async function ready(url,log) {
 for(let i=0;i<100;i++) {try{if((await fetch(url)).ok)return;}catch{} await new Promise(r=>setTimeout(r,200));}
 throw new Error(`Service not ready: ${url}\n${log()}`);
}
try {
 const nodeLog=start(resolve(root,'node_modules/.bin/hardhat'),['node','--port','18545'],root);
 await ready(rpc,nodeLog);
 const provider=new JsonRpcProvider(rpc);
 const creator=await provider.getSigner(0), buyer=await provider.getSigner(1), buyer3=await provider.getSigner(2), buyer4=await provider.getSigner(3);
 const nonce=await provider.send('eth_getTransactionCount',[await creator.getAddress(),'latest']);
 execFileSync(resolve(root,'node_modules/.bin/hardhat'),['run','scripts/deploy.ts','--network','localhost'],{cwd:root,env:{...process.env,RPC_URL:rpc,MONTAI_DEPLOY_DRY_RUN:'1'},stdio:'pipe'});
 assert.equal(await provider.send('eth_getTransactionCount',[await creator.getAddress(),'latest']),nonce,'Deployment preflight sent a transaction');
 const artifact=JSON.parse(await readFile(resolve(root,'artifacts/contracts/ModelChain.sol/ModelChain.json'),'utf8'));
 const contract=await new ContractFactory(artifact.abi,artifact.bytecode,creator).deploy();await contract.waitForDeployment();
 const address=await contract.getAddress();
 const apiLog=start(process.execPath,['src/server.js'],resolve(root,'backend'),{RPC_URL:rpc,CHAIN_ID:'31337',CONTRACT_ADDRESS:address,CLIENT_ORIGIN:origin,MODEL_MASTER_KEY:randomBytes(32).toString('hex'),DATA_DIR:temporary,PORT:'14000',HOST:'127.0.0.1',NODE_ENV:'development',PINATA_JWT:''});
 await ready(api+'/health',apiLog);
 const viteLog=start(resolve(root,'frontend/node_modules/.bin/vite'),['--host','127.0.0.1','--port','15173','--strictPort'],resolve(root,'frontend'),{VITE_RPC_URL:rpc,VITE_CHAIN_ID:'31337',VITE_CONTRACT_ADDRESS:address,VITE_API_URL:api,VITE_SUPABASE_URL:'',VITE_SUPABASE_ANON_KEY:''});
 await ready(origin,viteLog);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let account=await creator.getAddress(), wrongNetwork=false, reject=false, rejectMethod='', switchDuringSign=false, connectEvent=false;
 const purchases=[];let authRequests=0;
 await page.exposeFunction('walletRpc',async ({method,params=[]})=>{
   if((reject && ['eth_requestAccounts','personal_sign','eth_sendTransaction'].includes(method)) || method===rejectMethod) return {walletError:true};
   if(method==='eth_accounts'||method==='eth_requestAccounts'){
     if(method==='eth_requestAccounts' && connectEvent){connectEvent=false;await page.evaluate(value=>window.emitWalletEvent('accountsChanged',[value]),account);}
     return [account];
   }
   if(method==='eth_chainId')return wrongNetwork?'0x1':'0x7a69';
   if(method==='personal_sign'){
     authRequests++;
     const signature=await provider.send('eth_sign',[params[1],params[0]]);
     if(switchDuringSign){account=await buyer4.getAddress();await page.evaluate(value=>window.emitWalletEvent('accountsChanged',[value]),account);}
     return signature;
   }
   if(method==='eth_sendTransaction' && params[0].data?.startsWith('0xc8a028a8'))purchases.push(params[0].from.toLowerCase());
   return provider.send(method,params);
 });
 await page.addInitScript(()=>{
   const listeners={};window.ethereum={request:async args=>{const result=await window.walletRpc(args);if(result?.walletError)throw Object.assign(new Error('User rejected request'),{code:4001});return result;},on:(name,fn)=>(listeners[name]??=[]).push(fn),removeListener:(name,fn)=>listeners[name]=(listeners[name]||[]).filter(f=>f!==fn)};
   window.emitWalletEvent=(name,value)=>(listeners[name]||[]).forEach(fn=>fn(value));
 });
 await page.goto(origin+'/upload');
 await page.getByPlaceholder('Enter model name').fill('Verified vision model');
 await page.getByPlaceholder('Describe your AI model').fill('Encrypted integration test model');
 const bytes=Buffer.from('MontAI original model bytes for integrity verification');
 await page.locator('input[type=file]').setInputFiles({name:'vision.onnx',mimeType:'application/octet-stream',buffer:bytes});
 await page.getByRole('button',{name:'Register Model',exact:true}).click();
 await page.waitForURL('**/model/1',{timeout:30000});
 await page.getByRole('button',{name:'You own this model',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'You own this model',exact:true}).isDisabled(),true);
 assert.equal(await contract.getModelCount(),1n);
 const inspectionNonce=await provider.send('eth_getTransactionCount',[await creator.getAddress(),'latest']);
 execFileSync(resolve(root,'node_modules/.bin/hardhat'),['run','scripts/interact.ts','--network','localhost'],{cwd:root,env:{...process.env,RPC_URL:rpc,CONTRACT_ADDRESS:address,MODEL_ID:'1'},stdio:'pipe'});
 assert.equal(await provider.send('eth_getTransactionCount',[await creator.getAddress(),'latest']),inspectionNonce,'Local inspection utility sent a transaction');
 account=await buyer.getAddress();
 await page.evaluate(value=>window.emitWalletEvent('accountsChanged',[value]),account);
 await page.getByRole('button',{name:'License Model',exact:true}).waitFor();
 await page.getByRole('button',{name:'Download licensed model'}).click();
 await page.getByRole('status').filter({hasText:/license is required/i}).waitFor();
 connectEvent=true;
 await page.getByRole('button',{name:'License Model',exact:true}).click();
 await page.getByRole('button',{name:/License Owned/}).waitFor({timeout:30000});
 assert.equal(await contract.hasLicense(1,account),true);
 await page.reload();await page.getByRole('button',{name:/License Owned/}).waitFor();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download licensed model'}).click();
 const download=await downloadPromise;assert.deepEqual(await readFile(await download.path()),bytes);
 // Two independent buyers, fourth-account denial, and A2 → A3 → A2 propagation.
 account=await buyer3.getAddress();await page.evaluate(value=>window.emitWalletEvent('accountsChanged',[value]),account);
 await page.getByRole('button',{name:'License Model',exact:true}).waitFor();
 assert.equal(await contract.hasLicense(1,account),false);
 await page.getByRole('button',{name:'Download licensed model'}).click();
 await page.getByRole('status').filter({hasText:/license is required/}).waitFor();
 rejectMethod='eth_sendTransaction';
 await page.getByRole('button',{name:'License Model',exact:true}).click();await page.getByText(/Request rejected in MetaMask/).waitFor();
 rejectMethod='';const authBeforePurchase=authRequests;
 await page.getByRole('button',{name:'License Model',exact:true}).click();await page.getByRole('button',{name:/License Owned/}).waitFor();
 assert.equal(authRequests,authBeforePurchase,'Purchase unexpectedly requested authentication signature');
 assert.equal(await contract.hasLicense(1,account),true);
 assert.deepEqual(purchases,[(await buyer.getAddress()).toLowerCase(),(await buyer3.getAddress()).toLowerCase()]);
 rejectMethod='personal_sign';await page.getByRole('button',{name:'Download licensed model'}).click();
 await page.getByRole('status').filter({hasText:/rejected/}).waitFor();rejectMethod='';
 const thirdDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download licensed model'}).click();
 assert.deepEqual(await readFile(await (await thirdDownload).path()),bytes);
 switchDuringSign=true;await page.getByRole('button',{name:'Download licensed model'}).click();
 await page.getByRole('button',{name:'License Model',exact:true}).waitFor();switchDuringSign=false;
 assert.equal(await contract.hasLicense(1,account),false);
 await page.getByRole('button',{name:'Download licensed model'}).click();await page.getByRole('status').filter({hasText:/license is required/}).waitFor();
 for(const signer of [buyer,buyer3]){
   account=await signer.getAddress();await page.evaluate(value=>window.emitWalletEvent('accountsChanged',[value]),account);
   await page.getByRole('button',{name:/License Owned/}).waitFor();
 }
 const recoveredDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download licensed model'}).click();
 assert.deepEqual(await readFile(await (await recoveredDownload).path()),bytes);
 await page.locator('.model-access input[type=file]').setInputFiles({name:'tampered.onnx',mimeType:'application/octet-stream',buffer:Buffer.from('tampered')});
 await page.getByRole('status').filter({hasText:/verification failed/}).waitFor();
 await page.screenshot({path:resolve(temporary,'details-desktop.png'),fullPage:true});
 await page.goto(origin+'/dashboard');await page.getByRole('link',{name:'Access & verify →'}).waitFor();
 await page.evaluate(()=>window.emitWalletEvent('chainChanged','0x1'));
 await page.getByRole('button',{name:'Connect wallet',exact:true}).last().waitFor();
 await page.goto(origin+'/marketplace');await page.getByText('Verified vision model',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:resolve(temporary,'marketplace-mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile page overflows');
 assert.ok(await page.evaluate(()=>document.querySelector('.marketplace-page').getBoundingClientRect().top>=document.querySelector('.navbar').getBoundingClientRect().bottom),'Mobile navbar overlaps the page');
 account=await creator.getAddress();await page.goto(origin+'/dashboard');
 await page.getByRole('button',{name:'Withdraw',exact:true}).click();
 await page.waitForFunction(()=>document.body.innerText.includes('0.0 ETH'));
 assert.equal(await contract.pendingWithdrawals(account),0n);
 await page.getByRole('button',{name:'Deactivate',exact:true}).click();
 await page.getByRole('button',{name:'Reactivate',exact:true}).waitFor();
 assert.equal((await contract.getModel(1)).active,false);
 wrongNetwork=true;await page.goto(origin+'/upload');
 await page.getByPlaceholder('Enter model name').fill('Wrong network');
 await page.locator('input[type=file]').setInputFiles({name:'model.bin',mimeType:'application/octet-stream',buffer:bytes});
 await page.getByRole('button',{name:'Register Model',exact:true}).click();
 await page.getByText(/Select network 31337/).waitFor();
 wrongNetwork=false;reject=true;
 await page.getByRole('button',{name:'Register Model',exact:true}).click();
 await page.getByText(/rejected/i).waitFor();
 assert.equal(await contract.getModelCount(),1n);
 reject=false;
 await page.evaluate(()=>{delete window.ethereum;});
 await page.getByRole('button',{name:'Register Model',exact:true}).click();
 await page.getByText('Install MetaMask to continue.',{exact:true}).waitFor();
 await page.goto(origin+'/model/0');await page.getByRole('heading',{name:'Model Not Found'}).waitFor();
 await page.goto(origin+'/login');await page.getByRole('heading',{name:'Account services are not configured'}).waitFor();
 assert.deepEqual(errors,[]);
 assert.doesNotMatch(nodeLog(),/unrecognized-selector|StackUnderflow/,'MontAI integration generated suspicious contract calls');
 console.log('PASS: creator restrictions; Account 2 and 3 purchases and verified downloads; Account 4 denial; account/signature switching; rejected transaction/signature; refresh; dashboard; withdrawal; deactivation; tamper detection; wrong network; no wallet; invalid ID.');
 console.log(`Screenshots and isolated encrypted test data: ${temporary}`);
 await provider.destroy();
} finally {
 await browser?.close();
 for(const child of processes.reverse())child.kill('SIGTERM');
}
