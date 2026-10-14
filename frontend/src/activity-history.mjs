import {
  decodeEvent,
  eventProvider,
  normalizeEventLog,
  readEventRange,
} from "./activity.js";

export const HISTORY_POLICY = {
  spans: [2000, 500, 100, 10],
  intervalMs: 350,
  maxRequests: 400,
  maxDurationMs: 120000,
  overlap: 64,
  cacheBytes: 2 * 1024 * 1024,
};
const stores = new Map();
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const abort = (signal) => signal?.throwIfAborted();
export const historyKey = (chainId, address, deploymentBlock) =>
  `montai.history.v1:${chainId}:${address.toLowerCase()}:${deploymentBlock}`;
export function mergeRanges(ranges) {
  const sorted = ranges.map((range) => [...range]).sort((a, b) => a[0] - b[0]),
    result = [];
  for (const [from, to] of sorted) {
    const last = result.at(-1);
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else result.push([from, to]);
  }
  return result;
}
export function nextGap(ranges, latest, deploymentBlock) {
  let end = latest;
  for (const [from, to] of [...ranges].reverse()) {
    if (end > to) return { from: Math.max(deploymentBlock, to + 1), to: end };
    if (end >= from) end = from - 1;
  }
  return end >= deploymentBlock ? { from: deploymentBlock, to: end } : null;
}
function errorDetails(error) {
  return [
    error?.message,
    error?.shortMessage,
    error?.info?.error?.message,
    error?.error?.message,
  ]
    .filter(Boolean)
    .join(" ");
}
export function isHistoryRateLimit(error) {
  return (
    [
      error?.status,
      error?.code,
      error?.info?.error?.code,
      error?.error?.code,
      error?.response?.status,
    ].some((code) => Number(code) === 429) ||
    /\b429\b|too many requests|rate.?limit|throughput|compute units|quota exceeded/i.test(
      errorDetails(error),
    )
  );
}
export function isHistoryRangeLimit(error) {
  return (
    !isHistoryRateLimit(error) &&
    /block range|range.{0,40}(large|limit|wide)|too many (results|logs)|response.{0,30}(size|limit)|query returned more|limited to.{0,20}blocks/i.test(
      errorDetails(error),
    )
  );
}
function safeError(error) {
  return isHistoryRateLimit(error)
    ? "The RPC rate-limited history requests. Loaded events and the scan cursor are preserved. Wait before resuming; no automatic retry was made."
    : "Blockchain history could not be read. Loaded events and the scan cursor are preserved. Check the RPC connection, then retry history.";
}
function delay(ms, signal) {
  abort(signal);
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException("History paused", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal?.addEventListener("abort", cancel, { once: true });
  });
}
export function selectEvents(events, { modelId, type = "All Events" } = {}) {
  const types = {
    Registrations: "ModelRegistered",
    Purchases: "LicensePurchased",
    Revenue: "RoyaltyPaid",
    "Status Changes": "ModelStatusChanged",
    Withdrawals: "RevenueWithdrawn",
  };
  return events.filter(
    (event) =>
      (!modelId || event.modelId === String(modelId)) &&
      (!types[type] || event.name === types[type]),
  );
}

