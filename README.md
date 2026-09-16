# MontAI

## Decentralized AI Model Marketplace

> **Discover. License. Verify.**

MontAI is a blockchain-powered marketplace for AI models. It allows
creators to register AI models, define licensing terms, and make models
available to buyers through blockchain-based licensing.

The project combines **React, Solidity, Hardhat, ethers.js, MetaMask,
IPFS, and Supabase**.

------------------------------------------------------------------------

## 1. Overview

MontAI separates the application into three main layers:

``` text
                    MONT AI
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
   BLOCKCHAIN        IPFS         SUPABASE
        |              |              |
        v              v              v
 Ownership         Model Files     User/App
 Licensing         & Metadata      Information
 Payments
 Verification
```

The actual AI model is **not stored directly on the blockchain**. Large
model files are intended to be stored on IPFS. The blockchain stores the
model's CID, hash, ownership, price, royalty and licensing state.

------------------------------------------------------------------------

## 2. Problem

AI creators need a reliable way to publish and license models while
buyers need transparent information about ownership, pricing and
licensing.

Traditional centralized approaches can create problems such as:

-   unclear ownership
-   centralized control
-   manual licensing
-   limited payment transparency
-   difficult integrity verification
-   high blockchain storage costs for large files

MontAI addresses these issues by using blockchain for trust and
licensing, IPFS for large files, and Supabase for application-level
data.

------------------------------------------------------------------------

## 3. Solution

### Blockchain

The `ModelChain` smart contract stores:

-   Model ID
-   Owner
-   Model name
-   IPFS CID
-   Model hash
-   Price
-   Royalty
-   Active status
-   License information

### IPFS

The actual model file is stored off-chain:

``` text
AI Model
   |
   v
 IPFS
   |
   v
 CID
   |
   v
ModelChain
```

### Supabase

Supabase supports application-level information such as:

-   user profiles
-   authentication/application data
-   supporting UI metadata where appropriate

Blockchain-owned information should remain sourced from the blockchain.

------------------------------------------------------------------------

## 4. Final Vision

``` text
                 +----------------+
                 |     MontAI     |
                 +-------+--------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
       DISCOVER        LICENSE        VERIFY
          |              |              |
          v              v              v
     Marketplace     MetaMask       Model Hash
          |              |              |
          v              v              v
    Model Details    Blockchain      Integrity
```

The goal is a complete marketplace where:

``` text
Creator
  |
  +--> Upload AI model
  |
  +--> Store file on IPFS
  |
  +--> Generate CID
  |
  +--> Calculate hash
  |
  +--> Register on ModelChain
  |
  v
Marketplace
  |
  +--> Buyer views model
  |
  +--> Buyer connects MetaMask
  |
  +--> Buyer purchases license
  |
  +--> Blockchain records license
  |
  v
Licensed model access + integrity verification
```

------------------------------------------------------------------------

## 5. Architecture

``` text
                         +----------------------+
                         |        USER          |
                         | Creator / Buyer      |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |       MontAI         |
                         |    React Frontend    |
                         +----------+-----------+
                                    |
             +----------------------+----------------------+
             |                      |                      |
             v                      v                      v
       +-----------+          +-----------+          +-----------+
       | MetaMask  |          | Supabase  |          |   IPFS    |
       |  Wallet   |          | App Data  |          | Model     |
       +-----+-----+          +-----------+          | Files     |
             |                                      +-----+-----+
             v                                            |
       +--------------------------------------------------+
       |                  ModelChain                      |
       |                                                  |
       | Model ID | Owner | Name | CID | Hash            |
       | Price | Royalty | Active | License State        |
       +------------------------+-------------------------+
                                |
                                v
                         EVM Blockchain
```

------------------------------------------------------------------------

## 6. Technology Stack

  Layer                Technology         Purpose
  -------------------- ------------------ -----------------------
  Frontend             React              User interface
  Routing              React Router       Navigation
  Styling              CSS                UI/UX
  Blockchain           Solidity           Smart contract
  Blockchain tooling   Hardhat            Development/testing
  Blockchain client    ethers.js          Contract interaction
  Wallet               MetaMask           Signing transactions
  Storage              IPFS               AI model files
  Backend              Supabase           User/application data
  Language             JavaScript / JSX   Frontend

