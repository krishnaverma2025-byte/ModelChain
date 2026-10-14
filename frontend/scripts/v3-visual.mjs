// Paired LOCAL screenshots. Reference is the unmodified supplied prototype.
// Integrated data is explicitly a read-only fixture, not production verification.
import { chromium } from "@playwright/test";
import { Interface } from "ethers";
import { spawn } from "node:child_process";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { eventInterface } from "../src/activity.js";
const root = resolve(import.meta.dirname, "..");
const reference =
  process.env.MONTAI_V3_REFERENCE_URL || "http://127.0.0.1:15175";
const integrated = "http://127.0.0.1:15176";
const rpc = "https://visual-rpc.example.invalid",
  api = "https://visual-api.example.invalid";
const address = "0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e",
  wallet = "0x" + "2".repeat(40),
  floor = 11907790;
const iface = new Interface([
  "function getModelCount() view returns(uint256)",
  "function getModel(uint256) view returns(tuple(uint256 id,address owner,string name,string cid,string modelHash,uint256 price,uint256 royalty,bool active))",
  "function hasLicense(uint256,address) view returns(bool)",
  "function pendingWithdrawals(address) view returns(uint256)",
]);
const logs = [
  [
    "ModelRegistered",
    [1, wallet, "Model 1", "bafyvisualfixture1", 10000000000000000n],
  ],
  ["LicensePurchased", [1, wallet, 10000000000000000n]],
  ["ModelStatusChanged", [2, true]],
  ["RevenueWithdrawn", [wallet, 10000000000000000n]],
].map(([name, args], index) => ({
  address,
  blockNumber: "0x" + (floor + index + 1).toString(16),
  blockHash: "0x" + (floor + index + 1).toString(16).padStart(64, "0"),
  transactionHash: "0x" + (index + 1).toString(16).padStart(64, "0"),
  transactionIndex: "0x0",
  logIndex: "0x0",
  removed: false,
  ...eventInterface.encodeEventLog(eventInterface.getEvent(name), args),
}));
const output = await mkdtemp(resolve(tmpdir(), "montai-v3-parity-"));
const child = spawn(
  resolve(root, "node_modules/.bin/vite"),
  ["--host", "127.0.0.1", "--port", "15176", "--strictPort"],
  {
    cwd: root,
    stdio: "ignore",
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
  }
);
let browser;
try {
  assert.equal(
    (await fetch(reference)).ok,
    true,
    "Start the supplied prototype locally first"
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(integrated)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const faces = await Promise.all(
    ["manrope-latin", "dm-mono-latin"].map((name) =>
      readFile(resolve(root, "public/fonts/" + name + ".woff2"))
    )
  );
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      contentType: "text/css",
      body: faces
        .map(
          (bytes, i) =>
            `@font-face{font-family:"${
              i ? "DM Mono" : "Manrope"
            }";src:url(data:font/woff2;base64,${bytes.toString(
              "base64"
            )});font-weight:${i ? "400" : "400 800"};font-display:swap}`
        )
        .join("\n"),
    })
  );
  let writes = 0;
  await context.route(rpc + "/**", async (route) => {
    const input = route.request().postDataJSON();
    const values = (Array.isArray(input) ? input : [input]).map((request) => {
      let result;
      if (request.method === "eth_chainId") result = "0xaa36a7";
      else if (request.method === "eth_blockNumber")
        result = "0x" + (floor + 16).toString(16);
      else if (request.method === "eth_getCode") result = "0x6000";
      else if (request.method === "eth_getLogs")
        result = logs.filter(
          (log) =>
            BigInt(log.blockNumber) >= BigInt(request.params[0].fromBlock) &&
            BigInt(log.blockNumber) <= BigInt(request.params[0].toBlock)
        );
      else if (request.method === "eth_getBlockByNumber") {
        const number =
          request.params[0] === "latest" || request.params[0] === "finalized"
            ? floor + 16
            : Number(BigInt(request.params[0]));
        result = {
          number: "0x" + number.toString(16),
          hash: "0x" + number.toString(16).padStart(64, "0"),
          parentHash: "0x" + "0".repeat(64),
          timestamp: "0x65000000",
          nonce: "0x0000000000000000",
          difficulty: "0x0",
          gasLimit: "0x1c9c380",
          gasUsed: "0x0",
          miner: wallet,
          extraData: "0x",
          transactions: [],
        };
      } else if (request.method === "eth_call") {
        const call = iface.parseTransaction(request.params[0]);
        if (call.name === "getModelCount")
          result = iface.encodeFunctionResult(call.name, [3]);
        else if (call.name === "getModel") {
          const id = Number(call.args[0]);
          result = iface.encodeFunctionResult(call.name, [
            [
              id,
              wallet,
              "Model " + id,
              "bafyvisualfixture" + id,
              "0x" + "a".repeat(64),
              10000000000000000n,
              95,
              true,
            ],
          ]);
        } else if (call.name === "hasLicense")
          result = iface.encodeFunctionResult(call.name, [false]);
        else if (call.name === "pendingWithdrawals")
          result = iface.encodeFunctionResult(call.name, [0]);
      } else {
        writes++;
        throw new Error("Unexpected RPC method " + request.method);
      }
      return { jsonrpc: "2.0", id: request.id, result };
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(Array.isArray(input) ? values : values[0]),
    });
  });
  await context.route(api + "/**", (route) => {
    const url = new URL(route.request().url());
    const id = Number(url.pathname.match(/models\/(\d+)/)?.[1] || 1);
    const value =
      url.pathname === "/api/auth/session"
        ? {
            address: wallet,
            expiresAt: Date.now() + 3600000,
            chainId: "11155111",
            contractAddress: address,
          }
        : {
            category: ["Computer Vision", "Natural Language", "Generative AI"][
              id - 1
            ],
            description: "Read-only visual fixture",
          };
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(value),
    });
  });
  const actual = await context.newPage(),
    original = await context.newPage();
  await actual.addInitScript(
    ({ wallet }) => {
      window.ethereum = {
        request: async ({ method }) =>
          method === "eth_accounts"
            ? [wallet]
            : method === "eth_chainId"
            ? "0xaa36a7"
            : Promise.reject(new Error("No visual-test transactions")),
        on: () => {},
        removeListener: () => {},
      };
      sessionStorage.setItem(
        "montai.wallet-session.v1",
        JSON.stringify({
          token: "Bearer visual-fixture",
          address: wallet,
          chain: "11155111",
          expiresAt: Date.now() + 3600000,
        })
      );
    },
    { wallet }
  );
  const errors = [];
  actual.on("pageerror", (error) => errors.push(error.message));
  original.on("pageerror", (error) =>
    errors.push("Reference: " + error.message)
  );
  const routes = [
    ["home", "/", "/"],
    ["marketplace", "/marketplace", "/marketplace"],
    ["details", "/models/aperture-x2", "/model/1"],
    ["upload", "/upload", "/upload-model"],
    ["dashboard", "/dashboard", "/dashboard"],
    ["activity", "/activity", "/activity"],
    ["login", "/login", "/login"],
    ["profile", "/profile", "/profile"],
  ];
  const measurements = [];
  for (const width of [1440, 1024, 768, 390, 320]) {
    await actual.setViewportSize({ width, height: 1000 });
    await original.setViewportSize({ width, height: 1000 });
    for (const [name, refRoute, appRoute] of routes) {
      await original.goto(reference + refRoute);
      await original
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await original.locator("h1").first().waitFor();
      await actual.goto(integrated + appRoute);
      await actual.locator("h1").first().waitFor();
      if (["home", "marketplace"].includes(name))
        await actual.locator(".model-card").first().waitFor();
      if (name === "details")
        await actual
          .getByRole("heading", { name: "Model 1", exact: true })
          .waitFor();
      if (name === "dashboard")
        await actual.locator(".dashboard-model").first().waitFor();
      if (["activity", "details"].includes(name))
        await actual
          .getByText("All available contract history loaded.", { exact: true })
          .waitFor();
      await Promise.all([
        actual.evaluate(() => document.fonts.ready),
        original.evaluate(() => document.fonts.ready),
      ]);
      for (const [kind, page] of [
        ["original", original],
        ["integrated", actual],
      ]) {
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        );
        if (kind === "integrated")
          assert.ok(fits, `${kind} ${name} overflow at ${width}`);
        else if (!fits)
          measurements.push({ width, page: name, referenceOverflow: true });
        await page.screenshot({
          path: resolve(output, `${kind}-${name}-${width}.png`),
          fullPage: true,
        });
      }
      if (name === "home") {
        assert.equal(
          await actual.locator("main.home-page > section").count(),
          3
        );
        measurements.push({
          width,
          original: await original
            .locator("h1")
            .first()
            .evaluate((node) => ({
              font: getComputedStyle(node).fontSize,
              x: node.getBoundingClientRect().x,
              y: node.getBoundingClientRect().y,
            })),
          integrated: await actual
            .locator("h1")
            .first()
            .evaluate((node) => ({
              font: getComputedStyle(node).fontSize,
              x: node.getBoundingClientRect().x,
              y: node.getBoundingClientRect().y,
            })),
        });
      }
      const pair = await context.newPage();
      const images = await Promise.all(
        ["original", "integrated"].map((kind) =>
          readFile(resolve(output, `${kind}-${name}-${width}.png`))
        )
      );
      await pair.setViewportSize({ width: width * 2, height: 1000 });
      await pair.setContent(
        `<style>*{box-sizing:border-box}body{margin:0;display:flex}figure{margin:0;width:${width}px}figcaption{height:32px;background:#fff;font:14px sans-serif;padding:6px}img{display:block;width:100%}</style><figure><figcaption>ORIGINAL V3 REFERENCE</figcaption><img src="data:image/png;base64,${images[0].toString(
          "base64"
        )}"></figure><figure><figcaption>INTEGRATED — READ-ONLY FIXTURE</figcaption><img src="data:image/png;base64,${images[1].toString(
          "base64"
        )}"></figure>`
      );
      await pair.screenshot({
        path: resolve(output, `comparison-${name}-${width}.png`),
        fullPage: true,
      });
      await pair.close();
    }
  }
  assert.equal(writes, 0);
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(output, "measurements.json"),
    JSON.stringify(measurements, null, 2)
  );
  console.log(
    "PASS: original/integrated paired Chrome screenshots across eight reference pages and five widths; no writes or page errors. Signup has no separate page in the supplied reference."
  );
  console.log("Visual artifacts: " + output);
  console.log(JSON.stringify(measurements));
} finally {
  await browser?.close();
  child.kill("SIGTERM");
}
