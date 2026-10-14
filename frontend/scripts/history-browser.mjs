// Read-only browser regression: every RPC/API response is mocked. No chain,
// wallet, hosted backend, credentials or blockchain transaction is used.
import { chromium } from "@playwright/test";
import { Interface } from "ethers";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { eventInterface } from "../src/activity.js";

const root = resolve(import.meta.dirname, ".."),
  origin = "http://127.0.0.1:15174";
const rpc = "https://history-rpc.example.invalid",
  api = "https://history-api.example.invalid";
const address = "0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e",
  wallet = "0x" + "2".repeat(40),
  floor = 11907790;
const quantity = (n) => "0x" + BigInt(n).toString(16),
  hash = (n) => "0x" + BigInt(n).toString(16).padStart(64, "0");
const iface = new Interface([
  "function getModelCount() view returns(uint256)",
  "function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))",
]);
function event(name, args, block, index = 0) {
  return {
    address,
    blockNumber: quantity(block),
    blockHash: hash(block),
    transactionHash: hash(block * 100 + index),
    transactionIndex: "0x0",
    logIndex: quantity(index),
    removed: false,
    ...eventInterface.encodeEventLog(eventInterface.getEvent(name), args),
  };
}
let head = 11914210,
  interrupted = false,
  logReads = 0,
  transactions = 0;
const queries = [],
  events = [
    event(
      "ModelRegistered",
      [1, wallet, "Model 1", "bafyfixture1", 100n],
      floor + 1,
    ),
    event(
      "ModelRegistered",
      [2, wallet, "Model 2", "bafyfixture2", 100n],
      floor + 200,
    ),
    event("LicensePurchased", [1, wallet, 100n], floor + 201),
    event("RoyaltyPaid", [1, wallet, 90n], floor + 201, 1),
    event("ModelStatusChanged", [2, false], head - 80),
    event("RevenueWithdrawn", [wallet, 90n], head - 60),
    event(
      "ModelRegistered",
      [3, wallet, "Model 3", "bafyfixture3", 100n],
      head - 30,
    ),
  ];
