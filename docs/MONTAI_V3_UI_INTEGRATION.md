# MontAI v3 frontend integration

> Historical record of the initial `e2d4ec7` integration. Its expanded homepage
> and layouts were superseded by the original-design fidelity correction.
> See [V3 design fidelity](MONTAI_V3_DESIGN_FIDELITY.md) for the current UI,
> paired reference comparison and Preview configuration findings.

## Scope and source

Integrated the supplied `MontAi v3.zip`, using its nested `src.zip` active
`main.tsx → app/App.tsx → app/routes.tsx` as the design reference. The alternate
`src/App.tsx`, simulated transactions, fixture catalog, hardcoded wallet,
sales/revenue figures and trust scores were **not** imported. Bundled
`node_modules` and prototype configuration were not copied.

Based on main `720660c`, including merged PRs #12 and #13. The implementation
stays in React/Vite JavaScript: existing functional components are restyled and
composed rather than replacing wallet or blockchain logic with a prototype.

## Pages and visual system

- Home: warm off-white/blue v3 hero, AuroraText, interactive SVG grid, real
  latest active registration preview and featured catalog, search/categories,
  provenance/security content and protocol-activity banner.
- Marketplace: gradient category art, model-name monograms, actual registration
  status, creator-copy controls, pricing, search/category/status filters.
- Model details: category-colored overview, section navigation, actual provenance,
  wallet-bound licensing, protected access/integrity controls and real history.
- Dashboard: chain-derived metrics, separate model/license panels, actual
  withdrawable revenue and withdrawal action. Pending/failed reads show `—`,
  not fabricated zero values or completion percentages.
- Upload: creator studio form, publishing stages, dark security/storage/chain
  sidebar with existing actual hash, upload and transaction states.
- Activity: v3 cards, technical values, filters and event presentation around
  the unchanged PR #13 history scanner/cache/backfill system.
- Login/signup/profile: rounded warm/white identity panels, real optional profile
  controls and existing wallet authentication, linking and mismatch handling.
- Shared: one responsive navbar, real wallet dropdown, network-aware footer,
  favicon, keyboard focus and provenance drawer. Manrope variable and DM Mono
  Latin fonts are self-hosted under `frontend/public/fonts`, with OFL notices.

Decorative gradients/monograms encode category/name only. They are not model
images, quality scores or security attestations. The grid uses one SVG pattern
and pointer-driven highlight instead of hundreds of stateful squares. Reduced
motion disables animations and pointer highlight. Transaction/auth state has
no new animation or delay.

## Controls and actual actions

| Surface | Controls | Actual behavior |
| --- | --- | --- |
| Navigation | Home, Marketplace, Upload, Dashboard, Activity | Client-side routes; no document reload |
| Compatibility | `/upload`, `/models/:id` | Redirect to `/upload-model`, `/model/:id` |
| Wallet | Sign in, switch wallet/network, disconnect, logout | Existing MetaMask challenge/session and identity operations; profile authentication grants no wallet rights |
| Wallet/profile menu | Profile & options, view/edit/linked wallet | Existing `/profile` options; unified logout retained |
| Home | Explore, publish, trace preview, featured cards, search, categories | Real catalog/detail routes and query parameters |
| Marketplace | Search, category/status, refresh, View Model | Filter loaded real catalog; explicit catalog refresh; actual model ID navigation |
| Technical values | Copy, Full value, Etherscan | Exact displayed chain/reference value; genuine configured-network explorer links; localhost stays copy-only |
| Details | Overview, Provenance, License/Access, History | Accessible section anchors |
| Details | Trace Model, Close/Escape | Existing focus-managed provenance dialog with real chain/session evidence |
| Details | License Model | Existing purchase transaction, mined receipt and fresh on-chain license verification |
| Access | Download licensed model, verify local file | Existing authenticated backend authorization/decryption and local SHA-256 comparison |
| Upload | File, metadata, price/share, Register Model | Local hash; authenticated backend encryption/storage; MetaMask registration and receipt; existing safe rejection rollback/pending ambiguity protection |
| Dashboard | Refresh, View details, Access & verify | Actual account reads and model detail/access navigation |
| Dashboard | Deactivate/Reactivate, Withdraw | Existing owner-checked contract transactions and confirmed-state reload |
| Activity/history | Refresh, filters, pause/resume, older/show-more, retry | Existing adaptive scanner, bounded RPC work, cache and actual event filtering/pagination |
| Identity | Google/email, signup, profile edit/avatar, wallet link, reset password | Existing optional Supabase operations; wallet authorization remains independent |
| Footer | Activity/status, contract, profile | Real routes and configured-network contract explorer, not placeholder buttons |

## Safety boundaries

No backend, Solidity, authentication/session logic, encryption, access-service,
catalog request pooling, history scanner, dependency manifests/lockfiles or
production environment variables changed. No public transactions, redeployment,
merge or production release was performed. Public configuration remains external
to the design layer, not hardcoded to a network or wallet.

## Validation

- Frontend: 37 tests, lint, production build and JavaScript syntax checks.
- Backend: 21 tests. Contract: 6 tests, compilation and TypeScript check.
- Full isolated Chrome E2E: registration/cleanup, purchase/license, protected
  download/decryption, byte integrity, denial, wallet/account changes, duplicate
  provider events, session restore/expiry/invalidity, withdrawal and deactivation.
- Added v3 E2E: self-hosted fonts, Aurora reduced-motion behavior, SPA navigation,
  both route aliases, single navbar and all nine pages at five viewport widths
  (1440/1024/768/390/320). Existing drawer keyboard checks retained.
- History browser regression: mocked Sepolia complete history, filters,
  copy/explorer, pagination, pause/resume/cache/refresh, 429 handling and layouts.
- Secret scan and `git diff --check`. Blocking high-severity audits pass;
  backend/frontend have zero findings. Root dev toolchain has 9 existing low
  findings, not introduced by this frontend-only change.

## Limits and release gate

The existing Vite bundle-size advisory remains. Live Google/email/avatar writes,
live Pinata uploads and public Sepolia transactions were not repeated for a UI
change: browser regression uses isolated local storage/chain and mocked external
services. The history-browser suite uses mocked RPC data, never fabricated data
in the product. These results are not a claim of a new live production test.

Review the consolidated feature PR. **Do not merge or deploy without explicit
user approval.**
