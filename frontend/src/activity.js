import { formatEther } from "ethers";

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
    index: log.index,
    transaction: log.transactionHash,
  };
}
// Bounded pages avoid unbounded RPC requests. Errors are shown, never disguised as empty history.
export async function readEventPage(
  contract,
  { toBlock, modelId, span = 2000 } = {},
) {
  const end = toBlock ?? (await contract.runner.getBlockNumber());
  const start = Math.max(0, end - span + 1);
  const names = modelId
    ? EVENT_NAMES.filter((n) => n !== "RevenueWithdrawn")
    : EVENT_NAMES;
  const groups = await Promise.all(
    names.map((name) =>
      contract.queryFilter(
        modelId
          ? contract.filters[name](BigInt(modelId))
          : contract.filters[name](),
        start,
        end,
      ),
    ),
  );
  return {
    events: groups
      .flat()
      .map(describeEvent)
      .sort((a, b) => b.block - a.block || b.index - a.index),
    from: start,
    to: end,
    older: start > 0 ? start - 1 : null,
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
