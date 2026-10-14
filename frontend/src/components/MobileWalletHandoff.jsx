import { walletHandoff } from '../mobile-wallet.mjs';
export default function MobileWalletHandoff({compact=false}) {
  const href=walletHandoff({userAgent:navigator.userAgent,maxTouchPoints:navigator.maxTouchPoints,hasProvider:Boolean(window.ethereum),href:window.location.href});
  if(!href) return null;
  const link=<a className={compact ? 'caption' : 'secondary-button'} href={href} rel="noopener noreferrer">Open MontAI in MetaMask</a>;
  return compact ? link : <p className="caption">{link}<br />Continue in MetaMask’s in-app browser. Wallet availability and sign-in are still required.</p>;
}
