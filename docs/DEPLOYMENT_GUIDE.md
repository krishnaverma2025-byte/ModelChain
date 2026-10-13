# Deployment guide — free-tier Sepolia test

[Documentation home](../README.md) · [Public testnet runbook](../PUBLIC_TESTNET_RUNBOOK.md)

This guide explains setup; the existing runbook retains operational release gates, policy checks and persistence acceptance. Its historical “first deployment” wording is a checklist for a new release, not a claim that no public deployment exists. Do not deploy again merely to use the current demo. No transaction is authorized by this document.

## Prerequisites and fresh clone

Use Node **22** and npm, Git, MetaMask, a dedicated Sepolia deployer with free test ETH, and accounts on Alchemy, Pinata, Supabase, Render and Vercel. Prefer free plans for this academic test; check each provider's current limits. Keep platform/deployer, creator and buyer accounts distinct where possible.

```sh
git clone https://github.com/krishnaverma2025-byte/ModelChain.git
cd ModelChain
git fetch origin main
git switch main
git pull --ff-only origin main
git switch -c deployment/my-sepolia-release
node --version
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run compile
npm test
npx tsc --noEmit
npm test --prefix backend
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run security:scan -- --history
```

Start from a clean checkout; preserve existing changes before switching branches. Do not force-push or overwrite teammates' work. For full release checks, use the runbook, including local E2E and dependency audits. Do not modify production dependencies to publish docs. Use [LOCAL_RUNBOOK.md](../LOCAL_RUNBOOK.md) for local environment and Hardhat node setup.

## Secrets and configuration files

**NEVER commit secrets, put them in `VITE_*`, paste them into chat, or capture them in logs/screenshots.** All `VITE_*` values become public JavaScript. The tables below contain placeholders only. Compare [.env.example](../.env.example), [backend example](../backend/.env.example), [backend production example](../backend/.env.production.example) and [frontend example](../frontend/.env.example) before setup.

Ignored local files can be created with:

```sh
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill them privately. Backend `npm start` supports an optional `.env`; Hardhat does **not** automatically load the root `.env`. Supply deployment variables through a secure process environment. For Node 22 env-file loading, the commands below use `NODE_OPTIONS='--env-file=.env'` from the repository root. Do not enable shell tracing or print environment contents.

### Root / Hardhat environment

| Variable | Value / handling |
| --- | --- |
| `SEPOLIA_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/<SERVER_RPC_KEY>`; private deployment RPC |
| `SEPOLIA_PRIVATE_KEY` | `<DEDICATED_DEPLOYER_PRIVATE_KEY>`; deployment process only |
| `MONTAI_DEPLOY_DRY_RUN` | `1` for no-transaction preflight |
| `MONTAI_ALLOW_TESTNET_DEPLOYMENT` | `sepolia` only for explicitly approved real deployment |

Never use publicly known Hardhat fixture keys on Sepolia. Deployer becomes the immutable platform revenue recipient; confirm the address and chain before proceeding.

## Provider preparation

1. Create an Alchemy **Ethereum Sepolia** app. Use a server RPC credential for deployment/backend and a separate browser RPC key for the frontend. Restrict the browser app appropriately; its URL is public. Browser-origin restrictions can block server requests.
2. Create a backend Pinata JWT with **V3 Files WRITE**. The code uploads to `https://uploads.pinata.cloud/v3/files` with public network ciphertext. Confirm the HTTPS gateway serves ciphertext CIDs; never upload plaintext or keys.
3. Create Supabase Storage bucket **`montai-private-records`**, **Public OFF**. Audit `storage.objects` policies so anonymous and ordinary authenticated users cannot read/write this bucket. Private flag alone does not defeat permissive RLS. Use backend service-role credentials only; test denial against a known object. Do not expose signed URLs to protected records.
4. Generate a fresh random 32-byte `MODEL_MASTER_KEY` privately (exactly 64 hexadecimal characters) using a trusted credential generator. Store it securely with a separate backup. This same key must survive every restart, redeploy and rollback; changing it breaks old wrapped file keys.
5. Reserve the Vercel domain so the backend can use the exact canonical HTTPS origin. New deployments will have their own URLs; do not copy the current domain blindly.

## Safe preflight and explicit contract deployment

From the root, after privately filling the ignored root `.env`:

```sh
NODE_OPTIONS='--env-file=.env' MONTAI_DEPLOY_DRY_RUN=1 npx hardhat run scripts/deploy.ts --network sepolia
```

It checks the network/deployer and prints public address/balance without submitting a transaction. The script rejects unsupported networks and known Hardhat accounts. Ensure the dry-run flag is absent from the actual deployment environment. **Only after explicit human approval of the transaction**, run:

