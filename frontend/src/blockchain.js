import { EVENT_ABI } from "./activity";
import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  isAddress,
  verifyMessage,
} from "ethers";
import { walletSession } from "./walletSession.mjs";
const production = import.meta.env.PROD;
export const config = {
  rpc:
    import.meta.env.VITE_RPC_URL || (production ? "" : "http://127.0.0.1:8545"),
  chainId: BigInt(import.meta.env.VITE_CHAIN_ID || (production ? 0 : 31337)),
  address: import.meta.env.VITE_CONTRACT_ADDRESS || "",
  api:
    import.meta.env.VITE_API_URL || (production ? "" : "http://127.0.0.1:4000"),
};
export const ABI = [
  "function getModelCount() view returns(uint256)",
  "function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))",
  "function registerModel(string,string,string,uint256,uint256) returns(uint256)",
  "function hasLicense(uint256,address) view returns(bool)",
  "function purchaseLicense(uint256) payable",
  "function pendingWithdrawals(address) view returns(uint256)",
  "function withdrawRevenue()",
  "function setModelActive(uint256,bool)",
  ...EVENT_ABI,
];
export async function readContract() {
  if (!config.rpc || config.chainId <= 0n)
    throw new Error(
      "Configure VITE_RPC_URL and VITE_CHAIN_ID for this deployment.",
    );
  if (
    production &&
    config.chainId !== 31337n &&
    new URL(config.rpc).protocol !== "https:"
  )
    throw new Error("Public-network RPC must use HTTPS.");
  if (!isAddress(config.address))
    throw new Error(
      "Set VITE_CONTRACT_ADDRESS to your deployed ModelChain address.",
    );
  const provider = new JsonRpcProvider(config.rpc, undefined, {
    cacheTimeout: -1,
  });
  if ((await provider.getNetwork()).chainId !== config.chainId)
    throw new Error("Configured RPC is on the wrong network.");
  if ((await provider.getCode(config.address)) === "0x")
    throw new Error(
      "No ModelChain contract at the configured address. Deploy and configure it first.",
    );
  return new Contract(config.address, ABI, provider);
}
export async function connectWallet() {
  if (!window.ethereum) throw new Error("Install MetaMask to continue.");
  const provider = new BrowserProvider(window.ethereum, undefined, {
    cacheTimeout: -1,
  });
  await provider.send("eth_requestAccounts", []);
  if ((await provider.getNetwork()).chainId !== config.chainId)
    throw new Error(
      `Select network ${config.chainId} in MetaMask, then retry.`,
    );
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  await readContract();
  await assertCurrentWallet(address, false);
  return {
    signer,
    address,
    contract: new Contract(config.address, ABI, signer),
  };
}
export async function wallet() {
  const state = walletSession.require(config.chainId),
    revision = state.revision;
  await assertCurrentWallet(state.authenticated);
  const server = await (
    await api("/api/auth/session", { headers: state.headers })
  ).json();
  if (server.address?.toLowerCase() !== state.authenticated.toLowerCase())
    throw new Error("Wallet session does not match the selected wallet.");
  walletSession.require(config.chainId);
  if (revision !== walletSession.snapshot().revision)
    throw new Error("Wallet changed during this request. Sign in again.");
  const provider = new BrowserProvider(window.ethereum, undefined, {
    cacheTimeout: -1,
  });
  const signer = await provider.getSigner(state.authenticated);
  await assertCurrentWallet(state.authenticated);
  const contract = new Contract(config.address, ABI, signer);
  const guarded = new Proxy(contract, {
    get(target, key) {
      const value = Reflect.get(target, key);
      if (
        [
          "registerModel",
          "purchaseLicense",
          "withdrawRevenue",
          "setModelActive",
        ].includes(key)
      )
        return async (...args) => {
          if (revision !== walletSession.snapshot().revision)
            throw new Error("Wallet session changed. Sign in again.");
          await assertCurrentWallet(state.authenticated);
          const current = await (
            await api("/api/auth/session", { headers: state.headers })
          ).json();
          if (
            current.address?.toLowerCase() !== state.authenticated.toLowerCase()
          )
            throw new Error("Your wallet session expired. Sign in again.");
          if (revision !== walletSession.snapshot().revision)
            throw new Error("Wallet session changed. Sign in again.");
          return value(...args);
        };
      return value;
    },
  });
  return {
    signer,
    address: state.authenticated,
    headers: state.headers,
    contract: guarded,
  };
}
export async function assertCurrentWallet(address, requireSession = true) {
  if (
    requireSession &&
    walletSession.require(config.chainId).authenticated.toLowerCase() !==
      address.toLowerCase()
  )
    throw new Error(
      "The connected wallet does not match your authenticated wallet.",
    );
  if (!window.ethereum)
    throw new Error("MetaMask disconnected. Connect your wallet and retry.");
  const [accounts, chain] = await Promise.all([
    window.ethereum.request({ method: "eth_accounts" }),
    window.ethereum.request({ method: "eth_chainId" }),
  ]);
  if (BigInt(chain) !== config.chainId)
    throw new Error(
      `Select network ${config.chainId} in MetaMask, then retry.`,
    );
  if (!accounts[0] || accounts[0].toLowerCase() !== address.toLowerCase())
    throw new Error(
      "Wallet changed during this request. Retry with the selected account.",
    );
}
export async function purchaseModelLicense(id, onProgress = () => {}) {
  const { signer, address, contract } = await wallet();
  const model = await contract.getModel(id);
  if (model.owner.toLowerCase() === address.toLowerCase())
    throw new Error("The model owner cannot purchase their own model.");
  if (!model.active)
    throw new Error("Model inactive. New licenses are unavailable.");
  if (await contract.hasLicense(id, address))
    throw new Error("You already own a license for this model.");
  await assertCurrentWallet(address);
  onProgress("Confirm the license transaction in MetaMask.");
  const tx = await contract.purchaseLicense(id, { value: model.price });
  onProgress(`Transaction ${tx.hash} submitted. Waiting for confirmation…`);
  const receipt = await tx.wait();
  if (
    !receipt ||
    receipt.status !== 1 ||
    receipt.from.toLowerCase() !== address.toLowerCase() ||
    receipt.to?.toLowerCase() !== config.address.toLowerCase()
  )
    throw new Error(
      "Transaction receipt does not match the selected buyer and contract.",
    );
  await assertCurrentWallet(address);
  // Both wallet RPC and configured read RPC must agree before displaying ownership.
  const confirmed = await contract.hasLicense(id, address, {
    blockTag: receipt.blockNumber,
  });
  const reader = await readContract();
  if (!confirmed || !(await reader.hasLicense(id, address)))
    throw new Error(
      `Transaction ${tx.hash} mined, but this buyer's license is not verified. Check wallet/RPC configuration before retrying.`,
    );
  await assertCurrentWallet(await signer.getAddress());
  return { address, transactionHash: tx.hash };
}
export async function api(path, options = {}) {
  if (!config.api) throw new Error("Configure VITE_API_URL for model access.");
  if (
    production &&
    config.chainId !== 31337n &&
    new URL(config.api).protocol !== "https:"
  )
    throw new Error("Public model access API must use HTTPS.");
  const response = await fetch(config.api + path, options);
  if (!response.ok) {
    if (response.status === 429)
      throw new Error("Too many requests. Wait a moment before retrying.");
    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: "Access API unavailable" };
    }
    if (
      response.status === 401 &&
      options.headers?.Authorization ===
        walletSession.snapshot().headers?.Authorization
    )
      walletSession.invalidate("Your wallet session expired. Sign in again.");
    throw new Error(
      response.status === 401
        ? "Your wallet session expired. Sign in again."
        : data.error,
    );
  }
  return response;
}
export async function authenticate(signer) {
  const address = await signer.getAddress();
  await assertCurrentWallet(address, false);
  const health = await (await api("/health")).json();
  if (
    String(health.chainId) !== config.chainId.toString() ||
    health.contractAddress?.toLowerCase() !== config.address.toLowerCase()
  )
    throw new Error(
      "Backend and wallet app target different chain/contract configurations.",
    );
  const headers = { "Content-Type": "application/json" };
  const challenge = await (
    await api("/api/auth/challenge", {
      method: "POST",
      headers,
      body: JSON.stringify({ address }),
    })
  ).json();
  const fields = challenge.message.split("\n");
  if (
    !fields.includes(`Wallet: ${address.toLowerCase()}`) ||
    !fields.includes(`Chain: ${config.chainId}`) ||
    !fields.includes(`Contract: ${health.contractAddress}`) ||
    !fields.includes(`Nonce: ${challenge.nonce}`)
  )
    throw new Error(
      "Authentication challenge does not match the selected wallet and deployment.",
    );
  await assertCurrentWallet(address, false);
  const signature = await signer.signMessage(challenge.message);
  await assertCurrentWallet(address, false);
  if (
    verifyMessage(challenge.message, signature).toLowerCase() !==
    address.toLowerCase()
  )
    throw new Error("Signature does not match the selected wallet.");
  const session = await (
    await api("/api/auth/session", {
      method: "POST",
      headers,
      body: JSON.stringify({ address, nonce: challenge.nonce, signature }),
    })
  ).json();
  if (session.address?.toLowerCase() !== address.toLowerCase())
    throw new Error("Authenticated session belongs to a different wallet.");
  if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now())
    throw new Error("Invalid wallet session expiry.");
  return {
    headers: { Authorization: `Bearer ${session.token}` },
    address: session.address,
    expiresAt: session.expiresAt,
  };
}
export async function metadata(id) {
  try {
    return await (await api(`/api/models/${id}/metadata`)).json();
  } catch {
    return {
      category: "AI Model",
      description:
        "Registered on ModelChain. Supporting metadata is unavailable.",
    };
  }
}
export async function hashFile(file) {
  const bytes = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const short = (value) =>
  value?.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
export const errorText = (error) =>
  error.code === "ACTION_REJECTED" || error.code === 4001
    ? "Request rejected in MetaMask. Nothing was confirmed."
    : error instanceof TypeError
      ? "MontAI authentication service is unavailable."
      : error.reason || error.shortMessage || error.message;
