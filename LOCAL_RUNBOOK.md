# MontAI local runbook and deployment readiness

## UI traceability review

The registry redesign adds `/activity`, model event timelines and a keyboard-accessible Trace Model drawer. Events are read from the configured contract in 2,000-block pages; use **Load older blocks** for earlier history. Missing/RPC-unavailable values are never replaced with synthetic history. RoyaltyPaid means revenue accrual, and withdrawals are account-level. ModelStatusChanged does not emit the actor wallet. Registration proves an on-chain wallet claim, not independently validated authorship.

Authentication, authorized delivery and integrity evidence is limited to the current Details session and clears on wallet, network or model changes. “Model delivered” means verified bytes reached the browser and its download was requested; it is not a claim that the user saved or executed the file. Full technical values can be expanded or copied. Localhost never links to Etherscan. An optional `VITE_EXPLORER_URL` enables HTTPS transaction links for a configured public network; it is ignored on chain 31337.

Frontend `npm test` covers ABI event decoding, bounded history and explorer-link guards. The expanded E2E checks all primary routes at 1440, 768 and 390 px, keyboard dismissal/focus restoration, session evidence and the existing access/security flows. `MONTAI_REVIEW=1 npm run test:e2e` keeps the **isolated** review services on 18545/14000/15173 after passing; stop that command after reviewing. Its disposable model is not the user's live demo, and its final state includes deactivation/withdrawal tests. It does not touch 8545 or use Pinata credentials.

Run from `/Users/krishnaverma/Documents/BlockChain/BlockChain_Project`.

## Install and test

Use Node 22.13 or later supported by the installed Hardhat/Vite packages. Run `npm ci` in the root, backend and frontend directories. Install Chromium with `cd frontend && npx playwright install chromium`.

Run root `npm run compile`, `npm test`, `npx tsc --noEmit` and `npm run security:scan -- --history`; backend `npm test`; frontend `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e`. Run `npm audit --omit=dev` in each package; report full development-tool audits separately. The E2E test starts its own local chain (18545), API (14000) and Vite (15173), deploys a disposable contract, and uses an injected wallet provider backed by local test accounts. It tests wallet RPC behavior; it does not automate the actual MetaMask extension. Screenshots and encrypted test records are retained in a printed temporary directory. No public network is used.

## Run the local app

1. For a new session, in a root terminal run `npm run node -- --hostname 127.0.0.1`. Keep it running. Do not restart an existing valuable demo chain.
2. In another root terminal run `RPC_URL=http://127.0.0.1:8545 npm run deploy:local`. Save the printed address. Restarting the ephemeral chain removes all contracts, registrations, licenses and revenue state; deployment and model registration must then be repeated. The same address can recur on a fresh chain without preserving any old state. Previous deployments are not migrated automatically.
3. Configure your untracked backend `.env` from `backend/.env.example`: RPC_URL=http://127.0.0.1:8545, CHAIN_ID=31337, CONTRACT_ADDRESS=the new address, CLIENT_ORIGIN=http://localhost:5173. Generate a master key with `openssl rand -hex 32`; store it privately as MODEL_MASTER_KEY. Preserve the key across restarts and back it up separately from DATA_DIR. Run `npm start` in backend.
4. Configure untracked frontend `.env` from `frontend/.env.example` with the same contract and chain, VITE_RPC_URL=http://127.0.0.1:8545, VITE_API_URL=http://127.0.0.1:4000. Run `npm run dev` in frontend and open http://localhost:5173. Supabase profiles are optional and separate from wallet authorization.
5. Configure MetaMask for localhost chain 31337 and use only disposable local test accounts. Upload a supported model, register it, switch to a buyer, purchase and download. Creator revenue and deactivation are in Dashboard.

### Real-wallet local acceptance

In MetaMask select **Hardhat Local**, RPC `http://127.0.0.1:8545`, chain ID `31337`, currency symbol `ETH`, with no block explorer URL. Unlock the extension yourself; never paste passwords or account secrets into chat, source files or the frontend. Use already imported disposable Hardhat accounts; these accounts must never hold real assets or be used on a public network.

