# Security notes and operational boundaries

[Documentation home](../README.md) · [Release runbook](../PUBLIC_TESTNET_RUNBOOK.md)

## Credentials by trust boundary

| Value | Allowed location |
| --- | --- |
| `SEPOLIA_PRIVATE_KEY` | Private deployment process only; **not Render runtime**, frontend or Git |
| `SEPOLIA_RPC_URL` / backend `RPC_URL` credentials | Private deployment/backend settings |
| `MODEL_MASTER_KEY` | Backend only; stable 64-hex value with secure independent backup |
| `PINATA_JWT` | Backend only |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only; privileged RLS-bypassing credential |
| `VITE_RPC_URL` | Public browser RPC URL/key; restrict provider app appropriately |
| `VITE_CHAIN_ID`, `VITE_CONTRACT_ADDRESS`, `VITE_DEPLOYMENT_BLOCK`, `VITE_API_URL` | Public frontend configuration |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Optional public profile settings; require appropriate RLS |

Never commit credentials or recovery phrases, including in docs, examples, test fixtures, PR descriptions or screenshots. Never enter secrets into `VITE_*`, even if a hosting UI calls them Secret. Vite bundles these values into browser code. Use placeholders in documentation and ignored local files or private host settings. Inspect staged changes and run `npm run security:scan -- --history`; automated scanning does not catch every secret format.

## Encryption and persistence

IPFS contains **AES-256-GCM ciphertext only**. Per-file keys are random and wrapped under the backend master key. Supabase `montai-private-records` must have **Public OFF** and restrictive object RLS; ordinary authenticated/anon users must not read or write records. Do not expose wrapped records or signed URLs. Backend service role bypasses RLS and must remain secret.

Record paths include chain/contract namespace. Durable records and the original master key are essential; Render cache files are disposable. Production refuses filesystem fallback for key records. The master key must stay unchanged across restart, redeploy and rollback. Losing it can make old model packages permanently unavailable.

The backend receives plaintext uploads and returns plaintext to authorized users over HTTPS. It is trusted to handle keys, authorization and integrity checks. AES-GCM and SHA-256 checks detect inconsistent/corrupted bytes; they do not remove that trust.

## Rotation and incident response

Rotate exposed deployer/RPC/Pinata/service-role credentials through their provider, update private settings, revoke old credentials and validate acceptance. An exposed deployer key also compromises the wallet controlling the immutable platform address; rotating a backend setting does not change that contract address. Browser RPC rotation requires updating Vercel and rebuilding; backend RPC rotation requires restart. Restrict public RPC usage and retain secure backups.

**Do not casually rotate `MODEL_MASTER_KEY`.** The current application has no master-key rewrapping migration tool. A planned rotation needs a separately reviewed migration that rewraps every existing file key and verifies recovery, with secure backups and rollback. Merely replacing the environment value breaks access to previously stored packages. Never log keys while investigating failures. Removing a secret from the latest commit does not revoke it or remove Git history exposure.

## Contract changes and service updates

Current ModelChain is immutable/non-upgradeable; no upgrade proxy or automatic license migration exists. A contract bug requires a new version and **new deployed address**, with an explicit plan for old records/licenses. Preserve prior addresses, namespaces and key backups. Deployer/platform identity cannot be reassigned through the current contract.

Frontend and backend can be updated normally via reviewed commits and host deployments. Keep compatible chain/address/bucket/master key values for existing packages. Rebuild frontend after configuration changes; restart backend after changes. A rollback to code lacking protected persistent records is unsafe for this deployment. Do not merge or redeploy automatically without the relevant release authorization.

## Scope and limitations

This is an academic Sepolia test; **test ETH has no real monetary value**. The implementation has not received an independent production security audit. On-chain metadata proves a registration/transaction and supports integrity comparison; it does not prove legal title, identity, model quality, accuracy or safety. Wallet identity is pseudonymous and public activity is linkable.

Authentication by signature is distinct from owner/license authorization. Supabase profile login cannot grant delivery rights. Backend independently checks permissions for downloads; sessions are short-lived and in memory. Use one API replica until shared session infrastructure exists. CORS is an origin policy, not a substitute for authentication/authorization.

An authorized recipient can copy or redistribute plaintext after download. Encryption provides gated delivery, **not perfect DRM**. No malware scanning, model execution sandbox, runtime metering or automatic legal-term enforcement is implemented. Download only non-sensitive demonstration packages you trust; acceptance uses an inert tiny fixture.
