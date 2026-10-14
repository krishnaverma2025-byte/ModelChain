# Contract activity history

This change is frontend-only (plus regression tests/CI). It does not change Solidity, deployments, wallet authentication, licensing, encrypted storage, private Supabase records or production configuration.

## Retrieval and controls

- The configured chain, contract address and `VITE_DEPLOYMENT_BLOCK` define the history scope. Sepolia requires a nonzero deployment block; the existing public contract's floor is **11907790**. No production address or event is hardcoded in application logic.
- Each range uses one address-filtered `eth_getLogs` with OR topic0 for `ModelRegistered`, `LicensePurchased`, `RoyaltyPaid`, `ModelStatusChanged`, and `RevenueWithdrawn`. Ethers decodes the exact ABI. Foreign/malformed logs fail closed. Model pages filter decoded model IDs; account-level withdrawals never enter model provenance.
- Start at the latest captured head. Try 2000 blocks; reduce to 500, 100 or 10 only for explicit range/response-size errors. Skip candidates that would repeat an identical failing request. Remember the accepted size; do not repeatedly probe larger sizes. HTTP/JSON-RPC 429, general network failures and authentication errors stop immediately, without automatic retries or credential-bearing error messages.
- Work is sequential and paced at least 350 ms between log-request starts. Automatic backfill is limited to 400 requests (including failed probes) or 120 seconds per run. It progresses through empty ranges without clicks. At a safety limit it pauses, retaining coverage and cursor. **Resume historical backfill** starts another bounded run; **Pause historical backfill** stops further work. One already-issued ethers RPC request may finish, but stale results are ignored and shared in-flight work remains deduplicated.
- **Load older events** searches across empty windows for 20 matching events, deployment, 120 requests or 45 seconds, whichever comes first. It resumes the exact uncovered range. Event filters operate locally, never cause RPC refetches, and table/timeline rendering starts with 50 events. **Show more loaded events** expands already-fetched rows without RPC calls.
- No "all history" claim is shown until every block from deployment through the captured head is covered. The next refresh may discover a newer head. Rate-limit/interruption messages retain observations/progress. Tail observations awaiting a successful refresh are explicitly marked **STALE · RECHECK NEEDED** and excluded from model provenance until revalidated.

## Cache, refresh and reorganizations

The browser cache key is `montai.history.v1:<chainId>:<lowercase-address>:<deploymentBlock>`. It contains only public logs, scanned intervals, an accepted range size and a finalized block checkpoint—no RPC URL, credentials, wallet session, signature or model key.

Only ranges at/below the RPC's `finalized` checkpoint are written to localStorage. On reload the checkpoint hash is checked against the RPC before using cached observations. If finality is unsupported, history stays memory-only; an overlap/depth checkpoint is not promoted to durable finality. Localhost is also memory-only. Blocked/quota-limited browser storage degrades to memory. Serialized cache size is capped at 2 MiB; an oversized cache is not falsely marked complete or truncated to imply coverage.

Refresh retains historical intervals, checks the prior checkpoint, discovers the new head, and replaces the provisional tail with a conservative 64-block overlap. A changed finalized checkpoint discards old observations and rebuilds within the normal work budget. Successful range responses replace old logs in that range, including events removed by a reorg. Deduplication uses transaction hash + log index; sorting is descending block then log index. Concurrent runs coalesce. Refresh does not rescan thousands of unchanged old blocks.

Cached observations are a performance hint backed by prior RPC responses and a rechecked checkpoint—not independent cryptographic receipt proofs, and never authorization or model-integrity authority. Another browser's first visit still needs a scan. A durable shared index could reduce that cost at greater scale, but it would require a separately reviewed backend/indexing change; no paid service or private-record-store change is needed for the current small registry.

## Read-only Sepolia verification

Verified against the RPC located in the currently deployed frontend bundle (endpoint/credential suppressed). Chain **11155111**, contract **0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e**, model count **3**. The complete captured interval **11907790–11914667** (6,878 blocks) was scanned. The RPC accepted only **10-block** ranges; the scan completed in three bounded runs, not hundreds of manual pages.

| Model | Registration block | Actual transaction |
|---|---:|---|
| 1 | 11908539 | [Sepolia receipt](https://sepolia.etherscan.io/tx/0x2047c0924ff63a5c4aa0256e3272f8b5bc361c01feb8ae304c3631a706353569) |
| 2 | 11908674 | [Sepolia receipt](https://sepolia.etherscan.io/tx/0x7aabde73fcfe622128f3792076800e5268f1130094c8934bf76de42c92822d6a) |
| 3 | 11908688 | [Sepolia receipt](https://sepolia.etherscan.io/tx/0xbc0daf7cd25f4ff4633108da5d79899979c1e78f6cdc5da2f33f53afbd4de841) |

The interval returned **10 events**: 3 registrations, 3 purchases, 3 creator-revenue accruals, 1 withdrawal, **0 status changes**. No missing events were fabricated. This is verification through a captured head, not a claim about blocks mined afterward. No public transaction or production mutation was performed.

## Validation

`npm test --prefix frontend`, `npm run lint --prefix frontend`, `npm run build --prefix frontend`, `npm run test:e2e --prefix frontend`, `npm run test:history-browser --prefix frontend`, `npm run security:scan -- --history`, and `git diff --check`. Set `MONTAI_TEST_BROWSER=chrome` for installed Google Chrome; CI uses Playwright Chromium. The existing integration suite uses isolated local test transactions; the new history browser suite mocks every RPC/API and sends zero transactions.

The new suite covers all three model histories, event filters, copy/full controls and genuine-format explorer links, pause/resume, empty-window skipping, adaptive limits, budgets, cache reload, incremental refresh, stale observations/reorgs, 429 no-retry, cancellation, provenance and responsive layouts. No new environment variables or redeployment of the contract are required. Merge/deployment remain subject to user approval.

Protocol references: [Ethereum log topics and finalized tags](https://ethereum.org/developers/docs/apis/json-rpc/), [Alchemy plan-dependent log ranges](https://www.alchemy.com/docs/chains/ethereum/ethereum-api-endpoints/eth-get-logs).