Register a small safe fixture as creator from Upload. Record its original SHA-256, storage reference, model ID, mined transaction and block. Switch to a distinct buyer; check `hasLicense` is false, purchase at the displayed on-chain price, wait for receipt success and verify a fresh `hasLicense` is true. Download, sign the one-use challenge, and compare the downloaded SHA-256 with the chain hash. Switch to an unlicensed wallet and confirm denial, then back to the buyer; stale access/verification evidence must not remain after a switch. Activity and Trace Model must show actual logs and references, not simulated history. Dashboard distinguishes creator models, purchased licenses and withdrawable revenue.

Preserve existing MODEL_MASTER_KEY and DATA_DIR when restarting the API. Generate a key only for an initial installation, never to fix a wallet/network issue. A fresh chain does not delete old encrypted storage records; preserve them rather than attempting automatic cleanup. If MetaMask retains obsolete pending transactions/nonces after a chain restart, inspect them before retrying and request user-assisted wallet cleanup if required; do not reset a valuable live chain to resolve wallet state.

## Behavior and limits

Creator share is a whole percentage of each sale; the remainder goes to the deployment wallet (platform). Revenue is credited, then withdrawn. Legacy RoyaltyPaid is emitted when revenue is credited; RevenueWithdrawn signals the actual withdrawal. Existing licenses retain access after deactivation; deactivation prevents new sales. Registration is immutable: changes require a new registration. Version histories, resale royalties and legal usage terms are not recorded by this contract.

Model files are never executed. Only encrypted bytes are uploaded to IPFS. Without Pinata, development uses clearly labelled encrypted local storage. License access also depends on the backend and its protected key records; it is not a fully decentralized key delivery system. Authorized buyers can copy decrypted files. Failed/rejected registrations may leave orphan encrypted uploads; do not automatically delete records that might belong to a delayed confirmed transaction. Catalogue enumeration is suitable for a small project; larger deployments need an event indexer and pagination.

## Deployment remains pending

Local integration and live encrypted Pinata V3 upload/retrieval/decryption are verified. Public deployment is not authorized. Real MetaMask extension behavior, hosted HTTPS/CORS configuration and public-network confirmation behavior require release verification. Supply Pinata credentials through server secret storage only; never VITE variables. Production refuses missing Pinata credentials. Use a persistent protected DATA_DIR, master-key recovery/backup procedure, TLS ingress, one API replica (sessions are in memory), and a trusted RPC. Review the platform recipient before deployment. Contract changes require a fresh address configured consistently in both services.

Profile login/signup/edit flows require a configured Supabase project and appropriate profile/avatar policies; those external flows are not covered by wallet E2E. No production credentials are committed. Team review and the external checks above are required before claiming deployment readiness.

## Sepolia preparation and current external findings

Sepolia chain 11155111 is configured through SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY (server/deployment secrets). Export them privately; Hardhat configuration variables do not automatically load the root `.env`. Configuration reference: https://hardhat.org/docs/reference/configuration. After credentials are supplied, `MONTAI_DEPLOY_DRY_RUN=1 npx hardhat run scripts/deploy.ts --network sepolia` checks the chain/account and balance without sending a transaction. Actual public deployment requires separate user approval and MONTAI_ALLOW_TESTNET_DEPLOYMENT=sepolia. The script rejects unsupported chains and the twenty standard Hardhat accounts on Sepolia. Never use development keys on public networks. The platform payment recipient is the deploying account.

After an approved deployment, configure backend CHAIN_ID=11155111, RPC_URL and CONTRACT_ADDRESS; frontend VITE_CHAIN_ID=11155111, VITE_RPC_URL, VITE_CONTRACT_ADDRESS and VITE_API_URL. Public frontend builds require explicit configuration and HTTPS RPC/API URLs. Backend production requires HTTPS CLIENT_ORIGIN, Pinata and a durable master key. IPFS_GATEWAY configures an HTTPS retrieval gateway.

Live Pinata V3 passed using the existing ignored credential: POST https://uploads.pinata.cloud/v3/files, network=public, Files: WRITE permission. Only encrypted bytes are uploaded; CID is read from data.cid. Gateway retrieval and authenticated decryption matched the original test fixture byte for byte. The legacy endpoint permission mismatch is resolved; no key or permission change was needed. The verified fixture CID is bafkreicvytwgflxbro46yojirfm6sqs7mqrqcmatpb2ukzxbti3mnkxcse. Do not repeatedly pin test fixtures. Supabase environment entries exist, but profile flows/policies remain unverified. No testnet deployer/RPC configuration was found. Actual MetaMask extension and hosted HTTPS behavior remain release checks.

