# MontAI V3 — original-design fidelity correction

PR #14, existing branch `feature/montai-v3-ui-integration`. No new PR,
merge, production deployment, credential change or Production environment edit.

## Authoritative reference

The available archive is `MontAi v3.zip`; there is no separate
`MontAi v3(1).zip` locally. Its nested `src.zip` active `app/routes.tsx` has
the exact three-section homepage described in the request. The routed prototype
was run unchanged in an isolated local preview on port 15175. Bundled
`node_modules`, alternate `src/App.tsx`, prototype wallets/data and simulated
transaction behavior are not part of the product.

## Removed from the initial integration

- Homepage search form and category tabs.
- Why MontAI heading/four-feature grid.
- Complete-lifecycle/step workflow and architecture cards.
- Extra homepage provenance navigation/captions and model-card description,
  model-ID row and redundant verification badge.
- Legacy Activity architecture panels, extra authenticated-wallet metric and
  separate contract strip.
- Extra upload stepper, storage-note banner and large status panels.
- Separate optional-profile navbar dropdown, profile ID/date sections and
  unnecessary dashboard explanatory content.

Nothing replaces the removed homepage sections: exactly hero → featured
marketplace → dark protocol banner remains.

## Fidelity corrections

- Original full-bleed hero and dark banner, constrained 1280px inner layouts,
  112px desktop/80px tablet-mobile hero padding, original headline sizes and
  line height, 48px hero gap, 80px featured-section padding.
- Original animated blue/purple AuroraText and grid viewBox/scaling/stroke
  opacity. Reduced motion supported without transaction/auth animations.
- Black 40px-rounded provenance card retains model/ring row and three technical
  references. Numeric trust score is replaced with a binary **registration**
  status, never model-quality or safety evidence.
- Cards keep original 176px category gradient, category pill, monogram,
  name/creator/status row and price/button footer only.
- Navbar uses original desktop gray active pill, 80px row and 1024px breakpoint;
  mobile uses the original black active pill and scrollable link row. Wallet
  and profile options use the same functional dropdown, not another navbar item.
- Marketplace returns to the original title, one compact filter toolbar and
  original grid breakpoints (desktop three columns; tablet two).
- Details returns to the original left overview/tabs/content and right sticky
  license card, four provenance reference cards, access/history sections and
  trace action. The original three metadata slots remain, with unavailable
  framework/file-size data explicitly marked not recorded instead of invented.
  Complete technical evidence remains accessible in the drawer.
- Upload returns to the original form plus four-step dark sidebar; actual hash,
  CID and transaction details fit within the corresponding step disclosures.
  The source's large upload illustration is retained, bounded to its container.
- Dashboard preserves original four metrics, two lists and blue revenue/ring
  strip. Rings indicate actual optional-profile/wallet state, not invented
  profile-completion or model-integrity percentages.
- Activity uses original network/count/contract metrics and compact event rows;
  real wallet/value details, copy/explorer and PR #13 scanner controls remain.
- Login/Profile use original card/page geometry; Signup uses the same identity
  styling because the supplied routed prototype has **no separate Signup page**.
- Footer returns to original Docs / Contract / Status presentation with actual
  destinations rather than fabricated actions.

## Functionality boundaries

Wallet identity/session verification, encryption, upload rollback, contract
licensing, protected downloads, integrity checks, profile operations, contract
actions and history backfill/cache logic remain unchanged. The catalog exposes
hash/CID fields already returned by `getModel` for the hero; it adds no RPC calls.
Only presentation, component placement and corresponding visual test selectors
change. No speculative framework, file-size, model version, sales, price,
address, balance or transaction values are introduced into product code.

## Paired visual comparison

`node frontend/scripts/v3-visual.mjs` expects the local original prototype at
`MONTAI_V3_REFERENCE_URL` (default `http://127.0.0.1:15175`). It starts a separate
integrated Vite preview, uses explicit read-only test fixtures, serves identical
fonts, captures original/integrated/side-by-side screenshots and records geometry.
Fixtures are **not** production/Preview catalog verification. No transaction is
sent and the script rejects unexpected write RPCs.

