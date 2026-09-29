import test from "node:test";
import assert from "node:assert/strict";
import { Interface } from "ethers";
import {
  EVENT_ABI,
  EVENT_NAMES,
  describeEvent,
  readEventPage,
  explorerTransaction,
} from "../src/activity.js";
const iface = new Interface(EVENT_ABI),
  wallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
function event(name, args) {
  const encoded = iface.encodeEventLog(iface.getEvent(name), args);
  const parsed = iface.parseLog(encoded);
  return {
    fragment: parsed.fragment,
    args: parsed.args,
    transactionHash: "0x" + "a".repeat(64),
    index: 2,
    blockNumber: 17,
  };
}
test("decodes exact deployed event signatures and accounting semantics", () => {
  assert.equal(
    describeEvent(event("LicensePurchased", [1, wallet, 50000000000000000n]))
      .value,
    "0.05",
  );
  assert.equal(
    describeEvent(event("RoyaltyPaid", [1, wallet, 1])).title,
    "Creator Revenue Accrued",
  );
  assert.equal(
    describeEvent(event("RevenueWithdrawn", [wallet, 1])).modelId,
    undefined,
  );
  assert.equal(
    describeEvent(event("ModelStatusChanged", [1, false])).title,
    "Model Deactivated",
  );
  const registered = describeEvent(
    event("ModelRegistered", [1, wallet, "Model", "cid", 1]),
  );
  assert.equal(registered.modelId, "1");
  assert.equal(registered.wallet, wallet);
  assert.equal(registered.value, null);
});
test("bounds historical queries, filters model events and excludes account withdrawals", async () => {
  const calls = [];
  const c = {
    runner: { getBlockNumber: async () => 5000 },
    filters: Object.fromEntries(
      EVENT_NAMES.map((n) => [n, (id) => ({ n, id })]),
    ),
    queryFilter: async (f, start, end) => {
      calls.push({ f, start, end });
      return [];
    },
  };
  const page = await readEventPage(c, { modelId: "1" });
  assert.equal(page.from, 3001);
  assert.equal(page.older, 3000);
  assert.equal(calls.length, 4);
  assert.ok(
    calls.every(
      (x) =>
        x.start === 3001 &&
        x.end === 5000 &&
        x.f.id === 1n &&
        x.f.n !== "RevenueWithdrawn",
    ),
  );
  const first = await readEventPage(c, { toBlock: 10 });
  assert.equal(first.from, 0);
  assert.equal(first.older, null);
  c.queryFilter = async () => {
    throw new Error("RPC unavailable");
  };
  await assert.rejects(readEventPage(c), /RPC unavailable/);
});
test("localhost never produces fake explorer links", () => {
  assert.equal(
    explorerTransaction(31337, "0xabc", "https://example.com"),
    null,
  );
  assert.equal(
    explorerTransaction(11155111, "0xabc", "http://example.com"),
    null,
  );
  assert.equal(
    explorerTransaction(11155111, "0xabc", "https://example.com"),
    "https://example.com/tx/0xabc",
  );
});
