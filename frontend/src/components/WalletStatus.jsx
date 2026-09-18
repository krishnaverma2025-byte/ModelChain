import { useEffect, useState } from 'react';
import { config, wallet, short, errorText } from '../blockchain';

export default function WalletStatus() {
  const [account, setAccount] = useState('');
  const [chain, setChain] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    let disposed = false;
    const accounts = values => { if (!disposed) setAccount(values[0] || ''); };
    const network = value => { if (!disposed) setChain(value); };
    ethereum.request({ method: 'eth_accounts' }).then(accounts).catch(() => {});
    ethereum.request({ method: 'eth_chainId' }).then(network).catch(() => {});
    ethereum.on('accountsChanged', accounts);
    ethereum.on('chainChanged', network);
    return () => { disposed = true; ethereum.removeListener('accountsChanged', accounts); ethereum.removeListener('chainChanged', network); };
  }, []);
  async function connect() {
    try { const result = await wallet(); setAccount(result.address); setError(''); }
    catch (err) { setError(errorText(err)); }
  }
  const wrong = chain && BigInt(chain) !== config.chainId;
  return <div className="wallet-status"><button onClick={connect} title={account || 'Connect MetaMask'}>{account ? short(account) : 'Connect wallet'}</button><small>{wrong ? 'Wrong network' : `Chain ${config.chainId}`}</small>{error && <small role="alert">{error}</small>}</div>;
}
