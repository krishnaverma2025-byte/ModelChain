// Application authentication is memory-only; connection alone never grants rights.
export function createWalletSession(now = Date.now) {
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
  };
  const listeners = new Set();
  const emit = (changes) => {
    state = { ...state, ...changes };
    listeners.forEach((fn) => fn());
  };
  const invalidate = (status = "") =>
    emit({
      authenticated: "",
      headers: null,
      expiresAt: 0,
      status,
      revision: state.revision + 1,
    });
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
    connection(connected, chain) {
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
export const walletSession = createWalletSession();
