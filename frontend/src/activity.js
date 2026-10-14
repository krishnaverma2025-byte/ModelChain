import { formatEther, Interface } from "ethers";
import { chainReads } from "./read-pool.mjs";

export const EVENT_ABI = [
  "event ModelRegistered(uint256 indexed modelId,address indexed owner,string name,string cid,uint256 price)",
  "event LicensePurchased(uint256 indexed modelId,address indexed buyer,uint256 price)",
  "event RoyaltyPaid(uint256 indexed modelId,address indexed owner,uint256 amount)",
  "event ModelStatusChanged(uint256 indexed modelId,bool active)",
  "event RevenueWithdrawn(address indexed recipient,uint256 amount)",
];
export const EVENT_NAMES = [
  "ModelRegistered",
  "LicensePurchased",
  "RoyaltyPaid",
  "ModelStatusChanged",
  "RevenueWithdrawn",
];
export const eventInterface = new Interface(EVENT_ABI);
const providers = new WeakMap();
let providerSequence = 0;
export function eventProvider(contract) {
  return contract.runner.provider || contract.runner;
}
export function normalizeEventLog(log, address) {
  const result = {
    address: String(log.address || "").toLowerCase(),
    blockNumber: Number(log.blockNumber),
    blockHash: log.blockHash,
    transactionHash: log.transactionHash,
    index: Number(log.index ?? log.logIndex),
    topics: log.topics,
    data: log.data,
  };
  if (
    result.address !== address.toLowerCase() ||
    log.removed ||
    !Number.isSafeInteger(result.blockNumber) ||
    result.blockNumber < 0 ||
    !Number.isSafeInteger(result.index) ||
    result.index < 0 ||
    ![result.blockHash, result.transactionHash].every((value) =>
      /^0x[0-9a-fA-F]{64}$/.test(value || ""),
    ) ||
    !Array.isArray(result.topics) ||
    !result.topics.length ||
    result.topics.length > 4 ||
    !result.topics.every((value) => /^0x[0-9a-fA-F]{64}$/.test(value)) ||
    !/^0x([0-9a-fA-F]{2})*$/.test(result.data || "")
  )
    throw new Error("Invalid contract event response.");
  const parsed = eventInterface.parseLog(result);
  if (!parsed || !EVENT_NAMES.includes(parsed.name))
    throw new Error("Unsupported contract event response.");
  return result;
}
export function decodeEvent(log) {
  const parsed = eventInterface.parseLog(log);
  return describeEvent({
    ...log,
    fragment: parsed.fragment,
    args: parsed.args,
  });
}
// A single address-filtered request, with OR topic0, for ALL supported events.
// Shared in-flight work preserves PR #12's request deduplication protections.
export function readEventRange(contract, { fromBlock, toBlock, signal }) {
  signal?.throwIfAborted();
  if (
    ![fromBlock, toBlock].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    fromBlock > toBlock
  )
    throw new Error("Invalid activity block range.");
  const provider = eventProvider(contract),
    address = String(contract.target);
  if (!providers.has(provider)) providers.set(provider, ++providerSequence);
  const work = chainReads(
    `event-range:${providers.get(provider)}:${address.toLowerCase()}:${fromBlock}:${toBlock}`,
    async () => {
      const logs = await provider.getLogs({
        address,
        fromBlock,
        toBlock,
        topics: [
          EVENT_NAMES.map((name) => eventInterface.getEvent(name).topicHash),
        ],
      });
      return logs.map((log) => normalizeEventLog(log, address));
    },
  );
  if (!signal) return work;
  // ethers log reads cannot abort their transport per request. Keep the original
  // call in the dedup pool until it settles, while cancelling stale consumers.
  return new Promise((resolve, reject) => {
    const cancel = () =>
      reject(new DOMException("History paused", "AbortError"));
    signal.addEventListener("abort", cancel, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", cancel);
        if (!signal.aborted) resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", cancel);
        if (!signal.aborted) reject(error);
      },
    );
    if (signal.aborted) cancel();
  });
}
export function describeEvent(log) {
  const a = log.args,
    name = log.fragment.name;
  const titles = {
    ModelRegistered: "Model Registered",
    LicensePurchased: "License Purchased",
    RoyaltyPaid: "Creator Revenue Accrued",
    ModelStatusChanged: a.active ? "Model Activated" : "Model Deactivated",
    RevenueWithdrawn: "Revenue Withdrawn",
  };
  return {
    key: `${log.transactionHash}:${log.index}`,
    name,
    title: titles[name],
    modelId: a.modelId?.toString(),
    wallet: a.owner || a.buyer || a.recipient,
    value:
      a.amount !== undefined
        ? formatEther(a.amount)
        : name === "LicensePurchased"
          ? formatEther(a.price)
          : null,
    block: log.blockNumber,
    blockHash: log.blockHash,
    index: log.index,
    transaction: log.transactionHash,
  };
}
// Bounded pages avoid unbounded RPC requests. Errors are shown, never disguised as empty history.
export function readEventPage(contract, options = {}) {
  return queryEventPage(contract, options);
}
async function queryEventPage(
  contract,
  { toBlock, modelId, span = 2000, fromBlock = 0, signal } = {},
) {
  if (
    !Number.isSafeInteger(span) ||
    span < 1 ||
    !Number.isSafeInteger(fromBlock) ||
    fromBlock < 0
  )
    throw new Error("Invalid activity block range.");
  const end = toBlock ?? (await eventProvider(contract).getBlockNumber());
  if (end < fromBlock)
    return { events: [], from: fromBlock, to: end, older: null };
  const start = Math.max(fromBlock, end - span + 1);
  const logs = await readEventRange(contract, {
    fromBlock: start,
    toBlock: end,
    signal,
  });
  return {
    events: logs
      .map(decodeEvent)
      .filter((event) => !modelId || event.modelId === String(modelId))
      .sort((a, b) => b.block - a.block || b.index - a.index),
    from: start,
    to: end,
    older: start > fromBlock ? start - 1 : null,
  };
}
export function explorerTransaction(chainId, hash, base) {
  if (BigInt(chainId) === 31337n || !base) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:") return null;
    return `${url.href.replace(/\/$/, "")}/tx/${hash}`;
  } catch {
    return null;
  }
}