------------------------------------------------------------------------

## 7. Smart Contract

### ModelChain

Current local development contract:

``` text
Address:
0x5FbDB2315678afecb367f032d93F642f64180aa3

Network:
Hardhat localhost

Chain ID:
31337

RPC:
http://127.0.0.1:8545
```

> This is a local development deployment. A production/testnet
> deployment will use a different contract address and network.

### Model structure

``` text
Model
 |
 +-- id
 +-- owner
 +-- name
 +-- cid
 +-- modelHash
 +-- price
 +-- royalty
 +-- active
```

### Main functions

``` text
registerModel()
getModel()
getModelCount()
purchaseLicense()
hasLicense()
verifyModel()
```

------------------------------------------------------------------------

## 8. Blockchain Flow

### Registration

``` text
Creator
   |
   v
Model metadata
   |
   +--> IPFS CID
   |
   +--> Model hash
   |
   +--> Price
   |
   +--> Royalty
   |
   v
registerModel()
   |
   v
ModelChain
   |
   v
Model ID
```

### Licensing

``` text
Buyer
  |
  v
Model Details
  |
  v
MetaMask
  |
  v
purchaseLicense(modelId)
  |
  v
ETH payment
  |
  v
Blockchain confirmation
  |
  v
hasLicense() = true
```

------------------------------------------------------------------------

## 9. IPFS Architecture

Large AI model files are not stored directly on Ethereum.

Instead:

``` text
model.zip
    |
    v
   IPFS
    |
    v
QmExampleCID...
    |
    v
ModelChain
```

The CID is stored on-chain as the model's content reference.

### Important

A CID is **not a password**.

If an unencrypted file is publicly retrievable through IPFS, anyone who
obtains the CID may be able to retrieve it. Therefore, licensed model
access must use an appropriate encryption/access-control design if the
model is not intended to be publicly downloadable.

MontAI should not claim that blockchain licensing alone makes an
unencrypted IPFS file private.

------------------------------------------------------------------------

## 10. Integrity Verification

MontAI uses a model hash to help verify that a downloaded file matches
the registered content.

``` text
              ORIGINAL MODEL
                    |
                    v
                SHA-256
                    |
                    v
             Blockchain Hash
                    |
                    |
             Download Model
                    |
                    v
                SHA-256
                    |
                    v
             Compare Hashes
               /                     /                   MATCH       DIFFERENT
            |             |
            v             v
        VERIFIED      NOT VERIFIED
```

------------------------------------------------------------------------

## 11. User Flows

### Creator

``` text
Connect Wallet
      |
      v
Upload Model
      |
      v
IPFS
      |
      v
CID + Hash
      |
      v
Enter metadata
      |
      v
Set price + royalty
      |
      v
Register on ModelChain
      |
      v
Marketplace listing
```

### Buyer

``` text
Marketplace
      |
      v
Select Model
      |
      v
View Details
      |
      v
Connect MetaMask
      |
      v
Purchase License
      |
      v
Blockchain Confirmation
      |
      v
Licensed Access
```

------------------------------------------------------------------------

## 12. Frontend Pages

### Home

Introduces MontAI and the decentralized AI marketplace.

### Marketplace

Displays AI models available for licensing.

Expected model card information:

-   name
-   description
-   category
-   creator
-   price
-   license state
-   details link

### Details

Displays blockchain-backed information:

-   Model ID
-   creator
-   price
-   royalty
-   CID
-   model hash
-   license status
-   purchase action

### Upload Model

Expected workflow:

``` text
Select file
 -> Upload to IPFS
 -> Generate CID
 -> Calculate hash
 -> Enter metadata
 -> Set price
 -> Set royalty
 -> Register on blockchain
```

### Dashboard

Shows:

``` text
My Models
Licensed Models
Model ID
Price
Royalty
Status
```

### Profile

Provides application-level profile information.

------------------------------------------------------------------------

## 13. Repository Structure

