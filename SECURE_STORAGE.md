# Secure MontAI storage

CONTRACT REDEPLOYMENT REQUIRED for pull withdrawals and creator deactivation. Existing registrations/licenses are not migrated automatically. Keep the previous deployment address/history for its owners. The registration/getModel ABI and 1-based IDs are retained. Royalty retains the existing contract meaning: creator percentage of each sale; platform gets the remainder. A 5% royalty pays 5% to the creator. The upload UI must label this explicitly.

Backend hashes original bytes with SHA-256, encrypts with a random per-upload AES-256-GCM key, and pins only ciphertext to IPFS. Keys are wrapped using MODEL_MASTER_KEY and stored only in backend records. Public APIs never return keys or wrapped keys. The model's CID, owner and original hash must all match the chain before delivery. A signed, single-use wallet challenge creates a one-hour in-memory session scoped to this backend deployment. The server independently checks the license and decrypts into an authenticated response. Restarting the backend expires sessions, not stored keys.

The development fallback stores ciphertext locally with an explicit `local-` identifier (not an IPFS CID). Production refuses to start without Pinata credentials. Use HTTPS in production, a persistent encrypted volume for DATA_DIR, backups of records plus MODEL_MASTER_KEY in separate protected storage, and a single API replica (sessions are process-local). Losing the master key loses access; changing it requires rewrapping records. Model files never execute on the server. Decrypted downloads can still be copied by authorized buyers.

Backend setup: `cd backend && npm ci`; copy `.env.example` to `.env`. Generate MODEL_MASTER_KEY with `openssl rand -hex 32` and put it only in the backend environment. Set RPC_URL, CHAIN_ID, CONTRACT_ADDRESS, CLIENT_ORIGIN, and optional PINATA_JWT. Run `npm start`. Set HOST=0.0.0.0 and NODE_ENV=production on a hosted server with TLS at the ingress. Pinata integration requires live credentials for external verification.

Tests: root `npm test`; backend `npm test`; frontend `npm run build`. No public deployment is performed by these commands.
