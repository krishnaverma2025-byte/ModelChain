# Troubleshooting

[Documentation home](../README.md) · [Deployment environment tables](DEPLOYMENT_GUIDE.md)

Inspect fixed startup stage names and HTTP status codes first. Share only redacted observations/public identifiers; never paste environment dumps, provider URLs containing server keys, request Authorization headers or private records.

## Render startup diagnostics

`.env not found` on Render is normally harmless: `npm start` uses Node's `--env-file-if-exists=.env`, while Render injects environment variables directly. Do not upload a secret `.env` to Git to silence it. If startup fails, identify the last `[STARTUP] CHECK` / `FAILED` stage. Remote error details are intentionally suppressed to protect credentials.

| Stage | What to inspect privately |
| --- | --- |
| `configuration` | Required environment, valid address, production settings, Supabase variables and host/port |
| `rpc-network` | HTTPS Alchemy Sepolia RPC; valid server key; chain `11155111`; server-compatible restrictions |
| `contract-bytecode` | Correct deployed contract on the configured chain; nonempty bytecode |
| `production-urls` | Canonical HTTPS client origin and HTTPS IPFS gateway |
| `supabase-private-bucket` | Correct project/service role/bucket, Public OFF, bucket reachable |
| `storage-initialization` | Stable 64-hex master key, Pinata JWT and persistent store in production |
| `server-listen` | `HOST=0.0.0.0`, Render-injected PORT; no conflicting manual override |

`CHECK`, `OK`, `SKIPPED` and `FAILED` are safe checkpoint outcomes. The bucket stage may be skipped in local development without a remote store; public production must use persistent protected storage. Earlier stages can reject configuration before reaching the table's later checks.

## Common issues

| Symptom | Cause and resolution |
| --- | --- |
| First API request slow / wake-up notice | Render Free sleeping/cold start. Wait; UI allows 90 seconds. Check health and retry manually if timeout persists. Do not auto-repeat blockchain transactions. |
| RPC unauthorized / cannot detect network | Wrong, revoked or unauthenticated Alchemy key; wrong endpoint/network; browser-only origin restrictions used server-side. Create/use the appropriate Sepolia app and check privately. |
| Frontend still uses old RPC after key rotation | Vite values are built into assets. Update `VITE_RPC_URL` in the correct Vercel environment and redeploy; restarting backend cannot change the browser bundle. |
| Vercel public values missing at build | Check root `frontend`, variable scope and spelling. Where interface distinguishes Secret and Config, recreate public `VITE_*` entries as Config if needed, then rebuild. VITE values remain browser-visible regardless of UI label. |
| CORS failure | `CLIENT_ORIGIN` must exactly equal canonical browser origin, e.g. `https://montai-six.vercel.app`, without trailing slash/path. Preview domains are different origins; do not broadly allow all origins. Restart after backend changes. |
| Supabase denied / bucket validation fails | Wrong project, nonexistent bucket, anon key used backend, or Public ON. Backend requires service role and `montai-private-records`; Public OFF plus restrictive object RLS. Never “fix” by making records public. |
| Master-key validation / old models cannot decrypt | Key must be exactly 64 hex characters (32 bytes), no prefix/whitespace. Restore the original stable production key from secure backup; a fresh key cannot open old wrapped keys. |
| No contract / wrong model registry | Confirm chain `11155111` and README address in both services. Localhost addresses/chain IDs or a new deployment represent different registries. |
| MetaMask wrong network/account | Select Sepolia and intended address, unlock wallet, reconnect and authenticate again. Buyer must be the address that purchased. |
| Insufficient funds / faucet unavailable | Buyer needs price plus gas, creator registration gas. Faucet quotas vary; use Ethereum's directory or existing teammate test ETH. Never buy real ETH for the demo. |
| 401 / expired signature | Challenge expired, consumed or wrong signer; session expired/backend restarted. Request fresh wallet authentication. No license repurchase needed. |
| 403 download | Authenticated wallet neither owner nor licensed. Check actual buyer address and successful purchase receipt. Profile login is not authorization. |
| 409 stored package mismatch | Protected record CID/hash/owner differs from chain. Stop; investigate correct namespace/record without exposing keys. Do not bypass validation. |
| 413 / upload rejected | Over 25 MB, empty/unsupported file, or metadata outside limits. See user guide. |
| Pinata upload fails | Verify backend JWT has V3 Files WRITE and provider availability. Current code uses V3 uploads, not legacy pinning. |
| Download unavailable after restart | Check private record persistence, same master key and gateway availability. Render filesystem is disposable; no production filesystem key-record fallback. |
| 429 | Rate limit hit; wait and re-authenticate if needed. Do not loop retries or blindly trust forwarded headers to bypass limits. |
| Transaction rejected / pending | Inspect MetaMask/explorer history before another submission. Rejecting a prompt stops the flow; do not assume failure means no transaction was sent. |
| Empty Activity | Feed scans 10-block ranges with deployment floor. Load older blocks; check configured deployment block and RPC limits. |

`/health` validates a contract read, not model storage/decryption or complete Supabase/Pinata acceptance. Use [the demo checklist](DEMO_AND_TESTING_GUIDE.md) before declaring the deployment healthy.