// Shared by Activity and Details. Cache is a performance hint, never license,
// authentication or integrity authority. Only checkpointed history is durable.
export function createHistoryReader({
  contract,
  chainId,
  deploymentBlock,
  storage,
  policy = {},
  now = Date.now,
  wait = delay,
}) {
  if (
    !integer(deploymentBlock) ||
    (String(chainId) === "11155111" && deploymentBlock === 0)
  )
    throw new Error(
      "Configure VITE_DEPLOYMENT_BLOCK before reading Sepolia history.",
    );
  const settings = { ...HISTORY_POLICY, ...policy },
    address = String(contract.target).toLowerCase(),
    provider = eventProvider(contract);
  const key = historyKey(chainId, address, deploymentBlock),
    durable = String(chainId) !== "31337" && storage;
  let ranges = [],
    logs = new Map(),
    latest = null,
    anchor = null,
    span = settings.spans[0],
    controller,
    running,
    detachTimer,
    lastRequest = -Infinity,
    savedAt = -Infinity,
    recentFloor = deploymentBlock;
  const listeners = new Set();
  const decoded = new WeakMap();
  let state = {
    events: [],
    busy: false,
    phase: "idle",
    error: "",
    latest: null,
    through: null,
    complete: false,
    requests: 0,
    span,
    covered: 0,
    total: 0,
    cache: "Not checked",
    reorganized: false,
  };
  const emit = (changes) => {
    const gap =
      latest === null ? null : nextGap(ranges, latest, deploymentBlock);
    state = {
      ...state,
      ...changes,
      latest,
      span,
      events: [...logs.values()]
        .map((log) => {
          if (!decoded.has(log)) decoded.set(log, decodeEvent(log));
          return {
            ...decoded.get(log),
            stale: !ranges.some(
              ([from, to]) => log.blockNumber >= from && log.blockNumber <= to,
            ),
          };
        })
        .sort((a, b) => b.block - a.block || b.index - a.index),
      through: latest === null ? null : gap ? gap.to + 1 : deploymentBlock,
      complete: latest !== null && !gap,
      covered: ranges.reduce((sum, [from, to]) => sum + to - from + 1, 0),
      total: latest === null ? 0 : Math.max(0, latest - deploymentBlock + 1),
    };
    listeners.forEach((fn) => fn());
  };
  const persist = (force = false) => {
    if (!durable || !anchor?.finalized || (!force && now() - savedAt < 2000))
      return;
    const confirmed = mergeRanges(
      ranges
        .filter(([from]) => from <= anchor.number)
        .map(([from, to]) => [from, Math.min(to, anchor.number)]),
    );
    if (!confirmed.length) return;
    const confirmedLogs = [...logs.values()].filter((log) =>
      confirmed.some(
        ([from, to]) => log.blockNumber >= from && log.blockNumber <= to,
      ),
    );
    const value = JSON.stringify({
      version: 1,
      chainId: String(chainId),
      address,
      deploymentBlock,
      anchor,
      ranges: confirmed,
      logs: confirmedLogs,
      span,
    });
    try {
      if (value.length > settings.cacheBytes) throw new Error();
      storage.setItem(key, value);
      savedAt = now();
      state = {
        ...state,
        cache: "Checkpointed history cached in this browser",
      };
    } catch {
      state = {
        ...state,
        cache: "Browser cache unavailable; progress kept in memory",
      };
    }
  };
  const reset = () => {
    ranges = [];
    logs = new Map();
    anchor = null;
    try {
      storage?.removeItem(key);
    } catch {
      /* Cache may be blocked. */
    }
  };
  const restore = async (signal) => {
    if (!durable) return;
    let cached;
    try {
      const raw = storage.getItem(key);
      if (!raw) return;
      if (raw.length > settings.cacheBytes) throw new Error();
      cached = JSON.parse(raw);
      if (
        cached.version !== 1 ||
        cached.chainId !== String(chainId) ||
        cached.address !== address ||
        cached.deploymentBlock !== deploymentBlock ||
        cached.anchor?.finalized !== true ||
        !integer(cached.anchor?.number) ||
        !/^0x[\da-f]{64}$/i.test(cached.anchor?.hash || "") ||
        !Array.isArray(cached.ranges) ||
        !Array.isArray(cached.logs) ||
        cached.ranges.length > 1000 ||
        cached.logs.length > 10000 ||
        cached.ranges.some(
          (range) =>
            !Array.isArray(range) ||
            range.length !== 2 ||
            !range.every(integer) ||
            range[0] < deploymentBlock ||
            range[1] < range[0] ||
            range[1] > cached.anchor.number,
        )
      )
        throw new Error();
      cached.logs = cached.logs.map((log) => normalizeEventLog(log, address));
      if (
        cached.logs.some(
          (log) =>
            !cached.ranges.some(
              ([from, to]) => log.blockNumber >= from && log.blockNumber <= to,
            ),
        )
      )
        throw new Error();
    } catch {
      reset();
      return;
    }
    const canonical = await provider.getBlock(cached.anchor.number);
    abort(signal);
    if (!canonical) throw new Error("Checkpoint unavailable");
    if (canonical.hash !== cached.anchor.hash) {
      reset();
      emit({
        reorganized: true,
        cache: "Chain checkpoint changed; rebuilding history",
      });
      return;
    }
    ranges = mergeRanges(cached.ranges);
    logs = new Map(
      cached.logs.map((log) => [`${log.transactionHash}:${log.index}`, log]),
    );
    anchor = cached.anchor;
    span = settings.spans.includes(cached.span)
      ? cached.span
      : settings.spans[0];
    emit({ cache: "Cached history checkpoint verified against the RPC" });
  };
  const syncHead = async (signal) => {
    const head = await provider.getBlockNumber();
    abort(signal);
    if (!integer(head)) throw new Error("Invalid chain head");
    if (head < deploymentBlock)
      throw new Error("Deployment block is ahead of the RPC head");
    if (anchor && head < anchor.number)
      throw new Error("RPC is behind the history checkpoint");
    if (anchor && latest !== null) {
      const block = await provider.getBlock(anchor.number);
      abort(signal);
      if (!block || head < anchor.number)
        throw new Error("RPC is behind the history checkpoint");
      if (block.hash !== anchor.hash) {
        reset();
        emit({
          reorganized: true,
          cache: "Chain checkpoint changed; rebuilding history",
        });
      }
    }
    let finalized,
      finalityConfirmed = false;
    if (String(chainId) === "31337") finalized = await provider.getBlock(head);
    else {
      try {
        finalized = await provider.getBlock("finalized");
        finalityConfirmed = Boolean(finalized);
      } catch (error) {
        if (
          isHistoryRateLimit(error) ||
          !/unsupported|invalid (argument|params)|finalized.{0,30}(not supported|unavailable)/i.test(
            errorDetails(error),
          )
        )
          throw error;
      }
      if (!finalized)
        finalized = await provider.getBlock(
          Math.max(0, head - settings.overlap),
        );
      if (!finalityConfirmed)
        emit({
          cache: "RPC finality unavailable; history stays in memory only",
        });
    }
    abort(signal);
    if (
      !finalized ||
      !integer(finalized.number) ||
      finalized.number > head ||
      !/^0x[\da-f]{64}$/i.test(finalized.hash || "")
    )
      throw new Error("Invalid finality checkpoint");
    // Replay the unstable tail plus a conservative overlap, not old finalized
    // ranges. Replace its logs so removed/reorganized events cannot survive.
    recentFloor = ranges.length
      ? Math.max(...ranges.map(([, to]) => to)) + 1
      : deploymentBlock;
    if (latest !== null) {
      const cut = Math.max(
        deploymentBlock,
        Math.min(finalized.number + 1, latest - settings.overlap + 1),
      );
      recentFloor = Math.min(recentFloor, cut);
      ranges = ranges
        .filter(([from]) => from < cut)
        .map(([from, to]) => [from, Math.min(to, cut - 1)]);
      // Keep previously observed tail events visible, explicitly stale, until
      // each replacement query succeeds. A failed refresh must not erase them.
    }
    latest = head;
    anchor = {
      number: finalized.number,
      hash: finalized.hash,
      finalized: finalityConfirmed,
    };
    emit({ phase: "recent" });
  };
  async function scan({
    refresh = false,
    recentOnly = false,
    maxRequests = settings.maxRequests,
    maxDurationMs = settings.maxDurationMs,
    eventTarget = Infinity,
    modelId,
    type,
  } = {}) {
    const signal = controller.signal,
      started = now();
    let requests = 0,
      found = 0;
    emit({
      busy: true,
      error: "",
      phase: latest === null ? "recent" : "backfill",
      requests: 0,
    });
    try {
      if (latest === null) {
        await restore(signal);
        await syncHead(signal);
      } else if (refresh) await syncHead(signal);
      // Hard budget applies to successes AND failed capability probes. At most
      // three range reductions, never a retry loop for 429 or generic errors.
      const budget =
        Number.isSafeInteger(maxRequests) && maxRequests > 0
          ? Math.min(maxRequests, settings.maxRequests)
          : settings.maxRequests;
      while (
        requests < budget &&
        now() - started < Math.min(maxDurationMs, settings.maxDurationMs)
      ) {
        abort(signal);
        const gap = nextGap(ranges, latest, deploymentBlock);
        if (!gap) break;
        if (recentOnly && gap.to < recentFloor) break;
        const from = Math.max(
            gap.from,
            gap.to - span + 1,
            recentOnly ? recentFloor : deploymentBlock,
          ),
          to = gap.to;
        const pause = Math.max(0, settings.intervalMs - (now() - lastRequest));
        if (pause) await wait(pause, signal);
        abort(signal);
        lastRequest = now();
        requests++;
        emit({ requests, phase: ranges.length ? "backfill" : "recent" });
        let batch;
        try {
          batch = await readEventRange(contract, {
            fromBlock: from,
            toBlock: to,
            signal,
          });
        } catch (error) {
          abort(signal);
          const smaller = settings.spans.find(
            (candidate) => candidate < to - from + 1,
          );
          if (isHistoryRangeLimit(error) && smaller) {
            span = smaller;
            emit({ requests });
            continue;
          }
          throw error;
        }
        abort(signal);
        if (batch.some((log) => log.blockNumber < from || log.blockNumber > to))
          throw new Error("Event outside requested range");
        for (const [key, log] of logs)
          if (log.blockNumber >= from && log.blockNumber <= to)
            logs.delete(key);
        for (const log of batch)
          logs.set(`${log.transactionHash}:${log.index}`, log);
        ranges = mergeRanges([...ranges, [from, to]]);
        found += selectEvents(batch.map(decodeEvent), { modelId, type }).length;
        persist();
        emit({ requests });
        if (found >= eventTarget) break;
      }
      persist(true);
      emit({
        phase: nextGap(ranges, latest, deploymentBlock) ? "paused" : "complete",
      });
    } catch (error) {
      persist(true);
      emit(
        signal.aborted
          ? { phase: "paused" }
          : { phase: "error", error: safeError(error) },
      );
    } finally {
      emit({ busy: false });
    }
    return state;
  }
  return {
    snapshot: () => state,
    subscribe(fn) {
      clearTimeout(detachTimer);
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
        if (!listeners.size)
          detachTimer = setTimeout(() => {
            if (!listeners.size) controller?.abort();
          }, 50);
      };
    },
    run(options) {
      if (running) return running;
      controller = new AbortController();
      running = scan(options).finally(() => {
        running = null;
      });
      return running;
    },
    pause: () => controller?.abort(),
  };
}
export function sharedHistoryReader(options) {
  const key = historyKey(
    options.chainId,
    String(options.contract.target),
    options.deploymentBlock,
  );
  if (!stores.has(key)) stores.set(key, createHistoryReader(options));
  return stores.get(key);
}
