import { walletSession, restoreWalletSession } from "./walletSession.mjs";
import {
  connectWallet,
  authenticate,
  assertCurrentWallet,
  config,
  api,
  errorText,
} from "./blockchain";
import { supabase } from "./supabaseClient";
import { switchConfiguredNetwork } from './networks.mjs';
let loginCancellation = 0;
let loginPending = false;
export function initializeIdentity() {
  let disposed = false,
    revision = 0;
  const ethereum = window.ethereum;
  const refresh = async () => {
    const request = ++revision;
    try {
      const [accounts, chain] = await Promise.all([
        ethereum?.request({ method: "eth_accounts" }),
        ethereum?.request({ method: "eth_chainId" }),
      ]);
      if (!disposed && request === revision)
        walletSession.connection(
          accounts?.[0] || "",
          chain ? String(BigInt(chain)) : "",
        );
    } catch {
      if (!disposed && request === revision) walletSession.connection("", "");
    }
  };
  const transition = (accounts, chain) => {
    const before = walletSession.snapshot();
    walletSession.connection(accounts, chain);
    if (before.revision !== walletSession.snapshot().revision) {
      if(before.connected && before.chain) {
        loginCancellation++;
        walletSession.status(before.connected.toLowerCase()!==walletSession.snapshot().connected.toLowerCase() ? 'Wallet changed during this request. Sign in again.' : 'Network changed. Sign in again.');
      }
      if (before.headers) api('/api/auth/session',{method:'DELETE',headers:before.headers}).catch(()=>{});
    }
  };
  const accountsChanged = accounts => { revision++; transition(accounts?.[0] || '',walletSession.snapshot().chain); };
  const chainChanged = chain => {
    revision++;
    try { transition(walletSession.snapshot().connected,String(BigInt(chain))); }
    catch { disconnectWallet(); walletSession.connection('',''); }
  };
  const disconnected = () => { revision++; disconnectWallet(); walletSession.connection('',''); };
  ethereum?.on("accountsChanged", accountsChanged);
  ethereum?.on("chainChanged", chainChanged);
  ethereum?.on("disconnect", disconnected);
  let profileRevision = 0;
  const applyProfile = (user) => {
    profileRevision++;
    walletSession.profile(user);
  };
  const initialProfile = profileRevision;
  const profileReady = supabase?.auth.getSession().then(({ data }) => {
    if (!disposed && initialProfile === profileRevision)
      applyProfile(data.session?.user || null);
  });
  Promise.resolve(profileReady).then(async () => {
    if (disposed) return;
    await restoreWalletSession({store:walletSession,ethereum,chainId:config.chainId,active:()=>!disposed,verify:async headers=>{
      const server=await (await api('/api/auth/session',{headers})).json();
      if (String(server.chainId)!==String(config.chainId) || server.contractAddress?.toLowerCase()!==config.address.toLowerCase()) throw new Error('Session deployment mismatch');
      return server;
    }});
    if (!disposed) await refresh();
  }).catch(()=>{if(!disposed) {walletSession.invalidate('Could not verify wallet session. Sign in again.');walletSession.restoring(false);}});
  const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
    if (!disposed) applyProfile(session?.user || null);
  }).data.subscription;
  const timer = setInterval(() => {
    const state = walletSession.snapshot();
    if (state.expiresAt && state.expiresAt <= Date.now())
      walletSession.invalidate("Your wallet session expired. Sign in again.");
  }, 1000);
  return () => {
    disposed = true;
    clearInterval(timer);
    subscription?.unsubscribe();
    ethereum?.removeListener("accountsChanged", accountsChanged);
    ethereum?.removeListener("chainChanged", chainChanged);
    ethereum?.removeListener("disconnect", disconnected);
  };
}
export async function signInWallet() {
  if (loginPending) throw new Error("A wallet sign-in is already in progress.");
  loginPending = true;
  const attempt = loginCancellation;
  let session;
  walletSession.status("Connecting wallet…");
  try {
    const { signer, address } = await connectWallet();
    if (attempt !== loginCancellation)
      throw new Error("Wallet sign-in cancelled.");
    walletSession.connection(address, String(config.chainId));
    if (walletSession.mismatch())
      throw new Error(
        "Wallet mismatch. Switch to the wallet linked to your profile.",
      );
    const revision = walletSession.snapshot().revision;
    walletSession.status("Waiting for signature…");
    session = await authenticate(signer);
    if (attempt !== loginCancellation)
      throw new Error("Wallet sign-in cancelled.");
    await assertCurrentWallet(address, false);
    walletSession.authenticated(session, revision);
  } catch (error) {
    if (session)
      api("/api/auth/session", {
        method: "DELETE",
        headers: session.headers,
      }).catch(() => {});
    if (attempt === loginCancellation)
      walletSession.invalidate(errorText(error));
    throw error;
  } finally {
    loginPending = false;
  }
}
export function disconnectWallet(cancelLogin = true) {
  if (cancelLogin) loginCancellation++;
  const { headers } = walletSession.snapshot();
  walletSession.invalidate();
  if (headers)
    api("/api/auth/session", { method: "DELETE", headers }).catch(() => {});
}
export async function logout() {
  disconnectWallet();
  walletSession.profile(null);
  if (supabase) {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  }
}
export async function switchWallet() {
  disconnectWallet();
  if (!window.ethereum) throw new Error("Install MetaMask to continue.");
  await window.ethereum.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });
}
export async function switchNetwork() {
  disconnectWallet();
  await switchConfiguredNetwork(window.ethereum, config.chainId, config.rpc);
}
export async function linkProfileWallet() {
  const state = walletSession.require(config.chainId);
  if (!supabase || !state.profile)
    throw new Error("Sign in to an optional profile first.");
  await assertCurrentWallet(state.authenticated);
  const { data, error } = await supabase.auth.updateUser({
    data: { linked_wallet_address: state.authenticated },
  });
  if (error) throw error;
  if (
    state.revision !== walletSession.snapshot().revision ||
    state.profile.id !== walletSession.snapshot().profile?.id
  )
    throw new Error(
      "Profile or wallet changed. Reload your profile before linking.",
    );
  walletSession.profile(data.user);
}
