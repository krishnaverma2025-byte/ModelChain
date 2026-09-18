# MontAI — Discover → License → Access → Verify

MontAI is an academic AI-model marketplace implemented with React, Ethereum smart contracts, encrypted IPFS storage and a Node.js access API. The core creator/buyer lifecycle works locally. Public deployment has not been performed.

## Implemented architecture

- **ModelChain (Solidity):** authoritative 1-based model IDs, creator, name, storage CID, original hash, price, creator-share percentage, active state and wallet licenses.
- **React + ethers:** public catalogue reads through the configured RPC; MetaMask signs registration, purchases and withdrawals with the selected wallet.
- **Node.js access API:** authenticates wallet signatures, independently checks on-chain ownership/licenses, and decrypts authorized downloads. It does not trust browser license flags.
- **Pinata V3 / IPFS:** stores only AES-256-GCM ciphertext. Public knowledge of the CID provides ciphertext, not plaintext or keys.
- **Protected backend volume:** stores ciphertext cache, description/category metadata and per-file keys wrapped by MODEL_MASTER_KEY.
- **Supabase (optional):** login, profiles and avatars only. It is not authoritative for models, prices, ownership or licenses. Core wallet E2E runs with Supabase disabled.

This is decentralized registration/licensing with a server-operated key-delivery service, not a fully decentralized access system.

## Creator flow

Connect MetaMask → choose a supported model file (maximum 25 MB) and metadata → sign a free wallet-authentication challenge → backend hashes original bytes and encrypts the file with a random per-file key → upload ciphertext to Pinata V3 → receive CID and original SHA-256 → browser confirms the original hash → register CID/hash/price/share on-chain → await the registration receipt and read its model ID → open Details.

Supported extensions are ZIP, ONNX, PT, PKL, BIN and SAFETENSORS. Files are never loaded as code or executed by the server. Rejected registrations can leave orphan encrypted uploads; they are not automatically deleted because a submitted transaction may still confirm.

## Buyer flow

Discover active blockchain models → open Details → connect MetaMask → purchase with the current signer and exact on-chain price → await the transaction receipt → verify the receipt buyer/contract and fresh hasLicense results on the wallet and configured RPC → show License Owned.

Protected download independently obtains the current signer, validates the backend chain/contract, signs a one-use challenge and verifies signature ownership. The server recovers that wallet and checks its on-chain license (or creator ownership) before retrieving/decrypting the model. The browser hashes the delivered original bytes and blocks saving a mismatch. Account/network changes invalidate pending UI work; another wallet's successful transaction cannot populate the current wallet's license state.

## Payments and listing behavior

The royalty field is the **creator share of each sale**, in whole percent. The remainder is credited to the platform, which is the deploying wallet. All received license proceeds are assigned to withdrawal balances. Withdrawals zero the balance before the external transfer and revert atomically if delivery fails.

Creators cannot purchase their own models; duplicate purchases, wrong payment, inactive sales and invalid model IDs are rejected. Creators retain download access. Deactivation prevents new sales but does not revoke existing licenses. Dashboard shows creator models, purchased licenses, and aggregate withdrawable revenue. Registrations are immutable; versions, resale royalties and legal usage rights are not separately modeled. RoyaltyPaid is a legacy event emitted when revenue is credited; RevenueWithdrawn records the actual payout.

## Local setup

Use the repository's supported Node 22 runtime and npm lockfiles. Full operational instructions are in [LOCAL_RUNBOOK.md](LOCAL_RUNBOOK.md).

1. Install dependencies: run npm ci in the root, backend and frontend directories.
2. Configure private environment files from their corresponding .env.example files. Keep the frontend/backend chain ID and contract address identical.
3. For a **new local session**, start npm run node in the root, then npm run deploy:local in another terminal. Configure the printed contract address in the backend/frontend.
4. Start npm start in backend and npm run dev in frontend. Use the frontend origin configured by CLIENT_ORIGIN.
5. Connect disposable local MetaMask accounts. Register as creator, purchase as a different buyer, then download and verify.

**When debugging an existing session, keep its node and deployment running.** Restarting the ephemeral chain removes registrations/licenses. Do not redeploy to fix wallet state. The read-only scripts/interact.ts utility requires explicit CONTRACT_ADDRESS and MODEL_ID and is restricted to local chain 31337.

Without Pinata, development uses encrypted local storage with a local- identifier. Production requires Pinata. Live V3 encrypted upload → gateway retrieval → decryption has been verified separately using the existing credential; routine tests do not repeatedly upload fixtures.

## Environment variable names

