// Storage is only a reload hint. Only verified provider + backend state restores rights.
export function createWalletSession(now = Date.now, {storage, storageKey = 'montai.wallet-session.v1'} = {}) {
  const clearStored = () => { try { storage?.removeItem(storageKey); } catch { /* Memory-only fallback. */ } };
  let state = {
    connected: "",
    chain: "",
    authenticated: "",
    headers: null,
    expiresAt: 0,
    linked: "",
    profile: null,
    status: "",
    revision: 0,
    restoring: true,
  };
  const listeners = new Set();
  const emit = (changes) => {
    state = { ...state, ...changes };
    listeners.forEach((fn) => fn());
  };
  const invalidate = (status = "") => {
    clearStored();
    emit({
      authenticated: "",
      headers: null,
      expiresAt: 0,
      status,
      revision: state.revision + 1,
    });
  };
  const mismatch = () =>
    Boolean(
      state.linked &&
        state.connected &&
        state.linked.toLowerCase() !== state.connected.toLowerCase(),
    );
  return {
    snapshot: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    invalidate,
    restoring: value => emit({restoring:value}),
    persisted() {
      try {
        const value = JSON.parse(storage?.getItem(storageKey) || 'null');
        if (!value) return null;
        if (typeof value.token !== 'string' || !/^Bearer [a-zA-Z0-9_-]{1,512}$/.test(value.token) ||
            !/^0x[a-fA-F0-9]{40}$/.test(value.address || '') || !/^\d+$/.test(value.chain || '') ||
            !Number.isFinite(value.expiresAt) || value.expiresAt <= now()) throw new Error();
        return {token:value.token,address:value.address,chain:value.chain,expiresAt:value.expiresAt};
      } catch { clearStored(); return null; }
    },
    connection(connected, chain) {
      connected = typeof connected === 'string' && /^0x[a-fA-F0-9]{40}$/.test(connected) ? connected : '';
      try { chain = chain === '' ? '' : String(BigInt(chain)); } catch { chain = ''; }
      if (connected.toLowerCase() === state.connected.toLowerCase() && chain === state.chain) return;
      if (
        connected.toLowerCase() !== state.connected.toLowerCase() ||
        chain !== state.chain
      )
        invalidate();
      emit({ connected, chain });
    },
    profile(profile) {
      emit({
        profile,
        linked: profile?.user_metadata?.linked_wallet_address || "",
      });
      if (mismatch())
        invalidate(
          "Wallet mismatch. Switch to the wallet linked to your profile.",
        );
    },
    status: (status) => emit({ status }),
    authenticated(session, revision) {
      if (
        revision !== state.revision ||
        session.address.toLowerCase() !== state.connected.toLowerCase() ||
        mismatch()
      )
        throw new Error("Wallet changed during authentication. Sign in again.");
      emit({
        authenticated: session.address,
        headers: session.headers,
        expiresAt: session.expiresAt,
        status: "",
      });
      try { storage?.setItem(storageKey, JSON.stringify({token:session.headers.Authorization,address:session.address,chain:state.chain,expiresAt:session.expiresAt})); } catch { /* Memory-only fallback. */ }
    },
    require(chainId) {
      if (state.expiresAt && state.expiresAt <= now())
        invalidate("Your wallet session expired. Sign in again.");
      if (!state.authenticated || !state.headers)
        throw new Error("Sign in with your wallet before continuing.");
      if (state.chain !== String(chainId))
        throw new Error("Switch to the required network.");
      if (
        state.connected.toLowerCase() !== state.authenticated.toLowerCase() ||
        mismatch()
      )
        throw new Error(
          "The connected wallet does not match your authenticated wallet or linked profile.",
        );
      return state;
    },
    mismatch,
  };
}
let storage;
try { storage = globalThis.sessionStorage; } catch { /* Browser may block storage. */ }
export const walletSession = createWalletSession(Date.now, {storage});

export async function restoreWalletSession({store, ethereum, chainId, verify, active = () => true}) {
  const saved = store.persisted();
  const initialRevision = store.snapshot().revision;
  let ownedRevision = initialRevision;
  if (!saved) { if(active()) store.restoring(false); return false; }
  store.restoring(true);
  try {
    if (!ethereum) throw new Error();
    const [accounts, chain] = await Promise.all([ethereum.request({method:'eth_accounts'}), ethereum.request({method:'eth_chainId'})]);
    if (!active() || store.snapshot().revision !== initialRevision) return false;
    const currentChain = String(BigInt(chain));
    store.connection(accounts?.[0] || '', currentChain);
    const revision = store.snapshot().revision;
    ownedRevision = revision;
    if (currentChain !== String(chainId) || saved.chain !== currentChain || accounts?.[0]?.toLowerCase() !== saved.address.toLowerCase() || store.mismatch()) throw new Error();
    const server = await verify({Authorization:saved.token});
    if (!active() || revision !== store.snapshot().revision) return false;
    const [latestAccounts, latestChain] = await Promise.all([ethereum.request({method:'eth_accounts'}), ethereum.request({method:'eth_chainId'})]);
    if (!active() || revision !== store.snapshot().revision) return false;
    if (latestAccounts?.[0]?.toLowerCase() !== saved.address.toLowerCase() || String(BigInt(latestChain)) !== saved.chain || server.address?.toLowerCase() !== saved.address.toLowerCase() || saved.expiresAt <= Date.now()) throw new Error();
    const expiresAt = Math.min(saved.expiresAt, server.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error();
    store.authenticated({address:saved.address,headers:{Authorization:saved.token},expiresAt},revision);
    return true;
  } catch {
    if (active() && store.snapshot().revision === ownedRevision) store.invalidate();
    return false;
  } finally { if(active()) store.restoring(false); }
}