``` text
BlockChain_Project/
|
+-- contracts/
|   +-- ModelChain.sol
|
+-- scripts/
|   +-- deployment / interaction scripts
|
+-- test/
|   +-- smart contract tests
|
+-- hardhat.config.*
+-- package.json
|
+-- frontend/
    |
    +-- src/
    |   +-- assets/
    |   +-- components/
    |   +-- pages/
    |   |   +-- Home.jsx
    |   |   +-- Marketplace.jsx
    |   |   +-- Details.jsx
    |   |   +-- UploadModel.jsx
    |   |   +-- Dashboard.jsx
    |   |   +-- Profile.jsx
    |   |   +-- Login.jsx
    |   |   +-- Signup.jsx
    |   |
    |   +-- App.jsx
    |   +-- main.jsx
    |   +-- supabaseClient.js
    |
    +-- package.json
```

------------------------------------------------------------------------

## 14. Local Setup

### Install blockchain dependencies

``` bash
npm install
```

### Install frontend dependencies

``` bash
cd frontend
npm install
```

### Start Hardhat

``` bash
npx hardhat node
```

### Deploy locally

Use the project's deployment script.

After deployment, update the frontend contract configuration with the
deployed address.

### Start frontend

``` bash
cd frontend
npm run dev
```

### Hardhat console

``` bash
npx hardhat console --network localhost
```

Example:

``` javascript
const { ethers } = await network.connect();

const contract = await ethers.getContractAt(
  "ModelChain",
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);
```

Check model count:

``` javascript
await contract.getModelCount()
```

Retrieve model 1:

``` javascript
await contract.getModel(1)
```

Check license:

``` javascript
await contract.hasLicense(1, "WALLET_ADDRESS")
```

Purchase a test license:

``` javascript
await contract.purchaseLicense(
  1,
  {
    value: ethers.parseEther("0.01")
  }
)
```

These commands are for local testing only.

------------------------------------------------------------------------

## 15. Testing

Run smart-contract tests:

``` bash
npx hardhat test
```

The project should verify:

``` text
[ ] Model registration
[ ] Model retrieval
[ ] Model count
[ ] License purchase
[ ] License ownership
[ ] Payment validation
[ ] Duplicate license handling
[ ] Ownership restrictions
[ ] Royalty/payment logic
[ ] Model verification
[ ] Invalid model handling
```

Frontend end-to-end testing should verify:

``` text
[ ] Marketplace
[ ] Model Details
[ ] Wallet connection
[ ] MetaMask purchase
[ ] Transaction confirmation
[ ] Already licensed state
[ ] Upload flow
[ ] IPFS CID
[ ] Hash generation
[ ] Hash verification
[ ] Dashboard
[ ] Routing
[ ] Loading/error states
```

------------------------------------------------------------------------

## 16. Security

Before production deployment, audit:

### Smart contract

-   Access control
-   Ownership checks
-   Payment validation
-   Reentrancy risks
-   Duplicate purchases
-   Royalty distribution
-   Unauthorized modifications
-   Input validation
-   State transitions

### Frontend

Never commit:

``` text
Private keys
Seed phrases
Supabase service-role keys
Server-side secrets
```

Never ask users for private keys.

MetaMask should handle transaction signing.

### Network

The application must correctly handle:

-   wrong network
-   wrong chain ID
-   wrong contract address
-   rejected transactions
-   disconnected wallet
-   unavailable RPC
-   reverted transactions

------------------------------------------------------------------------

## 17. Production Deployment

The current development environment is:

``` text
React
   |
   +--> Hardhat localhost
   |      Chain ID 31337
   |
   +--> Local Supabase configuration
   |
   +--> IPFS development configuration
```

The intended production architecture is:

``` text
                       INTERNET
                          |
                          v
                  +---------------+
                  | MontAI Frontend|
                  +-------+-------+
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
      MetaMask        Supabase          IPFS
          |               |               |
          v               |               |
   Production/Testnet    App Data      Model Files
          |
          v
     ModelChain
          |
          v
    EVM Blockchain
```

Production configuration should be environment-based.

Typical public configuration values may include:

``` text
VITE_CONTRACT_ADDRESS
VITE_RPC_URL
VITE_CHAIN_ID
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
IPFS configuration
```

Never expose private server credentials in browser-side environment
variables.

------------------------------------------------------------------------

## 18. Deployment Checklist