| Component | Variables |
|---|---|
| Frontend chain/access | VITE_CHAIN_ID, VITE_CONTRACT_ADDRESS, VITE_RPC_URL, VITE_API_URL |
| Optional profiles | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Backend chain | RPC_URL, CHAIN_ID, CONTRACT_ADDRESS |
| Backend access/storage | CLIENT_ORIGIN, MODEL_MASTER_KEY, PINATA_JWT, IPFS_GATEWAY, DATA_DIR |
| Backend process | HOST, PORT, NODE_ENV |
| Sepolia deployment | SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY |
| Deployment controls | MONTAI_DEPLOY_DRY_RUN, MONTAI_ALLOW_TESTNET_DEPLOYMENT |

All VITE values are public browser configuration. Never place server secrets there. There is no SESSION_SECRET: sessions are random opaque tokens stored server-side in memory. Keep MODEL_MASTER_KEY and the protected storage records across backend restarts; losing either can lose model access.

## Testing

Run from the repository root:

~~~sh
npm run compile
npm test
npx tsc --noEmit
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
npm run test:e2e --prefix frontend
npm run security:scan -- --history
npm audit --audit-level=high
npm audit --prefix backend --audit-level=high
npm audit --prefix frontend --audit-level=high
~~~

Install Chromium once from frontend with npx playwright install chromium. E2E uses a **separate** disposable local node/API/frontend on ports 18545/14000/15173 and does not touch the user's chain on 8545. Its wallet is an injected test provider; actual MetaMask prompts remain a manual acceptance step.

Coverage includes creator restrictions, two independent buyers, unlicensed fourth-wallet denial, receipt/hasLicense checks, account changes during authentication, transaction/signature rejection, refresh recovery, backend signature ownership/replay/expiry, encrypted round-trips, tampered content, wrong network, invalid IDs, dashboard, failed payouts, withdrawal reentry and mobile layout. CI runs the local suite on feature pushes/PRs. A passing local run does not prove hosted CI or public-network operation.

## Security model and limits

Keys stay in protected backend records; no raw model or encryption key is sent to IPFS or chain. Signed challenges include wallet, nonce, expiry, origin, chain and contract. Sessions expire after one hour and are lost on API restart. Downloads are not cacheable. The API limits requests/uploads and binds stored CID/hash/creator to the on-chain record.

Authorized buyers can copy decrypted files. Integrity verification proves byte equality, not model safety or accuracy. The API/key service and its protected persistent volume are trusted components. Use TLS and a single API replica unless a shared session store is implemented. Gateway downloads are size-bounded. The catalogue enumerates on-chain models and is intended for a small project; larger scale needs indexing/pagination.

Current/history secret scanning checks known credential values and common patterns; it is not a guarantee against every possible secret format. Root development tooling retains low-severity transitive elliptic findings without an available upstream fix. Backend/frontend audits and all findings should be rechecked at release. This implementation has not received an independent production contract audit.

## Sepolia preparation — no deployment yet

Sepolia chain 11155111 uses environment-based RPC/deployer configuration. The deploying wallet becomes the platform payout recipient; confirm it before deployment. Never use Hardhat's development keys on public networks.

After privately supplying configuration and test ETH, MONTAI_DEPLOY_DRY_RUN enables a preflight that reports chain, deployer and balance without sending a transaction. An actual Sepolia deployment additionally requires explicit user approval and the deployment control flag documented in the runbook. The script rejects unsupported chains and standard Hardhat accounts on Sepolia. After approval and deployment, propagate the emitted address to both frontend and backend and verify their health/configuration agreement. Hardhat verification tooling is already installed; explorer verification is a separate post-deployment check.

Public testing still requires a funded dedicated deployer, Sepolia RPC, hosted HTTPS frontend/API, durable protected storage, real MetaMask acceptance, and optional production Supabase policies if profiles are enabled. No PR merge or public deployment is automatic.

## Repository and review workflow

Development is on feature branches. Main is reserved for reviewed stable work. PR #2 contains the original settlement/storage foundation; PR #3 includes that foundation plus the completed application and later hardening, including the Pinata V3 fix. PR #2 is therefore superseded as a standalone release candidate. Review its foundation first within PR #3, then merge PR #3 only after team approval; close #2 as superseded afterward. Alternatively, retain both review units by merging #2 then #3 with ordinary merge commits, without deploying the intermediate state. Neither PR has been merged by this agent.

Generated bindings/build outputs and unrelated local instruction-file changes must not be accidentally bundled with feature commits.

## License

This repository is an academic/team project. Confirm the intended distribution license and model-specific usage terms before public distribution.
