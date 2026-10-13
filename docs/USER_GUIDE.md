# User guide

[Documentation home](../README.md) · [Troubleshooting](TROUBLESHOOTING.md)

## Start from zero

Use a desktop browser with the official [MetaMask extension](https://metamask.io). Create or import your wallet inside MetaMask; store its recovery phrase privately offline. No MontAI form, faucet or teammate needs your recovery phrase or private key.

Open MetaMask's network selector, enable **Show test networks**, and select **Sepolia** (Ethereum testnet, chain ID `11155111`). Interface labels can vary by version: see [MetaMask's testnet instructions](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask/). MontAI can request switching; if Sepolia is absent, it can request adding it. Review the prompt and reject unexpected networks. Never select Ethereum Mainnet for this demo.

Copy your public wallet address and use a free faucet from the [Ethereum network/faucet directory](https://ethereum.org/developers/docs/networks/#sepolia). Eligibility, cooldowns and quotas vary. Wait for the faucet transaction and check your **Sepolia** balance. Do not buy real ETH to qualify for a demo faucet. A teammate may transfer existing test ETH to your public address.

Prepare separate Creator, Buyer and Unlicensed accounts. A small balance such as 0.01–0.02 Sepolia ETH is a starting budget, not a guarantee: gas and chosen price vary. Creator pays registration gas. **Buyer pays the license price plus transaction gas.** The unlicensed denial test normally needs no ETH because reads and signatures do not submit transactions.

Open [MontAI](https://montai-six.vercel.app). You can browse public listings without buying. [Backend health](https://montai-api.onrender.com/health) should report `ok`, chain `11155111` and the README contract address. Render Free can sleep; the first request may be delayed while it wakes. The UI shows a delayed access-service notice and allows up to 90 seconds. Retry manually after a timeout; do not repeatedly submit wallet transactions. See [Render Free behavior](https://render.com/docs/free).

## Connect and authenticate

Choose **Sign in with MetaMask** in the authentication panel (or open Sign in), connect the intended account and approve Sepolia switching if requested. Wallet sign-in requests a nonce-based wallet signature containing the configured origin, chain, contract, wallet and expiry. This proves control of the address and costs no gas. Read it before signing. It does not buy a license. Sessions last up to one hour; challenges expire after five minutes and are single-use. A backend restart requires another signature. Optional Google/Supabase profile login does not confer a blockchain license.

## Creator: publish a model

1. Select the Creator account on Sepolia and check gas balance. Prefer an account distinct from the platform/deployer.
2. Click **Publish a Model** (upload page). Enter name, description, category, positive ETH license price and a whole-number creator share from 0 to 100. The platform receives the remainder.
3. Select a **non-empty** `.zip`, `.onnx`, `.pt`, `.pkl`, `.bin` or `.safetensors` file, at most **25 MB (25 × 1024 × 1024 bytes)**. Name must be nonblank and at most 160 characters; description at most 2,000; category at most 80. A ZIP is a single package. Extensions are accepted package types, not evidence of safe or executable contents.
4. After wallet sign-in succeeds, click **Register Model**. The app hashes the file, authenticates the wallet, uploads it to the backend and waits for encrypted storage. This is one staged flow, not a separate manual IPFS upload. Keep the same wallet throughout.
5. After **Encrypted IPFS upload complete**, review and confirm `registerModel` in MetaMask. The transaction stores metadata references, hash, price and share; file bytes remain off-chain.
6. Wait for **Transaction submitted. Waiting for confirmation…** to finish. Success opens the model detail page with its ID and registration evidence. Check Marketplace, Dashboard and Activity. Save the original file and SHA-256 for comparison.

If upload succeeds but registration is rejected, no listing is created yet. Check Marketplace and the wallet's transaction history before retrying, especially if a transaction was already submitted. Do not publish sensitive or untrusted executable files.

## Buyer: license and download

1. Switch to the separate Buyer wallet on Sepolia. Ensure balance exceeds displayed price plus gas.
2. Open an active model from Marketplace. Confirm creator, price and contract/network evidence. Choose **License Model** and approve MetaMask's purchase transaction.
3. Wait for mining and fresh on-chain confirmation. **License Owned** means this address has a license; **Creator access** indicates the owner can already download and cannot buy their own model.
4. Choose **Download licensed model** in **Access & verify**, complete **Sign in with MetaMask** first if your session is missing/expired, then wait. The backend checks the address against the contract, retrieves ciphertext and decrypts it. The browser compares the resulting SHA-256 with the chain record before requesting the file download.
5. Expect **Model integrity verified. Download ready.** Use **Verify a local model file** to compare a saved file with the registered hash. A different file should report an integrity failure.

Licenses are bound to the purchasing address; changing wallets does not transfer a license. Dashboard lists your created models/licenses and pending revenue. Creators can deactivate/reactivate listings and withdraw accrued revenue with gas-paying transactions. Deactivation prevents new purchases; the backend owner/license check does not revoke previously purchased download access.

## Unlicensed test and common states

Switch to a third address that neither owns nor licensed the model, authenticate it, and click Download licensed model. Expect **An on-chain license is required** and HTTP **403**; no plaintext download should occur. HTTP 401 instead means authentication is missing/expired and does not prove license denial.

| State | Meaning / action |
| --- | --- |
| No active registrations yet | No active models in the current registry; not necessarily an error |
| Wrong network / wallet unavailable | Unlock/install MetaMask and select Sepolia |
| License check unavailable | RPC read failed; wait/refresh before purchasing |
| Listing inactive | New purchases disabled by creator |
| Checking access / authorizing download | Backend authentication and permission work in progress |
| Service wake-up notice | Allow cold-start time, then retry manually if needed |
| Integrity verification failed | Bytes differ from chain hash; do not treat as verified |
| Rejected signature/transaction | Action stopped; inspect wallet history before retrying |

Activity loads event ranges, not an indexed full history. Use **Load older blocks** to find earlier events; an empty range does not prove there were no historical registrations.
