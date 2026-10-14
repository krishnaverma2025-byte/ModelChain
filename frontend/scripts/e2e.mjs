// Isolated local integration test. Never uses a funded wallet or public network.
import { chromium } from "@playwright/test";
import { ContractFactory, JsonRpcProvider } from "ethers";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const processes = [];
const temporary = await mkdtemp(resolve(tmpdir(), "montai-e2e-"));
const rpc = "http://127.0.0.1:18545",
  origin = "http://127.0.0.1:15173",
  api = "http://127.0.0.1:14000";
let browser;
function start(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));
  child.on("error", (error) => (output += error.message));
  processes.push(child);
  return () => output;
}
async function ready(url, log) {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Service not ready: ${url}\n${log()}`);
}
try {
  const nodeLog = start(
    resolve(root, "node_modules/.bin/hardhat"),
    ["node", "--port", "18545"],
    root,
  );
  await ready(rpc, nodeLog);
  const provider = new JsonRpcProvider(rpc);
  const creator = await provider.getSigner(0),
    buyer = await provider.getSigner(1),
    buyer3 = await provider.getSigner(2),
    buyer4 = await provider.getSigner(3);
  const nonce = await provider.send("eth_getTransactionCount", [
    await creator.getAddress(),
    "latest",
  ]);
  execFileSync(
    resolve(root, "node_modules/.bin/hardhat"),
    ["run", "scripts/deploy.ts", "--network", "localhost"],
    {
      cwd: root,
      env: { ...process.env, RPC_URL: rpc, MONTAI_DEPLOY_DRY_RUN: "1" },
      stdio: "pipe",
    },
  );
  assert.equal(
    await provider.send("eth_getTransactionCount", [
      await creator.getAddress(),
      "latest",
    ]),
    nonce,
    "Deployment preflight sent a transaction",
  );
  const artifact = JSON.parse(
    await readFile(
      resolve(root, "artifacts/contracts/ModelChain.sol/ModelChain.json"),
      "utf8",
    ),
  );
  const contract = await new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    creator,
  ).deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const apiLog = start(
    process.execPath,
    ["src/server.js"],
    resolve(root, "backend"),
    {
      RPC_URL: rpc,
      CHAIN_ID: "31337",
      CONTRACT_ADDRESS: address,
      CLIENT_ORIGIN: origin,
      MODEL_MASTER_KEY: randomBytes(32).toString("hex"),
      DATA_DIR: temporary,
      PORT: "14000",
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      PINATA_JWT: "",
    },
  );
  await ready(api + "/health", apiLog);
  const viteLog = start(
    resolve(root, "frontend/node_modules/.bin/vite"),
    ["--host", "127.0.0.1", "--port", "15173", "--strictPort"],
    resolve(root, "frontend"),
    {
      VITE_RPC_URL: rpc,
      VITE_CHAIN_ID: "31337",
      VITE_CONTRACT_ADDRESS: address,
      VITE_API_URL: api,
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
  );
  await ready(origin, viteLog);
  browser = await chromium.launch(
    process.env.MONTAI_TEST_BROWSER === "chrome" ? { channel: "chrome" } : {},
  );
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (/same key/.test(message.text())) errors.push(message.text());
  });
  let account = await creator.getAddress(),
    wrongNetwork = false,
    reject = false,
    rejectMethod = "",
    switchDuringSign = false,
    connectEvent = false;
  const purchases = [];
  let authRequests = 0;
  let transactionRequests = 0;
  let uploadRequests = 0;
  let cleanupRequests = 0, lastUpload;
  page.on("request", (request) => {
    if (request.url() === api + "/api/uploads" && request.method() === "POST")
      uploadRequests++;
    if(request.method()==='DELETE' && request.url().startsWith(api+'/api/uploads/')) cleanupRequests++;
  });
  page.on('response',async response=>{if(response.url()===api+'/api/uploads' && response.status()===201) lastUpload=await response.json();});
  await page.exposeFunction("walletRpc", async ({ method, params = [] }) => {
    if (method === "eth_sendTransaction") transactionRequests++;
    if (
      (reject &&
        [
          "eth_requestAccounts",
          "personal_sign",
          "eth_sendTransaction",
        ].includes(method)) ||
      method === rejectMethod
    )
      return { walletError: true };
    if (method === "eth_accounts" || method === "eth_requestAccounts") {
      if (method === "eth_requestAccounts" && connectEvent) {
        connectEvent = false;
        await page.evaluate(
          (value) => window.emitWalletEvent("accountsChanged", [value]),
          account,
        );
      }
      return [account];
    }
    if (method === "eth_chainId") return wrongNetwork ? "0x1" : "0x7a69";
    if (method === "personal_sign") {
      authRequests++;
      const signature = await provider.send("eth_sign", [params[1], params[0]]);
      if (switchDuringSign) {
        account = await buyer4.getAddress();
        await page.evaluate(
          (value) => window.emitWalletEvent("accountsChanged", [value]),
          account,
        );
      }
      return signature;
    }
    if (
      method === "eth_sendTransaction" &&
      params[0].data?.startsWith("0xc8a028a8")
    )
      purchases.push(params[0].from.toLowerCase());
    const result=await provider.send(method, params);
    if(method==='eth_sendTransaction') await page.evaluate(value=>{
      window.emitWalletEvent('accountsChanged',[value]);
      window.emitWalletEvent('chainChanged','0x7a69');
    },account);
    return result;
  });
  async function signIn() {
    await page.waitForFunction(async()=>!(await import('/src/walletSession.mjs')).walletSession.snapshot().restoring);
    if(await page.locator('.wallet-status').getByRole('button',{name:/●/}).count()) return;
    await page
      .getByRole("button", { name: "Sign in with MetaMask", exact: true })
      .click();
    try {
      await page
        .locator(".wallet-status")
        .getByRole("button", { name: /●/ })
        .waitFor();
    } catch (error) {
      console.error(
        "Wallet sign-in UI:",
        await page.locator(".auth-prerequisite").innerText(),
      );
      throw error;
    }
  }
  async function respectApiBudget(minimum = 30) {
    const response = await fetch(api + "/api/models/1/metadata");
    if (response.status===429) {
      await page.waitForTimeout(Number(response.headers.get('retry-after') || minimum)*1000+100);
    }
  }
  await page.addInitScript(() => {
    const listeners = {};
    window.ethereum = {
      request: async (args) => {
        const result = await window.walletRpc(args);
        if (result?.walletError)
          throw Object.assign(new Error("User rejected request"), {
            code: 4001,
          });
        return result;
      },
      on: (name, fn) => (listeners[name] ??= []).push(fn),
      removeListener: (name, fn) =>
        (listeners[name] = (listeners[name] || []).filter((f) => f !== fn)),
    };
    window.emitWalletEvent = (name, value) =>
      (listeners[name] || []).forEach((fn) => fn(value));
  });
  await page.goto(origin + "/marketplace");
  await page.getByRole("heading", { name: "No models available" }).waitFor();
  await page.goto(origin + "/activity");
  await page.getByText("No events in this block range.").waitFor();
  await page.goto(origin + "/upload");
  assert.equal(
    await page
      .getByRole("button", { name: "Register Model", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    transactionRequests,
    0,
    "Signed-out upload requested a transaction",
  );
  const blocked = await page.evaluate(async () => {
    const { wallet, purchaseModelLicense } = await import("/src/blockchain.js");
    const errors = [];
    for (const action of [wallet, () => purchaseModelLicense(1)]) {
      try {
        await action();
        errors.push("unexpected access");
      } catch (e) {
        errors.push(e.message);
      }
    }
    return errors;
  });
  assert.ok(blocked.every((message) => /Sign in/.test(message)));
  assert.equal(
    transactionRequests,
    0,
    "Signed-out action guard reached MetaMask",
  );
  await signIn();
  await page.getByPlaceholder("Enter model name").fill("Verified vision model");
  await page
    .getByPlaceholder("Describe your AI model")
    .fill("Encrypted integration test model");
  const bytes = Buffer.from(
    "MontAI original model bytes for integrity verification",
  );
  await page.locator("input[type=file]").setInputFiles({
    name: "vision.onnx",
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  rejectMethod = "eth_sendTransaction";
  await page
    .getByRole("button", { name: "Register Model", exact: true })
    .click();
  await page
    .getByText(/Request rejected in MetaMask/)
    .first()
    .waitFor();
  assert.equal(uploadRequests, 1);
  assert.equal(cleanupRequests,1,'Rejected pre-broadcast registration must compensate its upload exactly once');
  assert.equal((await fetch(`${api}/api/models/1/metadata`)).status,404);
  await assert.rejects(readFile(resolve(temporary,`31337-${address.toLowerCase()}`,lastUpload.cid+'.json')),{code:'ENOENT'});
  await page.route(api+'/api/uploads/*',route=>route.request().method()==='DELETE'?route.fulfill({status:503,contentType:'application/json',body:'{"error":"Cleanup unavailable"}'}):route.continue());
  await page.getByRole('button',{name:'Register Model',exact:true}).click();
  await page.getByText(/Upload cleanup could not be completed/).waitFor();
  assert.equal(cleanupRequests,2,'Cleanup failure must not cause automatic deletion retries');
  const failedCleanupCid=lastUpload.cid;
  await page.unroute(api+'/api/uploads/*');
  rejectMethod = "";
  await page
    .getByRole("button", { name: "Register Model", exact: true })
    .click();
  await page.waitForURL("**/model/1", { timeout: 30000 });
  await page
    .getByRole("button", { name: "You own this model", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "You own this model", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(await contract.getModelCount(), 1n);
  assert.equal(
    uploadRequests,
    3,
    "Registration retry must replace the compensated encrypted upload",
  );
  assert.notEqual((await contract.getModel(1)).cid,failedCleanupCid,'Never register a CID after a possibly partial cleanup');
  assert.equal(cleanupRequests,2,'Successful registration must not request cleanup');
  // Logout clears role/access/session evidence but preserves public creator facts.
  await page
    .locator(".wallet-status")
    .getByRole("button", { name: /●/ })
    .click();
  await page
    .getByRole("button", { name: "Disconnect wallet", exact: true })
    .click();
  await page
    .getByText("Sign in to check license status.", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "License Model", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Download licensed model", exact: true })
      .count(),
    0,
  );
  assert.equal(await page.getByText("CREATOR", { exact: true }).count(), 0);
  assert.ok(
    await page
      .getByRole("button", {
        name: "Copy creator: " + (await creator.getAddress()),
        exact: true,
      })
      .count(),
  );
  const signedOutTx = transactionRequests;
  await page.getByRole("button", { name: "Trace Model", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText("Not authenticated", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  assert.equal(transactionRequests, signedOutTx);
  const inspectionNonce = await provider.send("eth_getTransactionCount", [
    await creator.getAddress(),
    "latest",
  ]);
  execFileSync(
    resolve(root, "node_modules/.bin/hardhat"),
    ["run", "scripts/interact.ts", "--network", "localhost"],
    {
      cwd: root,
      env: {
        ...process.env,
        RPC_URL: rpc,
        CONTRACT_ADDRESS: address,
        MODEL_ID: "1",
      },
      stdio: "pipe",
    },
  );
  assert.equal(
    await provider.send("eth_getTransactionCount", [
      await creator.getAddress(),
      "latest",
    ]),
    inspectionNonce,
    "Local inspection utility sent a transaction",
  );
  account = await buyer.getAddress();
  await page.evaluate(
    (value) => window.emitWalletEvent("accountsChanged", [value]),
    account,
  );
  await signIn();
  await page
    .getByRole("button", { name: "License Model", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Download licensed model" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /license is required/i })
    .waitFor();
  connectEvent = true;
  await page
    .getByRole("button", { name: "License Model", exact: true })
    .click();
  await page
    .getByRole("button", { name: /License Owned/ })
    .waitFor({ timeout: 30000 });
  assert.equal(await contract.hasLicense(1, account), true);
  const signaturesBeforeReload=authRequests;
  await page.reload();
  await page.getByRole("button", { name: /License Owned/ }).waitFor();
  assert.equal(authRequests,signaturesBeforeReload,'Valid reload unnecessarily requested a signature');
  assert.equal(await page.locator('.wallet-status').getByRole('button',{name:/●/}).count(),1);
  await page.evaluate(value=>{window.emitWalletEvent('accountsChanged',[value]);window.emitWalletEvent('chainChanged','0x7a69');},account);
  assert.equal(await page.locator('.wallet-status').getByRole('button',{name:/●/}).count(),1);
  await page.route(api+'/api/auth/session',route=>route.request().method()==='GET'?route.fulfill({status:401,contentType:'application/json',body:'{"error":"expired"}'}):route.continue());
  await page.reload();
  await page.getByText('Sign in to check license status.',{exact:true}).waitFor();
  await page.waitForFunction(()=>!sessionStorage.getItem('montai.wallet-session.v1'));
  await page.unroute(api+'/api/auth/session');
  await signIn();
  await page.evaluate(()=>window.emitWalletEvent('disconnect',{code:4900}));
  await page.getByText('Sign in to check license status.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('montai.wallet-session.v1')),null);
  await signIn();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download licensed model" }).click();
  const download = await downloadPromise;
  assert.deepEqual(await readFile(await download.path()), bytes);
  // Two independent buyers, fourth-account denial, and A2 → A3 → A2 propagation.
  account = await buyer3.getAddress();
  await page.evaluate(
    (value) => window.emitWalletEvent("accountsChanged", [value]),
    account,
  );
  await signIn();
  await page
    .getByRole("button", { name: "License Model", exact: true })
    .waitFor();
  assert.equal(await contract.hasLicense(1, account), false);
  await page.getByRole("button", { name: "Download licensed model" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /license is required/ })
    .waitFor();
  rejectMethod = "eth_sendTransaction";
  await page
    .getByRole("button", { name: "License Model", exact: true })
    .click();
  await page.getByText(/Request rejected in MetaMask/).waitFor();
  rejectMethod = "";
  const authBeforePurchase = authRequests;
  await page
    .getByRole("button", { name: "License Model", exact: true })
    .click();
  await page.getByRole("button", { name: /License Owned/ }).waitFor();
  assert.equal(
    authRequests,
    authBeforePurchase,
    "Purchase unexpectedly requested authentication signature",
  );
  assert.equal(await contract.hasLicense(1, account), true);
  assert.deepEqual(purchases, [
    (await buyer.getAddress()).toLowerCase(),
    (await buyer3.getAddress()).toLowerCase(),
  ]);
  const thirdDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download licensed model" }).click();
  assert.deepEqual(await readFile(await (await thirdDownload).path()), bytes);
  // Authentication signatures, not downloads, are the login boundary.
  await page
    .locator(".wallet-status")
    .getByRole("button", { name: /●/ })
    .click();
  await page
    .getByRole("button", { name: "Disconnect wallet", exact: true })
    .click();
  rejectMethod = "personal_sign";
  await page
    .getByRole("button", { name: "Sign in with MetaMask", exact: true })
    .click();
  await page
    .getByText(/Request rejected in MetaMask/)
    .first()
    .waitFor();
  rejectMethod = "";
  switchDuringSign = true;
  await page
    .getByRole("button", { name: "Sign in with MetaMask", exact: true })
    .click();
  await page
    .getByText(/Wallet changed during this request/)
    .first()
    .waitFor();
  await page
    .getByText("Sign in to check license status.", { exact: true })
    .waitFor();
  switchDuringSign = false;
  assert.equal(await contract.hasLicense(1, account), false);
  assert.equal(await page.locator(".session-timeline li").count(), 0);
  await page
    .getByText("Not verified in this session", { exact: true })
    .waitFor();
  await signIn();
  await page.getByRole("button", { name: "Download licensed model" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /license is required/ })
    .waitFor();
  for (const signer of [buyer, buyer3]) {
    account = await signer.getAddress();
    await page.evaluate(
      (value) => window.emitWalletEvent("accountsChanged", [value]),
      account,
    );
    await signIn();
    await page.getByRole("button", { name: /License Owned/ }).waitFor();
  }
  await respectApiBudget();
  const recoveredDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download licensed model" }).click();
  assert.deepEqual(
    await readFile(await (await recoveredDownload).path()),
    bytes,
  );
  // Provenance must use real logs and current-session observations only.
  await page.getByText("Model Registered", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Trace Model", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert.equal(
    await page
      .getByRole("dialog")
      .getByRole("button", { name: `Copy contract: ${address}`, exact: true })
      .count(),
    1,
  );
  assert.ok(
    (await page.getByRole("dialog").innerText()).includes("Integrity verified"),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Trace Model" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.goto(origin + "/activity");
  await page.getByRole("heading", { name: "Network Activity" }).waitFor();
  await page.getByText("License Purchased", { exact: true }).first().waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Explorer", exact: true }).count(),
    0,
  );
  await page
    .getByText("Creator Revenue Accrued", { exact: true })
    .first()
    .waitFor();
  // Discovery uses real registered listings, query navigation, and explicit empty states.
  await respectApiBudget();
  await page.goto(origin + "/");
  await page.locator(".model-card").waitFor();
  assert.equal(await page.locator(".model-card").count(), 1);
  await page.getByLabel("Find your next model").fill("Verified vision");
  await page.getByRole("button", { name: "Search models" }).click();
  await page.waitForURL("**/marketplace?q=Verified+vision");
  await page.locator(".model-card").waitFor();
  assert.equal(await page.locator(".model-card").count(), 1);
  assert.equal(await page.locator(".model-card details").count(), 0);
  await page
    .getByRole("button", { name: "Generative AI", exact: true })
    .click();
  await page.getByRole("heading", { name: "No models available" }).waitFor();
  await page
    .getByRole("button", { name: "Computer Vision", exact: true })
    .click();
  await page.locator(".model-card").waitFor();
  assert.equal(await page.locator(".verified-registration").count(), 1);
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "",
      "marketplace",
      "model/1",
      "activity",
      "dashboard",
      "upload",
      "login",
      "signup",
      "profile",
    ]) {
      await page.goto(origin + "/" + route);
      await page.waitForTimeout(400);
      if (["", "marketplace"].includes(route)) {
        await page.locator(".model-card").waitFor();
        const columns = await page
          .locator(".models-grid")
          .evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(" ").length,
          );
        assert.equal(columns, width > 1024 ? 3 : width > 600 ? 2 : 1);
        if (!route)
          assert.match(
            await page.locator("h1").innerText(),
            /license\s+verified/,
          );
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `Overflow: ${route} at ${width}`,
      );
      await page.screenshot({
        path: resolve(
          temporary,
          `ui-${route.replace("/", "-") || "home"}-${width}.png`,
        ),
        fullPage: true,
      });
      if (route === "model/1") {
        await page.getByRole("button", { name: "Trace Model" }).click();
        await page.getByRole("dialog").waitFor();
        assert.ok(
          (await page.getByRole("dialog").innerText()).includes(
            "Not verified in this session",
          ),
        );
        await page.screenshot({
          path: resolve(temporary, `ui-trace-${width}.png`),
          fullPage: true,
        });
        await page.keyboard.press("Escape");
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // The visual matrix deliberately reloads many routes. Respect the real API
  // limiter instead of weakening production protection for a synthetic burst.
  await respectApiBudget(40);
  await page.goto(origin + "/model/1");
  await signIn();
  await page.getByRole("button", { name: /License Owned/ }).waitFor();
  // Fixture-only profile checks mismatch and unified logout, without live profile writes.
  await page.evaluate(
    async (linked) => {
      const { walletSession } = await import("/src/walletSession.mjs");
      walletSession.profile({
        id: "profile-fixture",
        email: "fixture@example.invalid",
        user_metadata: {
          full_name: "Fixture profile",
          linked_wallet_address: linked,
        },
      });
    },
    await creator.getAddress(),
  );
  await page
    .getByRole("heading", { name: "Wallet mismatch", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "License Model", exact: true })
      .count(),
    0,
  );
  const mismatchTx = transactionRequests;
  account = await creator.getAddress();
  await page.evaluate(
    (value) => window.emitWalletEvent("accountsChanged", [value]),
    account,
  );
  await signIn();
  await page
    .getByRole("button", { name: "You own this model", exact: true })
    .waitFor();
  assert.equal(
    transactionRequests,
    mismatchTx,
    "Profile/mismatch login sent a transaction",
  );
  await page
    .getByRole("button", { name: "Fixture profile ▾", exact: true })
    .click();
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await page.getByRole("link", { name: "Sign in", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Fixture profile ▾", exact: true })
      .count(),
    0,
  );
  account = await buyer3.getAddress();
  await page.goto(origin + "/model/1");
  await page
    .getByText("Sign in to check license status.", { exact: true })
    .waitFor();
  await signIn();
  await page.getByRole("button", { name: /License Owned/ }).waitFor();
  await page.locator(".model-access input[type=file]").setInputFiles({
    name: "tampered.onnx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("tampered"),
  });
  await page
    .getByRole("status")
    .filter({ hasText: /verification failed/ })
    .waitFor();
  await page.screenshot({
    path: resolve(temporary, "details-desktop.png"),
    fullPage: true,
  });
  await page.goto(origin + "/dashboard");
  await signIn();
  await page.getByRole("link", { name: "Access & verify →" }).waitFor();
  wrongNetwork=true;
  await page.evaluate(() => window.emitWalletEvent("chainChanged", "0x1"));
  await page
    .getByRole("button", { name: "Switch network", exact: true })
    .last()
    .waitFor();
  await page.goto(origin + "/marketplace");
  await page.getByText("Verified vision model", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(temporary, "marketplace-mobile.png"),
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile page overflows",
  );
  assert.ok(
    await page.evaluate(
      () =>
        document.querySelector(".marketplace-page").getBoundingClientRect()
          .top >=
        document.querySelector(".navbar").getBoundingClientRect().bottom,
    ),
    "Mobile navbar overlaps the page",
  );
  wrongNetwork=false;
  account = await creator.getAddress();
  await page.goto(origin + "/dashboard");
  await signIn();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes("0.0 ETH"));
  assert.equal(await contract.pendingWithdrawals(account), 0n);
  await page.getByRole("button", { name: "Deactivate", exact: true }).click();
  await page.getByRole("button", { name: "Reactivate", exact: true }).waitFor();
  assert.equal((await contract.getModel(1)).active, false);
  wrongNetwork = true;
  await page.goto(origin + "/upload");
  await page.getByPlaceholder("Enter model name").fill("Wrong network");
  await page.locator("input[type=file]").setInputFiles({
    name: "model.bin",
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  assert.equal(
    await page
      .getByRole("button", { name: "Register Model", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Switch network", exact: true })
    .last()
    .waitFor();
  wrongNetwork = false;
  await page.evaluate(() => window.emitWalletEvent("chainChanged", "0x7a69"));
  reject = true;
  await page
    .getByRole("button", { name: "Sign in with MetaMask", exact: true })
    .click();
  await page.getByText(/rejected/i).waitFor();
  assert.equal(await contract.getModelCount(), 1n);
  reject = false;
  await page.evaluate(() => {
    delete window.ethereum;
  });
  await page
    .getByRole("button", { name: "Sign in with MetaMask", exact: true })
    .click();
  await page
    .getByText("Install MetaMask to continue.", { exact: true })
    .waitFor();
  await page.goto(origin + "/model/0");
  await page.getByRole("heading", { name: "Model Not Found" }).waitFor();
  await page.goto(origin + "/login");
  await page.getByRole("heading", { name: "Sign in to MontAI" }).waitFor();
  assert.deepEqual(errors, []);
  const mobileContext=await browser.newContext({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile',isMobile:true,viewport:{width:390,height:844}});
  const mobile=await mobileContext.newPage();
  await mobile.goto(origin+'/login');
  const handoff=mobile.locator('.auth-prerequisite').getByRole('link',{name:'Open MontAI in MetaMask',exact:true});
  await handoff.waitFor();
  assert.equal(await handoff.getAttribute('href'),'https://metamask.app.link/dapp/montai-six.vercel.app/');
  assert.equal(mobile.url(),origin+'/login','Mobile wallet handoff must not redirect automatically');
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile handoff must not overflow');
  assert.ok(await mobile.evaluate(()=>document.querySelector('.auth-page').getBoundingClientRect().top>=document.querySelector('.navbar').getBoundingClientRect().bottom),'Mobile handoff navbar must not overlap content');
  await mobile.screenshot({path:resolve(temporary,'mobile-metamask-handoff.png'),fullPage:true});
  await mobile.addInitScript(()=>{window.ethereum={request:async({method})=>method==='eth_accounts'?[]:'0x7a69',on:()=>{},removeListener:()=>{}};});
  await mobile.reload();
  await mobile.getByRole('heading',{name:'Sign in to MontAI',exact:true}).waitFor();
  assert.equal(await mobile.getByRole('link',{name:'Open MontAI in MetaMask',exact:true}).count(),0);
  await mobileContext.close();
  // A read outage must be explicit, recoverable and never look like empty history.
  await page.route(rpc, (route) => route.abort());
  await page.goto(origin + "/activity");
  await page.getByRole("button", { name: "Retry history" }).waitFor();
  assert.equal(
    await page.getByText("No events in this block range.").count(),
    0,
  );
  await page.unroute(rpc);
  await page.getByRole("button", { name: "Retry history" }).click();
  await page.getByText("Model Registered", { exact: true }).waitFor();
  assert.doesNotMatch(
    nodeLog(),
    /unrecognized-selector|StackUnderflow/,
    "MontAI integration generated suspicious contract calls",
  );
  console.log(
    "PASS: reload restoration/backend rejection/disconnect; duplicate wallet events during all transaction types; rejected-upload compensation; mobile handoff without redirects; provenance and desktop/tablet/mobile routes; purchases and verified downloads; unlicensed denial; account/signature switching; dashboard; withdrawal; deactivation; tamper detection; wrong network; no wallet; invalid ID.",
  );
  console.log(`Screenshots and isolated encrypted test data: ${temporary}`);
  await provider.destroy();
  if (process.env.MONTAI_REVIEW === "1") {
    console.log(
      "Isolated review services remain on 15173 / 14000 / 18545. Stop this command with Ctrl+C after review.",
    );
    await new Promise(() => {});
  }
} finally {
  await browser?.close();
  for (const child of processes.reverse()) child.kill("SIGTERM");
}
