import test from "node:test";
import assert from "node:assert/strict";
import {
  eventInterface,
  readEventRange,
  readEventPage,
} from "../src/activity.js";
import {
  createHistoryReader,
  historyKey,
  selectEvents,
  nextGap,
  mergeRanges,
  isHistoryRangeLimit,
  isHistoryRateLimit,
} from "../src/activity-history.mjs";

const address = "0x" + "1".repeat(40),
  wallet = "0x" + "2".repeat(40);
const hash = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
function log(name, model, block, index = 0) {
  const args = {
    ModelRegistered: [model, wallet, `Model ${model}`, "bafyfixture", 100n],
    LicensePurchased: [model, wallet, 100n],
    RoyaltyPaid: [model, wallet, 90n],
    ModelStatusChanged: [model, false],
    RevenueWithdrawn: [wallet, 90n],
  }[name];
  return {
    address,
    blockNumber: block,
    blockHash: hash(block),
    transactionHash: hash(block * 100 + index),
    index,
    ...eventInterface.encodeEventLog(eventInterface.getEvent(name), args),
  };
}
function setup({
  head = 3000,
  floor = 1,
  cap = 2000,
  logs = [],
  finality = 64,
  storage,
  policy = {},
} = {}) {
  let latest = head,
    entries = logs,
    failAt = Infinity,
    error,
    changed = false,
    active = 0,
    maxActive = 0;
  const calls = [],
    blocks = [];
  const provider = {
    getBlockNumber: async () => latest,
    getBlock: async (number) => {
      const n =
        number === "finalized" ? Math.max(0, latest - finality) : number;
      blocks.push(n);
      return { number: n, hash: hash(n + (changed ? 1000000 : 0)) };
    },
    getLogs: async (filter) => {
      calls.push(filter);
      active++;
      maxActive = Math.max(active, maxActive);
      await Promise.resolve();
      try {
        if (calls.length >= failAt) throw error;
        if (filter.toBlock - filter.fromBlock + 1 > cap)
          throw Object.assign(new Error(`block range limit: ${cap}`), {
            code: -32602,
          });
        return entries.filter(
          (item) =>
            item.blockNumber >= filter.fromBlock &&
            item.blockNumber <= filter.toBlock,
        );
      } finally {
        active--;
      }
    },
  };
  const contract = {
    target: address,
    runner: provider,
    interface: eventInterface,
  };
  const reader = createHistoryReader({
    contract,
    chainId: 11155111,
    deploymentBlock: floor,
    storage,
    policy: { intervalMs: 0, ...policy },
  });
  return {
    reader,
    contract,
    provider,
    calls,
    blocks,
    maxActive: () => maxActive,
    head: (value) => (latest = value),
    entries: (value) => (entries = value),
    fail: (at, reason) => {
      failAt = at;
      error = reason;
    },
    fork: () => (changed = true),
  };
}
const memory = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    data,
  };
};
test("automatically reaches deployment, finding all three registrations and all event types with one OR request per range", async () => {
  const entries = [
    log("ModelRegistered", 1, 3),
    log("ModelRegistered", 2, 1234),
    log("ModelRegistered", 3, 2998),
    log("LicensePurchased", 1, 2100),
    log("RoyaltyPaid", 1, 2100, 1),
    log("ModelStatusChanged", 2, 2500),
    log("RevenueWithdrawn", null, 2800),
  ];
  const f = setup({ logs: [...entries, entries[2]] });
  await f.reader.run();
  const state = f.reader.snapshot();
  assert.equal(state.complete, true);
  assert.equal(state.covered, state.total);
  assert.equal(state.events.length, 7);
  assert.deepEqual(
    state.events
      .filter((e) => e.name === "ModelRegistered")
      .map((e) => e.modelId),
    ["3", "2", "1"],
  );
  assert.deepEqual(
    state.events.map((e) => [e.block, e.index]),
    [
      [2998, 0],
      [2800, 0],
      [2500, 0],
      [2100, 1],
      [2100, 0],
      [1234, 0],
      [3, 0],
    ],
  );
  assert.equal(f.calls.length, 2);
  assert.equal(f.maxActive(), 1);
  assert.ok(
    f.calls.every(
      (c) =>
        c.address === address &&
        c.topics.length === 1 &&
        c.topics[0].length === 5,
    ),
  );
  for (const id of ["1", "2", "3"])
    assert.ok(
      selectEvents(state.events, { modelId: id }).some(
        (e) => e.name === "ModelRegistered",
      ),
    );
  assert.ok(
    selectEvents(state.events, { modelId: "1" }).every(
      (e) => e.modelId === "1",
    ),
  );
  assert.equal(selectEvents(state.events, { type: "Withdrawals" }).length, 1);
  assert.equal(
    selectEvents(state.events, { modelId: "1", type: "Withdrawals" }).length,
    0,
  );
  assert.equal(
    selectEvents(state.events, { type: "Revenue" })[0].name,
    "RoyaltyPaid",
  );
});
test("capability probes reduce 2000 → 500 → 100 → 10, remain sequential, and remember the accepted size", async () => {
  const f = setup({ cap: 10 });
  await f.reader.run({ maxRequests: 5 });
  assert.deepEqual(
    f.calls.map((c) => c.toBlock - c.fromBlock + 1),
    [2000, 500, 100, 10, 10],
  );
  assert.equal(f.reader.snapshot().complete, false);
  assert.equal(f.reader.snapshot().span, 10);
  await f.reader.run({ maxRequests: 1 });
  assert.equal(f.calls.at(-1).toBlock, 2980);
  assert.equal(f.calls.at(-1).fromBlock, 2971);
  assert.equal(f.maxActive(), 1);
});
test("bounded empty-window pagination retains exact cursor and can resume to deployment without overlap", async () => {
  const f = setup({ head: 30, cap: 10, policy: { spans: [10] } });
  await f.reader.run({ maxRequests: 2, eventTarget: 20 });
  assert.equal(f.reader.snapshot().through, 11);
  assert.equal(f.reader.snapshot().complete, false);
  await f.reader.run({ maxRequests: 2 });
  assert.equal(f.reader.snapshot().complete, true);
  assert.deepEqual(
    f.calls.map((c) => [c.fromBlock, c.toBlock]),
    [
      [21, 30],
      [11, 20],
      [1, 10],
    ],
  );
  assert.equal(
    nextGap(
      mergeRanges([
        [10, 20],
        [1, 9],
        [25, 30],
      ]),
      30,
      1,
    ).to,
    24,
  );
});
test("older EVENTS pagination skips empty ranges until useful events or a safe work limit", async () => {
  const f = setup({
    head: 100,
    cap: 10,
    logs: [log("ModelRegistered", 1, 45)],
    policy: { spans: [10] },
  });
  await f.reader.run({ eventTarget: 1, modelId: "1", maxRequests: 10 });
  assert.equal(f.reader.snapshot().events.length, 1);
  assert.equal(f.calls.length, 6);
  assert.equal(f.reader.snapshot().through, 41);
  assert.equal(f.reader.snapshot().complete, false);
});
for (const [name, error] of [
  [
    "429",
    Object.assign(new Error("private RPC URL"), {
      info: { error: { code: 429, message: "rate limit" } },
    }),
  ],
  ["network failure", new Error("private RPC URL/key unavailable")],
]) {
  test(`${name} stops immediately without retries and preserves loaded events/cursor`, async () => {
    const f = setup({
      head: 30,
      logs: [log("ModelRegistered", 3, 25)],
      policy: { spans: [10] },
    });
    f.fail(2, error);
    await f.reader.run();
    const state = f.reader.snapshot();
    assert.equal(f.calls.length, 2);
    assert.equal(state.events.length, 1);
    assert.equal(state.through, 21);
    assert.equal(state.complete, false);
    assert.doesNotMatch(state.error, /private RPC/);
    assert.match(
      state.error,
      name === "429" ? /rate-limited/ : /could not be read/,
    );
    f.fail(Infinity);
    await f.reader.run();
    assert.equal(f.calls[2].toBlock, 20);
    assert.equal(f.reader.snapshot().complete, true);
  });
}
test("pause cancels stale results, concurrent runs coalesce, last subscriber detaches safely", async () => {
  const f = setup({ head: 30, policy: { spans: [10] } });
  let release;
  f.provider.getLogs = () => new Promise((resolve) => (release = resolve));
  const run = f.reader.run();
  assert.equal(f.reader.run(), run);
  await new Promise((r) => setTimeout(r, 0));
  f.reader.pause();
  release([log("ModelRegistered", 1, 25)]);
  await run;
  assert.equal(f.reader.snapshot().events.length, 0);
  assert.equal(f.reader.snapshot().complete, false);
  assert.equal(f.reader.snapshot().phase, "paused");
  const g = setup({ head: 30, policy: { spans: [10] } });
  let finish;
  g.provider.getLogs = () => new Promise((resolve) => (finish = resolve));
  const off = g.reader.subscribe(() => {}),
    pending = g.reader.run();
  await new Promise((r) => setTimeout(r, 0));
  off();
  await new Promise((r) => setTimeout(r, 70));
  finish([]);
  await pending;
  assert.equal(g.reader.snapshot().covered, 0);
});
test("confirmed cache is checkpoint-verified, resumes gaps and never persists provisional events or credentials", async () => {
  const storage = memory(),
    entries = [log("ModelRegistered", 1, 75), log("ModelRegistered", 3, 95)];
  const f = setup({
    head: 100,
    finality: 20,
    storage,
    logs: entries,
    policy: { spans: [10] },
  });
  await f.reader.run({ maxRequests: 3 });
  const cache = JSON.parse(storage.getItem(historyKey(11155111, address, 1)));
  assert.equal(cache.anchor.number, 80);
  assert.deepEqual(cache.ranges, [[71, 80]]);
  assert.ok(cache.logs.every((e) => e.blockNumber <= 80));
  assert.doesNotMatch(
    JSON.stringify(cache),
    /Authorization|Bearer|PRIVATE_KEY|RPC_URL/,
  );
  const reloaded = setup({
    head: 100,
    finality: 20,
    storage,
    logs: entries,
    policy: { spans: [10] },
  });
  await reloaded.reader.run();
  assert.ok(reloaded.blocks.includes(80));
  assert.ok(reloaded.calls.every((c) => c.toBlock < 71 || c.fromBlock > 80));
  assert.equal(reloaded.reader.snapshot().complete, true);
  assert.equal(reloaded.reader.snapshot().events.length, 2);
});
test("refresh scans only new/reorg-sensitive ranges, preserves old history, deduplicates overlapping events", async () => {
  const old = [
    log("ModelRegistered", 1, 901),
    log("ModelRegistered", 2, 940),
    log("ModelRegistered", 3, 980),
    log("LicensePurchased", 3, 1000),
  ];
  const f = setup({
    head: 1000,
    floor: 900,
    finality: 4,
    logs: old,
    policy: { spans: [20, 10], overlap: 4 },
  });
  await f.reader.run();
  const before = f.calls.length;
  f.head(1005);
  f.entries([...old, log("RoyaltyPaid", 3, 1003)]);
  await f.reader.run({ refresh: true, recentOnly: true });
  assert.equal(f.reader.snapshot().events.length, 5);
  assert.ok(f.calls.slice(before).every((c) => c.fromBlock >= 997));
  assert.equal(f.reader.snapshot().complete, true);
  const next = f.calls.length;
  f.entries(old);
  await f.reader.run({ refresh: true });
  assert.ok(f.calls.slice(next).every((c) => c.fromBlock >= 1002)); // previous head's conservative overlap is 1002
  assert.equal(
    new Set(f.reader.snapshot().events.map((e) => e.key)).size,
    f.reader.snapshot().events.length,
  );
  assert.equal(f.reader.snapshot().events.length, 4);
  assert.ok(f.reader.snapshot().events.every((e) => e.block !== 1003));
});
test("checkpoint reorganization discards stale cache and rebuilds; corrupted cache is not trusted", async () => {
  const storage = memory(),
    f = setup({ head: 100, storage, logs: [log("ModelRegistered", 1, 10)] });
  await f.reader.run();
  const g = setup({ head: 100, storage });
  g.fork();
  await g.reader.run();
  assert.equal(g.reader.snapshot().reorganized, true);
  assert.equal(g.reader.snapshot().events.length, 0);
  storage.setItem(
    historyKey(11155111, address, 1),
    '{"version":1,"ranges":"corrupt"}',
  );
  const h = setup({ head: 100, storage });
  await h.reader.run();
  assert.equal(h.reader.snapshot().complete, true);
});
test("single-range decoder uses exact event signatures; model view excludes withdrawals and foreign logs fail closed", async () => {
  const f = setup({
    head: 100,
    logs: [log("RevenueWithdrawn", null, 95), log("ModelRegistered", 2, 96)],
  });
  const page = await readEventPage(f.contract, {
    toBlock: 100,
    fromBlock: 1,
    modelId: "2",
  });
  assert.deepEqual(
    page.events.map((e) => e.name),
    ["ModelRegistered"],
  );
  f.provider.getLogs = async () => [
    { ...log("ModelRegistered", 1, 1), address: wallet },
  ];
  await assert.rejects(
    readEventRange(f.contract, { fromBlock: 1, toBlock: 2 }),
    /Invalid contract event/,
  );
  assert.equal(isHistoryRangeLimit({ message: "block range too large" }), true);
  assert.equal(
    isHistoryRangeLimit({ code: 429, message: "block range rate limited" }),
    false,
  );
  assert.equal(isHistoryRateLimit({ response: { status: 429 } }), true);
});
test("failed refresh retains prior tail events as stale, never supplies them as verified history", async () => {
  const f = setup({
    head: 100,
    logs: [log("ModelRegistered", 1, 99)],
    policy: { spans: [100] },
  });
  await f.reader.run();
  f.fail(
    f.calls.length + 1,
    Object.assign(new Error("rate limit"), { code: 429 }),
  );
  await f.reader.run({ refresh: true });
  assert.equal(f.reader.snapshot().events.length, 1);
  assert.equal(f.reader.snapshot().events[0].stale, true);
  assert.equal(f.reader.snapshot().complete, false);
  f.fail(Infinity);
  f.entries([]);
  await f.reader.run();
  assert.equal(f.reader.snapshot().events.length, 0);
  assert.equal(f.reader.snapshot().complete, true);
});
test("unavailable finality falls back to memory only; it cannot persist unfinalized data", async () => {
  const storage = memory(),
    f = setup({ head: 100, storage, logs: [log("ModelRegistered", 1, 10)] });
  const getBlock = f.provider.getBlock;
  f.provider.getBlock = async (n) => {
    if (n === "finalized") throw new Error("unsupported finalized tag");
    return getBlock(n);
  };
  await f.reader.run();
  assert.equal(f.reader.snapshot().complete, true);
  assert.equal(storage.data.size, 0);
  assert.match(f.reader.snapshot().cache, /memory only/);
});