const child = spawn(
  resolve(root, "node_modules/.bin/vite"),
  ["--host", "127.0.0.1", "--port", "15174", "--strictPort"],
  {
    cwd: root,
    env: {
      ...process.env,
      VITE_RPC_URL: rpc,
      VITE_CHAIN_ID: "11155111",
      VITE_CONTRACT_ADDRESS: address,
      VITE_DEPLOYMENT_BLOCK: String(floor),
      VITE_API_URL: api,
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
    stdio: "ignore",
  },
);
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Starting. */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, "Isolated history test frontend did not start");
  browser = await chromium.launch(
    process.env.MONTAI_TEST_BROWSER === "chrome" ? { channel: "chrome" } : {},
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(rpc + "/**", async (route) => {
    const payload = route.request().postDataJSON();
    const response = (Array.isArray(payload) ? payload : [payload]).map(
      (request) => {
        let result;
        const { method, params = [] } = request;
        if (method === "eth_chainId") result = "0xaa36a7";
        else if (method === "eth_blockNumber") result = quantity(head);
        else if (method === "eth_getCode") result = "0x6000";
        else if (method === "eth_getBlockByNumber") {
          const number =
            params[0] === "finalized"
              ? head - 100
              : params[0] === "latest"
                ? head
                : Number(BigInt(params[0]));
          result = {
            number: quantity(number),
            hash: hash(number),
            parentHash: hash(number - 1),
            timestamp: "0x1",
            nonce: "0x0000000000000000",
            difficulty: "0x0",
            gasLimit: "0x1c9c380",
            gasUsed: "0x0",
            miner: wallet,
            extraData: "0x",
            transactions: [],
            baseFeePerGas: "0x1",
            mixHash: hash(1),
          };
        } else if (method === "eth_getLogs") {
          logReads++;
          if (interrupted)
            return {
              id: request.id,
              jsonrpc: "2.0",
              error: { code: 429, message: "Too many requests" },
            };
          const filter = params[0],
            from = Number(BigInt(filter.fromBlock)),
            to = Number(BigInt(filter.toBlock));
          queries.push([from, to]);
          assert.equal(filter.address.toLowerCase(), address.toLowerCase());
          assert.equal(filter.topics[0].length, 5);
          if (to - from + 1 > 100)
            return {
              id: request.id,
              jsonrpc: "2.0",
              error: {
                code: -32602,
                message: "Block range is limited to 100 blocks",
              },
            };
          result = events.filter(
            (log) =>
              Number(BigInt(log.blockNumber)) >= from &&
              Number(BigInt(log.blockNumber)) <= to,
          );
        } else if (method === "eth_call") {
          const call = iface.parseTransaction({ data: params[0].data });
          result =
            call.name === "getModelCount"
              ? iface.encodeFunctionResult("getModelCount", [3])
              : iface.encodeFunctionResult("getModel", [
                  [
                    call.args[0],
                    wallet,
                    `Model ${call.args[0]}`,
                    `bafyfixture${call.args[0]}`,
                    "a".repeat(64),
                    100n,
                    90n,
                    true,
                  ],
                ]);
        } else {
          transactions++;
          throw new Error(`Unexpected RPC method ${method}`);
        }
        return { id: request.id, jsonrpc: "2.0", result };
      },
    );
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(Array.isArray(payload) ? response : response[0]),
    });
  });
  await page.route(api + "/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        category: "AI Model",
        description: "Read-only browser fixture",
        fileName: "fixture.onnx",
      }),
    }),
  );
  await page.goto(origin + "/activity");
  await page
    .getByRole("button", { name: "Pause historical backfill", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Resume historical backfill", exact: true })
    .waitFor({ state: "visible" });
  await page
    .getByRole("button", { name: "Resume historical backfill", exact: true })
    .click();
  await page
    .getByText("All available contract history loaded.", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".history tbody tr").count(), 7);
  for (const id of [1, 2, 3])
    assert.equal(
      (await page
        .locator(".history")
        .getByRole("link", { name: `#${id}`, exact: true })
        .count()) >= 1,
      true,
    );
  const transaction = page
    .locator(".history tbody tr")
    .first()
    .getByRole("link", { name: "View on Etherscan ↗" })
    .last();
  assert.match(
    await transaction.getAttribute("href"),
    /^https:\/\/sepolia.etherscan.io\/tx\/0x[\da-f]{64}$/,
  );
  const copy = page
    .locator(".history tbody tr")
    .first()
    .getByRole("button", { name: /Copy transaction:/ });
  const expected = (await copy.getAttribute("aria-label")).replace(
    "Copy transaction: ",
    "",
  );
  await copy.click();
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    expected,
  );
  const fullTransaction = page
    .locator(".history tbody tr")
    .first()
    .getByLabel("Show full transaction", { exact: true });
  await fullTransaction.click();
  assert.ok(
    await page
      .locator(".history tbody tr")
      .first()
      .locator("details")
      .last()
      .getByText(expected, { exact: true })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Registrations", exact: true })
    .click();
  assert.equal(await page.locator(".history tbody tr").count(), 3);
  for (const type of [
    "Purchases",
    "Revenue",
    "Status Changes",
    "Withdrawals",
  ]) {
    await page.getByRole("button", { name: type, exact: true }).click();
    assert.equal(await page.locator(".history tbody tr").count(), 1);
  }
  await page.getByRole("button", { name: "All Events", exact: true }).click();
  const before = logReads;
  head += 5;
  events.push(event("LicensePurchased", [3, wallet, 100n], head));
  await page
    .getByRole("button", { name: "Refresh chain data", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".history tbody tr").length === 8,
  );
  await page
    .getByText("All available contract history loaded.", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".history tbody tr").count(), 8);
  assert.ok(logReads - before <= 2, "Refresh rescanned old history");
  const beforeReload = logReads;
  await page.reload();
  await page
    .getByText("All available contract history loaded.", { exact: true })
    .waitFor();
  assert.ok(logReads - beforeReload <= 3, "Reload ignored the finalized cache");
  for (const id of [1, 2, 3]) {
    await page.goto(origin + `/model/${id}`);
    await page
      .getByRole("heading", { name: `Model ${id}`, exact: true })
      .waitFor();
    await page
      .getByText("All available contract history loaded.", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator(".event-timeline")
        .getByText("Model Registered", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page
        .locator(".event-timeline")
        .getByText("Revenue Withdrawn", { exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Trace Model", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Model provenance", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Close provenance", exact: true })
      .click();
  }
  await page.goto(origin + "/activity");
  await page
    .getByText("All available contract history loaded.", { exact: true })
    .waitFor();
  interrupted = true;
  const before429 = logReads;
  await page
    .getByRole("button", { name: "Refresh chain data", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: /rate-limited/ })
    .waitFor();
  await page.waitForTimeout(800);
  assert.equal(logReads, before429 + 1, "429 was automatically retried");
  assert.ok(
    (await page.locator(".history tbody tr").count()) > 0,
    "RPC failure erased loaded finalized events",
  );
  interrupted = false;
  await page
    .getByRole("button", { name: "Retry history", exact: true })
    .click();
  await page
    .getByText("All available contract history loaded.", { exact: true })
    .waitFor();
  const screenshots = await mkdtemp(resolve(tmpdir(), "montai-history-ui-"));
  await page.screenshot({
    path: resolve(screenshots, "activity-desktop.png"),
    fullPage: true,
  });
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "History filters/table overflow",
    );
    await page.screenshot({
      path: resolve(screenshots, `activity-${width}.png`),
      fullPage: true,
    });
  }
  assert.equal(transactions, 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: read-only mocked Sepolia browser history; models 1/2/3, all filters, copy/explorer, pause/resume, cache/reload, incremental refresh, 429 no retry, model provenance, responsive layouts; zero transactions.",
  );
  console.log(`History UI screenshots: ${screenshots}`);
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