Environment naming is intentionally consistent with the implementation: VITE_API_URL is the browser backend URL; MODEL_MASTER_KEY protects backend key records; SEPOLIA_PRIVATE_KEY is the deployer key. Do not add duplicate VITE_BACKEND_URL/DEPLOYER_PRIVATE_KEY aliases. There is no SESSION_SECRET because sessions are random opaque tokens held in server memory, not signed client tokens. Restart expires sessions; deployments with multiple API replicas need a shared session store before scaling.

`scripts/interact.ts` is a read-only local utility, restricted to chain 31337. Run `CONTRACT_ADDRESS=<local-address> MODEL_ID=<existing-id> npx hardhat run scripts/interact.ts --network localhost` with RPC_URL if your local node uses a custom port. It reads the registered encrypted storage identifier/hash/price directly from the chain and never uploads, registers or purchases.

For the actual MetaMask extension check, run the local app with matched frontend/backend contract configuration; connect a disposable creator, upload/register, switch to a disposable buyer, purchase, refresh and download/verify. Reject a request and switch to a different network to verify recovery. These steps require the user's wallet prompts. For Sepolia, privately supply SEPOLIA_RPC_URL and a fresh non-Hardhat SEPOLIA_PRIVATE_KEY; fund that wallet with test ETH and run the dry preflight. Do not set the deployment approval flag or send a deployment transaction until explicitly authorized.

## Multi-wallet diagnosis and acceptance

The following is a historical diagnosis of an earlier ephemeral chain, not the state of a newly started demo. Re-query the current chain before treating any account/license or transaction claim below as current.

The reported Account 3 download denial was checked against the user's existing node without restarting, redeploying or sending contract transactions. At block 3, Account 2 had a license for model 1, while Accounts 3/4 did not. The only mined purchase was from Account 2. The running API authenticated all three wallets correctly: Account 2 downloaded with matching SHA-256; Accounts 3/4 received 403. A successful wallet prompt alone is not a mined purchase. Preserve the transaction hash from MetaMask if a displayed success differs from the chain; check its receipt/from/to and hasLicense on that exact network before attempting another purchase.

Details now waits for a receipt matching the buyer and contract, checks hasLicense at the receipt block through the wallet provider and freshly through the configured RPC, then displays License Owned. Account/chain events clear old state; asynchronous work from another wallet cannot complete into current UI. Downloads obtain a new signer/session, validate backend deployment identity and challenge wallet, verify signature recovery, and recheck the selected wallet before saving. Backend denial diagnostics contain only wallet/model/chain/contract, never tokens or secrets.

The isolated E2E covers creator ownership, Account 2 and Account 3 independently purchasing/downloading, Account 4 denial, Account 2 → 3 → 2 → 3 switching, refresh, and a wallet change during a signature prompt. These purchases occur only on the disposable test chain. The user's existing Account 3 still needs a real mined purchase; no license was inserted or granted manually.

The running API uses node without hot reload. After pulling fixes, restart **only the API process** in its existing backend directory/environment to load server changes; this expires sessions but retains encrypted records and keys. Keep the Hardhat node and current contract running. Reload the frontend and retry Account 3 with the new receipt/hasLicense confirmation. Do not change keys, Pinata permissions or deployment address.

Repeated unrecognized-selector/StackUnderflow messages cannot be attributed from the function label alone. Record the eth_call target, calldata selector and timestamp; compare with application requests. The isolated MontAI flow is checked for those errors. The user's historical terminal stream was not accessible to the agent, so wallet probing versus another caller is not asserted without that evidence.

On 2026-09-29 the full root development-tool audit reported 11 low findings and one moderate undici finding; the full frontend audit and production-only audits of all three packages were clean. Recheck at release rather than relying on historical audit results. Compiler is pinned to solc 0.8.28, with patched temporary-file and Mocha dependencies explicitly overridden and verified by tests. Generated contract bindings and pre-existing instruction-file deletions were preserved in the pre-redesign snapshot; do not discard unrelated working changes during local acceptance.
