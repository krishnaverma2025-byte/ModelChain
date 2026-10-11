export function networkInfo(chainId) {
  if (BigInt(chainId) === 31337n) return {name:'Hardhat Local',explorer:null,testnet:false};
  if (BigInt(chainId) === 11155111n) return {name:'Sepolia Testnet',explorer:'https://sepolia.etherscan.io',faucet:'https://ethereum.org/developers/docs/networks/#sepolia',testnet:true};
  return {name:'Unsupported network',explorer:null,testnet:false};
}
export function explorerLink(chainId, type, value) {
  const base=networkInfo(chainId).explorer;
  if (!base || !['tx','address'].includes(type) || !(type === 'tx' ? /^0x[a-fA-F0-9]{64}$/ : /^0x[a-fA-F0-9]{40}$/).test(value || '')) return null;
  return `${base}/${type}/${value}`;
}
export async function switchConfiguredNetwork(ethereum, chainId, rpc) {
  if (!ethereum) throw new Error('Install MetaMask to continue.');
  if (![31337n,11155111n].includes(BigInt(chainId))) throw new Error('Only Hardhat Local or Sepolia Testnet is supported.');
  const hex=`0x${BigInt(chainId).toString(16)}`;
  try { await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]}); }
  catch (error) {
    if (Number(error.code ?? error.data?.originalError?.code) !== 4902 || BigInt(chainId) !== 11155111n) throw error;
    let url;
    try { url=new URL(rpc); } catch { throw new Error('Configure the Sepolia HTTPS RPC before adding this network.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Sepolia RPC must use HTTPS.');
    await ethereum.request({method:'wallet_addEthereumChain',params:[{chainId:hex,chainName:'Sepolia Testnet',nativeCurrency:{name:'Sepolia Ether',symbol:'ETH',decimals:18},rpcUrls:[url.href],blockExplorerUrls:[networkInfo(chainId).explorer]}]});
    await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]});
  }
}
