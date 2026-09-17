import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { readContract, wallet, metadata, short, errorText } from "../blockchain";
import "./Dashboard.css";

export default function Dashboard() {
 const [address,setAddress]=useState(""),[models,setModels]=useState([]),[licenses,setLicenses]=useState([]),[revenue,setRevenue]=useState("0"),[status,setStatus]=useState("Connect your wallet to view your models and licenses."),[busy,setBusy]=useState(false);
 async function load(account){
   setBusy(true);
   try{
     const c=await readContract();const count=await c.getModelCount();const mine=[],owned=[];
     for(let id=1n;id<=count;id++){
       const m=await c.getModel(id);const entry={id:m.id.toString(),name:m.name,owner:m.owner,price:formatEther(m.price),royalty:m.royalty.toString(),active:m.active,cid:m.cid,...await metadata(id)};
       if(m.owner.toLowerCase()===account.toLowerCase())mine.push(entry);
       if(await c.hasLicense(id,account))owned.push(entry);
     }
     setModels(mine);setLicenses(owned);setRevenue(formatEther(await c.pendingWithdrawals(account)));setStatus("");
   }catch(e){setStatus(errorText(e));}finally{setBusy(false);}
 }
 useEffect(()=>{
   let disposed=false;
   const changed=accounts=>{const a=accounts[0]||"";if(disposed)return;setAddress(a);setModels([]);setLicenses([]);setRevenue("0");if(a)load(a);};
   window.ethereum?.request({method:"eth_accounts"}).then(changed).catch(()=>{});
   const networkChanged=()=>changed([]);
   window.ethereum?.on("accountsChanged",changed);window.ethereum?.on("chainChanged",networkChanged);
   return()=>{disposed=true;window.ethereum?.removeListener("accountsChanged",changed);window.ethereum?.removeListener("chainChanged",networkChanged);};
 },[]);
 async function connect(){try{const w=await wallet();setAddress(w.address);await load(w.address);}catch(e){setStatus(errorText(e));}}
 async function action(kind,m){
   setBusy(true);try{
     const w=await wallet();setStatus("Confirm in MetaMask…");
     const tx=kind==="withdraw"?await w.contract.withdrawRevenue():await w.contract.setModelActive(m.id,!m.active);
     setStatus("Transaction submitted. Waiting for confirmation…");await tx.wait();await load(w.address);
   }catch(e){setStatus(errorText(e));}finally{setBusy(false);}
 }
 function rows(items,creator){return items.length?<div className="dashboard-models">{items.map(m=><article className="dashboard-model" key={m.id}><div><span className="model-category">#{m.id} · {m.active?"Active":"Inactive"}</span><h3><Link to={`/model/${m.id}`}>{m.name}</Link></h3><p>{m.price} ETH · Creator share {m.royalty}%</p><p title={m.cid}>{short(m.cid)}</p></div><div>{creator&&<button disabled={busy} onClick={()=>action("status",m)}>{m.active?"Deactivate":"Reactivate"}</button>}<Link to={`/model/${m.id}`}>{creator?"View details":"Access & verify"} →</Link></div></article>)}</div>:<p className="empty-state">{busy?"Reading blockchain…":creator?"You have not registered any models yet.":"Your purchased licenses will appear here."}</p>;}
 return <div className="dashboard-page"><main className="dashboard-content"><div className="section-label">YOUR WORKSPACE</div><h1>Models, licenses & earnings.</h1><p>Ownership and licenses are read directly from ModelChain.</p><button onClick={connect} disabled={busy}>{address?short(address):"Connect wallet"}</button><p role="status">{status}</p><section className="dashboard-grid"><article className="dashboard-card"><h2>{models.length}</h2><p>My models</p></article><article className="dashboard-card"><h2>{licenses.length}</h2><p>My licenses</p></article><article className="dashboard-card"><h2>{revenue} ETH</h2><p>Withdrawable revenue</p><button disabled={busy||revenue==="0.0"||revenue==="0"} onClick={()=>action("withdraw")}>Withdraw</button></article></section><h2>My Models</h2>{rows(models,true)}<h2>My Licenses</h2>{rows(licenses,false)}</main></div>;
}