``` text
[ ] Contract security reviewed
[ ] Contract tests passing
[ ] Frontend build passing
[ ] Production/testnet contract deployed
[ ] Contract address configured
[ ] Network configuration updated
[ ] IPFS provider configured
[ ] Upload tested
[ ] CID storage tested
[ ] Hash generation tested
[ ] Verification tested
[ ] MetaMask tested
[ ] License purchase tested
[ ] Incorrect payment tested
[ ] Duplicate purchase tested
[ ] Owner restrictions tested
[ ] Supabase production configured
[ ] No secrets committed
[ ] No private keys committed
[ ] No localhost dependency remains
[ ] No hardcoded model ID assumptions
[ ] Dummy data removed from production
[ ] Responsive UI tested
[ ] Console errors removed
[ ] Production build tested
```

------------------------------------------------------------------------

## 19. Development Roadmap

``` text
PHASE 1
Core Blockchain
    |
    +-- Model registration
    +-- Model retrieval
    +-- Licensing
    +-- License verification
    |
    v
PHASE 2
Frontend Integration
    |
    +-- Marketplace
    +-- Details
    +-- MetaMask
    +-- Dashboard
    |
    v
PHASE 3
IPFS + Verification
    |
    +-- File upload
    +-- CID
    +-- Hash
    +-- Verification
    |
    v
PHASE 4
UI/UX
    |
    +-- Marketplace redesign
    +-- Details redesign
    +-- Upload redesign
    +-- Dashboard redesign
    |
    v
PHASE 5
Security + Testing
    |
    +-- Contract audit
    +-- End-to-end testing
    +-- IPFS access review
    |
    v
PHASE 6
Deployment
    |
    +-- Production blockchain
    +-- Production IPFS
    +-- Supabase
    +-- Public frontend
```

------------------------------------------------------------------------

## 20. Current Status

### Working locally

-   [x] Hardhat blockchain
-   [x] ModelChain contract
-   [x] Model registration
-   [x] Model retrieval
-   [x] Model count
-   [x] License purchase
-   [x] License ownership check
-   [x] ethers.js integration
-   [x] MetaMask transaction flow
-   [x] React Marketplace
-   [x] React Details page
-   [x] Supabase integration
-   [x] Dashboard/application structure

### In progress

-   [ ] Complete IPFS upload integration
-   [ ] Upload-to-blockchain flow
-   [ ] Fully dynamic blockchain marketplace
-   [ ] Remove production dummy models
-   [ ] Dynamic model ID handling
-   [ ] Model hash verification
-   [ ] Licensed model access design
-   [ ] UI/UX redesign
-   [ ] Production configuration

### Before going live

-   [ ] Security audit
-   [ ] Full end-to-end testing
-   [ ] Production/testnet deployment
-   [ ] Production IPFS
-   [ ] Supabase production
-   [ ] Frontend hosting
-   [ ] Final deployment verification

------------------------------------------------------------------------

## 21. Design Principles

MontAI follows this separation:

``` text
+--------------------------------+
|          BLOCKCHAIN            |
|                                |
| Ownership                      |
| Model ID                       |
| Price                          |
| Royalty                        |
| CID                            |
| Model Hash                     |
| License State                  |
+--------------------------------+

+--------------------------------+
|              IPFS              |
|                                |
| Actual AI Model Files          |
| Large Model Data               |
+--------------------------------+

+--------------------------------+
|           SUPABASE             |
|                                |
| User Profiles                  |
| Application Data               |
| Supporting UI Metadata         |
+--------------------------------+
```

The blockchain is focused on **trust and licensing**.

IPFS is focused on **large-file storage**.

Supabase is focused on **application-level data**.

------------------------------------------------------------------------

## 22. Final Vision

``` text
                    +----------------+
                    |     MONT AI     |
                    +--------+-------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
           DISCOVER        LICENSE        VERIFY
              |              |              |
              v              v              v
         Marketplace     MetaMask       SHA-256
              |              |              |
              v              v              v
         Model Details   Blockchain      Integrity
              |              |              |
              +--------------+--------------+
                             |
                             v
                  DECENTRALIZED AI
                     MARKETPLACE
```

### In one sentence

> **MontAI is a decentralized AI marketplace that uses blockchain for
> ownership and licensing, IPFS for model storage, and cryptographic
> hashes for model integrity verification.**

------------------------------------------------------------------------

## License

This project is currently developed as an academic/project
implementation. Add the final open-source or project-specific license
before public distribution.
