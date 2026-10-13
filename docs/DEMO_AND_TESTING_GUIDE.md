# Demo and acceptance testing

[Documentation home](../README.md) · [User guide](USER_GUIDE.md) · [Release runbook](../PUBLIC_TESTNET_RUNBOOK.md)

## Prepare roles and evidence

Use separate **Creator**, **Buyer** and **Unlicensed** MetaMask accounts on Sepolia. Keep platform/deployer distinct where possible: it receives the platform share. Both Creator and Buyer should have small free Sepolia balances. Creator needs registration gas; Buyer needs price **plus gas**. Unlicensed reads/signatures generally need no ETH. A 0.01–0.02 ETH starting balance can help with a small demo, but is not a guaranteed budget.

Create a tiny non-sensitive package on macOS/Linux:

```sh
printf '%s' 'MontAI Sepolia public test model v1' > montai-test-model.bin
shasum -a 256 montai-test-model.bin
```

This is a delivery/integrity fixture, not a functional trained model. Suggested metadata: name **MontAI Sepolia Demo**, description **Public Sepolia test model for MontAI licensing demo**, category **Generative AI**, creator share **90%**. Use **0.001 ETH** as a small test price (type it directly); ensure the buyer has additional gas funds. The input spinner increments by `0.01`, while registration validation accepts positive prices with up to 18 decimal places.

Record only public evidence: release commit, URLs, date, chain/address, role public addresses, model ID, original SHA-256, ciphertext CID, mined transaction hashes and block numbers. Never record bearer tokens, signed challenges, private keys, wrapped keys or environment dumps.

## Public acceptance checklist

- [ ] Open website and health endpoint; health chain/address matches README. Allow a Render cold start.
- [ ] Creator connects on Sepolia; wallet signature succeeds without gas. Optional profile login is not required to prove a license.
- [ ] Upload the fixture and confirm encrypted storage finishes before MetaMask registration. Reject unsupported/empty/oversize files rather than treating them as success.
- [ ] Confirm `registerModel` receipt success. Save model ID and registration tx; listing and details match owner, price, CID and original SHA-256.
- [ ] Confirm protected record exists in private storage, without exposing its key contents; IPFS retrieves ciphertext, not plaintext.
- [ ] Buyer connects; fresh `hasLicense=false` before purchase. Submit `purchaseLicense`, save mined tx and verify `hasLicense=true` / License Owned afterward.
- [ ] Buyer signs backend auth challenge and downloads. Browser reports integrity verified; compare downloaded hash using `shasum -a 256` with original and chain hash. Also use Verify a local model file.
- [ ] Modify a copy of the fixture; local verification reports mismatch.
- [ ] Authenticate Unlicensed address and attempt the same model download. Browser Network panel shows **403**, no plaintext file; **401 alone is not sufficient** evidence because it only tests authentication.
- [ ] Switch Buyer → Unlicensed → Creator and change network. Stale session/license/access state must clear; no stale buyer access should survive. Re-authenticate when required.
- [ ] Creator can download through owner authorization without buying their own model. A second purchase by Buyer must not create another license.
- [ ] Activity/provenance links point to Sepolia and actual registration/purchase receipts. Load older blocks where necessary; empty current ranges do not imply no historical events.
- [ ] Dashboard shows pending creator/platform revenue; withdraw from the proper wallet when funded for gas. Save withdrawal tx and verify the balance updates. RoyaltyPaid is accrual evidence, not withdrawal evidence.
- [ ] If testing activation, creator deactivates the listing: new purchases stop; existing owner/license authorization remains. Reactivate afterward if the fixture should remain available.

## Persistence acceptance (operator)

Coordinate a backend restart/redeploy during a demo window. Keep the **same** contract, chain, bucket and master key. Ensure the disposable local ciphertext cache is absent. Re-authenticate Buyer and download again: private record recovery and IPFS retrieval must succeed with the same SHA-256. A session reset is expected; re-purchase is not. This proves provider persistence more directly than health or mocked tests. Do not delete private records or rotate the master key to simulate a restart.

## Developer checks

Run root compile/tests/typecheck, backend and frontend tests, frontend lint/build, secret scan and the local browser E2E described in [the runbook](../PUBLIC_TESTNET_RUNBOOK.md). Public wallet/provider tests remain manual. For test reports, distinguish executed checks from unexecuted items; a documentation PR does not prove current public provider availability.

Suggested result table:

| Check | Result | Public evidence / observation |
| --- | --- | --- |
| Creator registration | Pass / Fail / Not run | Model ID, tx, block |
| Buyer license | Pass / Fail / Not run | Purchase tx and address |
| Licensed download / SHA-256 | Pass / Fail / Not run | Hash only |
| Unlicensed denial | Pass / Fail / Not run | HTTP 403, role address |
| Wallet switching | Pass / Fail / Not run | State reset observation |
| Restart persistence | Pass / Fail / Not run | Same hash after restart |