Captured Home, Marketplace, Details, Upload, Dashboard, Activity, Login and
Profile at 1440/1024/768/390/320px. Signup is separately covered by functional
E2E rather than comparing to the prototype's unrelated wildcard route.

Measured homepage headline geometry after adjustment:

| Width | Reference font / x / y | Integrated font / x / y |
| --- | --- | --- |
| 1440 | 72px / 112 / 241 | 72px / 112 / 241 |
| 1024 | 72px / 32 / 241 | 72px / 32 / 241 |
| 768 | 72px / 20 / 254 | 72px / 20 / 254 |
| 390 | 48px / 20 / 254 | 48px / 20 / 254 |
| 320 | 48px / 20 / 254 | 48px / 20 / 254 |

This is geometry verification, **not** a claim that every screenshot pixel is
identical. Actual model text, availability, authorization and optional-profile
state necessarily differ from a mock prototype. Its Details page overflows at
390/320px; the integration preserves its layout while keeping controls within
the viewport. Fake numerical scores, quality claims, legal-license wording and
fake hash/CID explorer destinations are intentionally not copied.

## Vercel Preview — confirmed missing scopes

Read-only inspection of `BlockSync → montai → Environment Variables` showed:

| Variable | Current scope |
| --- | --- |
| `VITE_RPC_URL` | Production only |
| `VITE_API_URL` | Production only |
| `VITE_CHAIN_ID` | Production and Preview |
| `VITE_CONTRACT_ADDRESS` | Production and Preview |
| `VITE_DEPLOYMENT_BLOCK` | Production and Preview |
| Optional Supabase public variables | Production and Preview |

The production-mode frontend correctly refuses a missing RPC configuration.
There is no mock fallback or hidden error. The user explicitly chose **leave
configuration for later**, so no environment variable was revealed or changed.

### Manual Preview-only fix

1. Open the MontAI Vercel project's **Environment Variables** settings.
2. Add a separate `VITE_RPC_URL` entry using the existing authorized Sepolia
   browser RPC. Select **Preview only**, preferably restricted to
   `feature/montai-v3-ui-integration`. Do not change the Production entry.
3. Add `VITE_API_URL=https://montai-api.onrender.com` with the same Preview scope.
4. Verify the existing Preview values: chain `11155111`, contract
   `0x50Af9D424C10D596ddb5f5cF9A18Fc193a73e97e`, deployment block `11907790`.
5. Save and redeploy the latest feature-branch deployment **as Preview**. Do not
   promote it or deploy `main`. Environment changes require a new deployment;
   refreshing the old build cannot inject Vite build-time values.
6. Open Marketplace, clear filters, confirm actual model IDs 1/2/3 and their
   detail pages. Then verify the Preview origin is permitted by the existing
   access service before attempting authenticated write/download flows. Do not
   change backend origin policy as part of this visual correction.

[Vercel environment-variable scope/redeployment documentation](https://vercel.com/docs/environment-variables).
`VITE_*` values are frontend build inputs: never put JWTs, master keys, wallet
private keys or service-role credentials in them. No RPC value is printed here.

Preview alias:
https://montai-git-feature-montai-v3-ui-integration-block-sync.vercel.app/

**Live Preview retrieval of all three models remains unverified/blocked by the
missing RPC scope.** Local read-only visual fixtures must not be described as
live verification.

## Verification suite

37 frontend unit tests, 21 backend tests, 6 contract tests, contract compilation,
root TypeScript check, frontend lint/production build, full Chrome E2E, history
browser regression, paired prototype comparison, secret scan and diff check.
The full E2E includes actual isolated registration/rollback, purchase/license,
protected download/decryption/byte integrity, unlicensed denial, account changes,
session restoration/expiry/invalidity, provider duplicates, profile mismatch,
unified logout, withdrawals, activation and all nine routes at five widths.

No existing authorization or blockchain test was dropped. Selectors changed for
the original search/category controls and title; fresh integrity evidence is
checked inside the functional provenance drawer. Logout now directly asserts
the shared optional-profile state is cleared, rather than merely counting a
removed legacy profile-menu button.

Blocking high-severity audits pass. Backend/frontend report zero findings;
the root development toolchain retains nine pre-existing low-severity findings.
The existing Vite bundle-size advisory also remains.