```sh
NODE_OPTIONS='--env-file=.env' MONTAI_ALLOW_TESTNET_DEPLOYMENT=sepolia npx hardhat run scripts/deploy.ts --network sepolia
```

Wait for the receipt; record contract address, transaction hash, block and platform address. Verify successful Sepolia receipt and nonempty bytecode. Do not auto-retry failures. A new contract creates a new registry; old models/licenses do not migrate automatically.

## Render backend

Create a Free Node web service from the repository with root **`backend`**, build **`npm ci`**, start **`npm start`**, health check **`/health`**. Set Node 22 (`NODE_VERSION=22`). Let Render inject `PORT`; do not set local `PORT=4000`.

| Variable | Current deployment setting / placeholder |
| --- | --- |
| `NODE_VERSION` | `22` (hosting setting) |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/<SERVER_RPC_KEY>` |
| `CHAIN_ID` | `11155111` |
| `CONTRACT_ADDRESS` | `0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e` (replace for a new deployment) |
| `CLIENT_ORIGIN` | `https://montai-six.vercel.app` (exact canonical frontend origin) |
| `MODEL_MASTER_KEY` | `<STABLE_64_HEX_MASTER_KEY>`; private and backed up |
| `PINATA_JWT` | `<BACKEND_PINATA_JWT>` |
| `IPFS_GATEWAY` | `https://gateway.pinata.cloud/ipfs` or verified HTTPS gateway |
| `SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `<BACKEND_SERVICE_ROLE_KEY>` |
| `SUPABASE_RECORD_BUCKET` | `montai-private-records` |
| `DATA_DIR` | Optional `./data`; disposable ciphertext cache in production |
| `PORT` | Render-injected; omit manual override |

Do **not** put `SEPOLIA_PRIVATE_KEY` in Render runtime. Backend reads the chain and never needs a deployer signing key. Successful startup checks configuration → rpc-network → contract-bytecode → production-urls → supabase-private-bucket → storage-initialization → server-listen. See [troubleshooting](TROUBLESHOOTING.md) for safe diagnostics. `/health` must match the configured chain/address; perform real storage and download acceptance too.

## Vercel frontend

Create a Hobby Vercel project with root **`frontend`**, framework **Vite**, Node **22**, install **`npm ci`**, build **`npm run build`**, output **`dist`**. The existing `frontend/vercel.json` rewrites SPA routes. Enter public frontend values using configuration fields that allow the build to access them; if the deployment interface distinguishes **Config** from **Secret**, recreate public Vite settings as Config when required by that interface. Never move backend secrets there.

| Variable | Current deployment setting / placeholder |
| --- | --- |
| `VITE_RPC_URL` | `https://eth-sepolia.g.alchemy.com/v2/<PUBLIC_BROWSER_RPC_KEY>` |
| `VITE_CHAIN_ID` | `11155111` |
| `VITE_CONTRACT_ADDRESS` | `0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e` |
| `VITE_DEPLOYMENT_BLOCK` | `11907790` |
| `VITE_API_URL` | `https://montai-api.onrender.com` |
| `VITE_SUPABASE_URL` | Optional `https://<PROJECT_REF>.supabase.co` for profiles |
| `VITE_SUPABASE_ANON_KEY` | Optional `<PUBLIC_ANON_KEY>` for profiles; never service role |

The browser RPC key is public despite a provider calling it an API key; restrict it. Build-time secret guards are extra protection, not permission to put secrets in frontend settings. Redeploy after changing any `VITE_*` variable, including RPC key rotations. For optional profiles, configure Supabase Auth Site URL to the canonical frontend origin and exact `/profile` and `/login` redirects, Google provider/callback and appropriate profile RLS separately.

## Recorded public deployment and final acceptance

Current website: https://montai-six.vercel.app; API: https://montai-api.onrender.com; health: https://montai-api.onrender.com/health. Network: Sepolia `11155111`; contract: `0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e`; block: `11907790`; deployment transaction: `0x0008dfc1e032112a0fa6f988a7b35f1b1e198210abd89e33334cc9c43ba85fd7`.

Verify HTTPS, health, CORS, deep links `/marketplace`, `/dashboard`, `/upload`, `/activity`, and a real `/model/<id>`. Complete [demo acceptance](DEMO_AND_TESTING_GUIDE.md), especially unlicensed denial and download after a backend restart with no cache. Keep chain/address/bucket/master key unchanged on compatible redeploys. Frontend/backend can be updated normally; the current immutable contract requires a new deployment for contract changes.

Provider references: [Render web services](https://render.com/docs/web-services), [Render free limits](https://render.com/docs/free), [Vercel Vite](https://vercel.com/docs/frameworks/frontend/vite), [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [Alchemy allowlists](https://www.alchemy.com/docs/how-to-add-allowlists-to-your-apps-for-enhanced-security).
