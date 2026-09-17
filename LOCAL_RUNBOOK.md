# MontAI local runbook and deployment readiness

Run from `/Users/krishnaverma/Documents/BlockChain/BlockChain_Project`.

## Install and test

Use Node 22.13 or later supported by the installed Hardhat/Vite packages. Run `npm ci` in the root, backend and frontend directories. Install Chromium with `cd frontend && npx playwright install chromium`.

Run root `npm run compile` and `npm test`; backend `npm test`; frontend `npm run lint`, `npm run build` and `npm run test:e2e`. The E2E test starts its own local chain (18545), API (14000) and Vite (15173), deploys a disposable contract, and uses an injected wallet provider backed by local test accounts. It tests wallet RPC behavior; it does not automate the actual MetaMask extension. Screenshots and encrypted test records are retained in a printed temporary directory. No public network is used.

## Run the local app

1. In a root terminal run `npm run node`.
2. In another root terminal run `npm run deploy:local`. Save the printed address. A fresh deployment is required for the new withdrawal contract; restarting the ephemeral chain removes registrations/licenses. Previous deployments are not migrated automatically.
3. Configure your untracked backend `.env` from `backend/.env.example`: RPC_URL=http://127.0.0.1:8545, CHAIN_ID=31337, CONTRACT_ADDRESS=the new address, CLIENT_ORIGIN=http://localhost:5173. Generate a master key with `openssl rand -hex 32`; store it privately as MODEL_MASTER_KEY. Preserve the key across restarts and back it up separately from DATA_DIR. Run `npm start` in backend.
4. Configure untracked frontend `.env` from `frontend/.env.example` with the same contract and chain, VITE_RPC_URL=http://127.0.0.1:8545, VITE_API_URL=http://127.0.0.1:4000. Run `npm run dev` in frontend and open http://localhost:5173. Supabase profiles are optional and separate from wallet authorization.
5. Configure MetaMask for localhost chain 31337 and use only disposable local test accounts. Upload a supported model, register it, switch to a buyer, purchase and download. Creator revenue and deactivation are in Dashboard.

## Behavior and limits

Creator share is a whole percentage of each sale; the remainder goes to the deployment wallet (platform). Revenue is credited, then withdrawn. Legacy RoyaltyPaid is emitted when revenue is credited; RevenueWithdrawn signals the actual withdrawal. Existing licenses retain access after deactivation; deactivation prevents new sales. Registration is immutable: changes require a new registration. Version histories, resale royalties and legal usage terms are not recorded by this contract.

Model files are never executed. Only encrypted bytes are uploaded to IPFS. Without Pinata, development uses clearly labelled encrypted local storage. License access also depends on the backend and its protected key records; it is not a fully decentralized key delivery system. Authorized buyers can copy decrypted files. Failed/rejected registrations may leave orphan encrypted uploads; do not automatically delete records that might belong to a delayed confirmed transaction. Catalogue enumeration is suitable for a small project; larger deployments need an event indexer and pagination.

## Deployment remains pending

Local integration is verified. Public deployment is not authorized. Live Pinata upload/retrieval, real MetaMask extension behavior, hosted HTTPS/CORS configuration and public-network confirmation behavior require release verification. Supply Pinata credentials through server secret storage only; never VITE variables. Production refuses missing Pinata credentials. Use a persistent protected DATA_DIR, master-key recovery/backup procedure, TLS ingress, one API replica (sessions are in memory), and a trusted RPC. Review the platform recipient before deployment. Contract changes require a fresh address configured consistently in both services.

Profile login/signup/edit flows require a configured Supabase project and appropriate profile/avatar policies; those external flows are not covered by wallet E2E. No production credentials are committed. Team review and the external checks above are required before claiming deployment readiness.

## Sepolia preparation and current external findings

Sepolia chain 11155111 is configured through SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY (server/deployment secrets). Export them privately; Hardhat configuration variables do not automatically load the root `.env`. Configuration reference: https://hardhat.org/docs/reference/configuration. After credentials are supplied, `MONTAI_DEPLOY_DRY_RUN=1 npx hardhat run scripts/deploy.ts --network sepolia` checks the chain/account and balance without sending a transaction. Actual public deployment requires separate user approval and MONTAI_ALLOW_TESTNET_DEPLOYMENT=sepolia. The script rejects unsupported chains and the twenty standard Hardhat accounts on Sepolia. Never use development keys on public networks. The platform payment recipient is the deploying account.

After an approved deployment, configure backend CHAIN_ID=11155111, RPC_URL and CONTRACT_ADDRESS; frontend VITE_CHAIN_ID=11155111, VITE_RPC_URL, VITE_CONTRACT_ADDRESS and VITE_API_URL. Public frontend builds require explicit configuration and HTTPS RPC/API URLs. Backend production requires HTTPS CLIENT_ORIGIN, Pinata and a durable master key. IPFS_GATEWAY configures an HTTPS retrieval gateway.

The existing ignored Pinata credential was exercised with a tiny encrypted fixture; the pinning endpoint returned HTTP 403 before any CID was created. Live Pinata is BLOCKED pending a valid credential with pinning permissions/account access. Retry explicitly with `node --env-file=.env backend/scripts/live-storage.mjs` from root (or inject credentials from secret storage). It pins only an encrypted fixture and verifies gateway retrieval after removing its own local cache; successful fixtures remain pinned. Supabase environment entries exist, but profile flows/policies remain unverified. No testnet deployer/RPC configuration was found. Actual MetaMask extension and hosted HTTPS behavior remain release checks.

Development tooling audits now report only low-severity transitive elliptic findings through Hardhat verification/ethers v5; npm reports no upstream fix. Runtime backend/frontend production-dependency audits remain separate. Compiler is pinned to solc 0.8.28, with patched temporary-file and Mocha dependencies explicitly overridden and verified by tests. Generated contract bindings remain reproducible build outputs and are preserved locally; instruction-file deletions are outside this feature's commits.
