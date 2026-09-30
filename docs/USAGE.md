# How to Use VaultSplitX

VaultSplitX is a privacy-preserving payment distribution dApp built on the **Midnight Network**. It enables organizations, DAOs, and freelance teams to disburse funds from a shared treasury pool without publicly revealing individual contractor rates, team salaries, or recipient identities on-chain.

---

## Table of Contents

1. [What You Need](#what-you-need)
2. [Application Navigation](#application-navigation)
3. [Step-by-Step Guide](#step-by-step-guide)
   - [Scenario A: For Vault Organizers (Creating a Distribution)](#scenario-a-for-vault-organizers-creating-a-distribution)
   - [Scenario B: For Contributors (Claiming Your Share Privately)](#scenario-b-for-contributors-claiming-your-share-privately)
   - [Scenario C: For Independent Auditors (Public Verification)](#scenario-c-for-independent-auditors-public-verification)
4. [What Gets Proved vs. What Stays Private](#what-gets-proved-vs-what-stays-private)
5. [Accessibility & User Experience Features](#accessibility--user-experience-features)
6. [Preprod Deployment Details](#preprod-deployment-details)
7. [Troubleshooting & Frequently Asked Questions](#troubleshooting--frequently-asked-questions)

---

## What You Need

Before using VaultSplitX, ensure you have:

1. **A Supported Web Browser:** Google Chrome, Brave, or Microsoft Edge.
2. **Midnight Lace Wallet Extension:**
   - Install the official [Midnight Lace Wallet](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk) from the Chrome Web Store.
   - Open Lace settings and switch network to **Midnight Preprod**.
   - Create or import a testnet account and unlock your wallet.
3. **Preprod Testnet Tokens (tDUST & tNIGHT):**
   - Transaction fees and distributions require testnet tokens.
   - Visit the official [Midnight Preprod Faucet](https://midnight-tmnight-preprod.nethermind.dev/) and request free test tokens to your unshielded wallet address.
4. **Built-in Reviewer Demo Mode (Zero-Install Alternative):**
   - If evaluating or reviewing without the Lace browser extension installed, click **Demo Mode** in the wallet connection modal.
   - Demo Mode runs the full zero-knowledge proof circuit client-side in your browser using an in-memory test wallet with pre-funded balances.

---

## Application Navigation

The VaultSplitX top navigation bar provides access to the four primary interfaces:

| Navigation Item | Route | Purpose |
|:---|:---|:---|
| **Vault** | `/vault` | View active distribution status, total locked funds, commitment counts, settled claims, spent nullifier list, and verifiable audit trails. |
| **Create** | `/create` | Set up a new distribution batch, configure private allocation rules, validate balances in real-time, register commitments on-chain, and export claim credentials. |
| **Claim** | `/claim` | Privately generate zero-knowledge proofs to claim allocated shares using JSON voucher files or manual credentials without revealing identity or amount. |
| **Verify** | `/verify` | Independent audit interface connected directly to the Midnight GraphQL indexer to verify ledger commitments and nullifiers without decrypting private data. |

---

## Step-by-Step Guide

### Scenario A: For Vault Organizers (Creating a Distribution)

As a vault organizer, you deposit treasury funds and register confidential commitments for each contributor. The smart contract stores opaque 32-byte cryptographic hashes—individual payout amounts and contributor names are never written to the blockchain.

#### 1. Connect Your Wallet
- Open VaultSplitX in your browser ([vaultsplitx.vercel.app](https://vaultsplitx.vercel.app)).
- Click **Connect Midnight Wallet** in the top navigation (or click **Demo Mode** for an instant reviewer session).
- If Midnight Lace is installed, approve the connection prompt. Ensure the status indicator shows **PREPROD**.

#### 2. Navigate to Create Vault (`/create`)
- Click **Create** in the navigation bar.
- Enter the basic distribution details:
  - **Distribution Title:** e.g., `Contributor Treasury Q4 Disbursement`.
  - **Distribution Purpose:** e.g., `Core engineering milestone compensation and grant payments`.
  - **Total Vault Funds (tDUST):** Enter the total aggregate pool amount (e.g., `100000`).
    - *Validation Guard:* Must be a positive integer greater than zero (`> 0`).

#### 3. Choose Allocation Mode & Add Recipients
VaultSplitX supports three flexible allocation modes:
- **Fixed Amounts:** Specify exact tDUST amounts for each contributor.
- **Percentage Split (%):** Allocate shares based on percentages (sum cannot exceed 100%).
- **Contribution Weights:** Distribute proportionally based on arbitrary team weights.

For each recipient row, configure:
- **Contributor Role / Label:** Descriptive name (e.g., `Lead ZK Protocol Architect`, `Security Auditor`).
  - *Validation Guard:* Names cannot be empty and cannot be duplicated across rows.
- **Payment Amount (tDUST) / Percentage:** The contributor's share.
  - *Validation Guard:* Must be strictly greater than zero.
- **Secret Passphrase / Seed:** A unique private phrase for that recipient (e.g., `contributor_alice_seed`).
  - *Validation Guard:* Each recipient must have a unique secret seed to avoid commitment collisions.

#### 4. Monitor Live Balance Counter & Inline Validation
- A dynamic **"Remaining: X tDUST"** counter displays available funds in real-time.
- If the sum of allocations exceeds the total vault funds, an inline warning is displayed, and the registration button is automatically disabled until the discrepancy is resolved.
- You can use the **Quick Test Presets** button to automatically populate sample recipient rows for testing.

#### 5. Register Allocation Commitments On-Chain
- Click **Register Allocation Commitment**.
- The `ProofActionButton` displays real-time proving stages:
  1. *Synthesizing private witnesses*
  2. *Evaluating allocation circuit*
  3. *Verifying inclusion on Midnight distribution ledger*
  4. *Deriving cryptographic commitments*
- A live elapsed timer runs during proof execution, and double-submits are prevented.
- Once submitted, a global toast notification confirms the on-chain registration, providing a clickable transaction hash and direct link to the [Midnight Subscan Explorer](https://midnight-preprod.subscan.io/).

#### 6. Irreversible Loss Security Modal & Credential Export
Immediately following successful registration, an **Irreversible Loss Security Warning Modal** appears:
- **Critical Security Notice:** Because Midnight uses true zero-knowledge privacy, claim details exist **only on your device**. If credentials are lost, they can never be recovered, recalculated, or reset by anyone—including the organizer or the Midnight network.
- **Action 1 — Download Claim File (JSON):** Click **Download claim file (JSON)** to save a comprehensive JSON voucher file containing distribution parameters, recipient roles, amounts, blinding salts, and identity seeds.
- **Action 2 — 1-Click Per-Recipient Copy:** Click the **Copy** button next to any individual contributor to copy their specific credential block to the clipboard.
- **Security Confirmation Gate:** To prevent accidental dismissal, you must check the **"I've saved these securely"** confirmation box before the modal allows you to close it.

#### 7. Share Credentials Privately
- Send each contributor their credential JSON file or private credential bundle over an encrypted channel (such as Signal, an encrypted email, or a secure password manager).
- Never publish claim credentials publicly.

---

### Scenario B: For Contributors (Claiming Your Share Privately)

As a contributor, you generate a client-side zero-knowledge proof that you know a valid allocation commitment in the vault. You claim your payout directly to your wallet without revealing your identity or your compensation amount to anyone on the blockchain.

#### 1. Connect Your Wallet
- Open VaultSplitX and click **Connect Midnight Wallet** (or select Demo Mode).
- Ensure your wallet is connected to **Midnight Preprod**.

#### 2. Navigate to Claim Portal (`/claim`)
- Click **Claim** in the navigation bar.

#### 3. Supply Your Claim Credentials

You can supply your credentials using any of the following methods:

##### Method 1: Import Claim File (Recommended & Fastest)
- Click **"Import claim file"** (or click **"Upload JSON File"**).
- Select the `.json` claim voucher file provided by your vault organizer.
- If the file contains credentials for multiple team members, a **Claim Selection Modal** will appear—simply select your role.
- All confidential fields (**Recipient Identity Secret**, **Allocated Amount**, **Blinding Salt**, and **Distribution Batch ID**) are auto-filled with 100% cryptographic precision, eliminating manual typing errors.

##### Method 2: Manual Input
- Enter the four confidential parameters provided by the organizer:
  - **Recipient Identity Secret:** Your private passphrase (private witness, never revealed on-chain).
  - **Allocated Amount (tDUST):** Your exact compensation amount (e.g., `25000`).
  - **Blinding Salt:** The 256-bit cryptographic salt used to randomize your commitment.
  - **Distribution Batch ID:** The 32-byte hex ID of the vault distribution batch.

##### Method 3: Quick Test Credentials
- Click one of the preloaded demo buttons (**Alice**, **Bob**, or **Carol**) to instantly test claiming a pre-registered allocation.

#### 4. Generate Zero-Knowledge Proof & Claim
- Click **Prove Entitlement & Claim Share**.
- The `ProofActionButton` initiates client-side proof generation:
  - **Stage 1 (Synthesizing):** Computes private witness bindings and validates salt entropy.
  - **Stage 2 (Circuit Evaluation):** Evaluates the Compact zero-knowledge arithmetic circuit.
  - **Stage 3 (Ledger Inclusion):** Verifies the commitment hash exists in the on-chain vault commitment set.
  - **Stage 4 (Nullifier Derivation):** Generates an un-linkable nullifier from your private secret to prevent double-spending.
- The transaction broadcasts the nullifier to the Midnight ledger and disburses your payout.
- A success toast notification displays the transaction confirmation with an explorer link.
- **Result:** Nobody on the blockchain knows who you are, which allocation was yours, or how much you received!

#### 5. Verify Anti-Cheat & Double-Claim Protections
- **Test Anti-Cheat Protection:** Click **"Simulate Cheat Attempt"** to modify your claimed payout by +10,000 tDUST. Notice that the zero-knowledge circuit immediately rejects the proof because the calculated commitment does not match the ledger.
- **Test Double-Claim Protection:** Try claiming the same allocation a second time. The Midnight smart contract detects that the nullifier is already present in `claimedNullifiers` and halts the transaction, preventing double payouts.

---

### Scenario C: For Independent Auditors (Public Verification)

Anyone can audit the distribution pool's solvency and compliance without compromising individual privacy.

#### 1. Navigate to Verify (`/verify`)
- Click **Verify** in the navigation bar.

#### 2. Sync Live Ledger State
- Click **Sync Indexer** to fetch the latest state directly from the Midnight GraphQL Indexer.
- Review public contract parameters:
  - **Organizer Verification Key:** The public key that initiated the distribution batch.
  - **Distribution Batch ID:** Unique 32-byte identifier for the active vault.
  - **Total Vault Funds:** Aggregate pool amount deposited into the contract.
  - **Allocation Commitments Set:** List of registered opaque 32-byte hashes.
  - **Claimed Nullifiers Set:** List of spent nullifiers preventing replay attacks.
  - **Claimed Count & Vault Status:** Current number of settled payouts and open/closed status.

#### 3. Mathematical Solvency Guarantee
- Auditors can verify that:
  $$\text{Claimed Count} \le \text{Total Commitments}$$
  and that no duplicate nullifiers exist in the set.
- All payouts are cryptographically sound, fully settled, and zero confidential data has been exposed.

---

## What Gets Proved vs. What Stays Private

Midnight's dual-state architecture divides contract state into public ledger fields and client-side private witnesses:

| Data Field | Visibility | Where It Lives | What Observers Learn |
|:---|:---|:---|:---|
| **Organizer Identity** | **Public** | On-Chain Ledger | Public key of vault creator |
| **Distribution Batch ID** | **Public** | On-Chain Ledger | Unique ID for the distribution pool |
| **Total Vault Funds** | **Public** | On-Chain Ledger | Aggregate pool size (e.g., 100,000 tDUST) |
| **Allocation Commitments** | **Public** | On-Chain Ledger | 32-byte opaque hashes (`0x7a3f...`) |
| **Claim Nullifiers** | **Public** | On-Chain Ledger | One-way hashes of spent claims |
| **Claimed Count** | **Public** | On-Chain Ledger | Total number of claims settled so far |
| **Recipient Wallet Identity** | **Private** | Client-Side Wallet | **Hidden** — unlinked to recipient identity |
| **Recipient Secret Passphrase** | **Private** | Client-Side Witness | **Hidden** — never leaves claimant's browser |
| **Individual Payment Amount** | **Private** | Client-Side Witness | **Hidden** — exact compensation remains confidential |
| **Blinding Salt** | **Private** | Client-Side Witness | **Hidden** — prevents dictionary & rainbow table attacks |
| **Nullifier-to-Commitment Link** | **Private** | Zero-Knowledge Math | **Hidden** — mathematically impossible to link |

### Built-in Terminology Tooltips
Across all screens, terms marked with an information icon (e.g., **Commitment**, **Nullifier**, **Salt**, **tDUST**) include interactive `InfoTooltip` helpers. Hover or tap to view plain-language definitions anytime.

---

## Accessibility & User Experience Features

VaultSplitX is designed to be accessible and intuitive for all users:

- **Theme Toggle:** Switch seamlessly between dark and light modes via the segmented toggle in the navigation header. Both modes comply with WCAG AAA contrast standards.
- **Mobile-First Responsive Layout:** All buttons, inputs, and interactive cards feature a minimum touch target size of 44px for comfortable phone and tablet use.
- **High-Contrast Keyboard Focus:** Full keyboard navigation support with prominent high-contrast focus rings (`focus-visible`) across all interactive elements.
- **Real-Time Toast Feedback:** Instant non-blocking notifications for wallet connections, copied addresses, proof progress, and transaction results with one-click hash copying.
- **Proof Progress & Timers:** Dynamic progress indicators with animated spinners and elapsed second counters keep you informed during ZK proof generation.

---

## Preprod Deployment Details

VaultSplitX is live and active on the **Midnight Preprod Testnet**:

| Parameter | Value |
|:---|:---|
| **Network** | Midnight Preprod (Testnet) |
| **Contract Address (Hex)** | `0xff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e` |
| **Bech32 Address** | `mn_addr_preprod1laxvdgfjz0dfn9m989ratya3au7lp29hed9hj4zhlgud4dsszc0qswq67n` |
| **Deployment Extrinsic** | `0xbaddc8360cd37c5383d72c7c4958d150a31d3d5eb951aaeac7d495d4927d9ed7` |
| **Deployment Block** | `#2614473` |
| **Total Vault Pool** | 100,000 tDUST |
| **On-Chain Volume** | 80+ Preprod Transactions |
| **Subscan Explorer** | [View Contract on Subscan ↗](https://midnight-preprod.subscan.io/contract/0xff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e) |
| **Live Web Application** | [https://vaultsplitx.vercel.app](https://vaultsplitx.vercel.app) |

---

## Troubleshooting & Frequently Asked Questions

### 1. "The wallet did not complete the connection"
- **Cause:** Midnight Lace browser extension was locked, rejected the connection request, or was not installed.
- **Solution:**
  1. Click the puzzle icon in your browser toolbar and ensure **Lace** is installed and unlocked.
  2. If not installed, click the install link in our wallet modal to install Lace from the Chrome Web Store.
  3. Ensure network inside Lace is switched to **Preprod**.
  4. Alternatively, click **Demo Mode** in the modal to test immediately without any browser extension.

### 2. "ZK Verification Failed: No matching allocation commitment found"
- **Cause:** One or more confidential claim parameters do not match the organizer's commitment.
- **Solution:**
  1. Cryptographic hashes are sensitive to every single character. Verify that your **Recipient Secret**, **Allocated Amount**, **Blinding Salt**, and **Distribution Batch ID** exactly match what was issued.
  2. Recommended fix: Use the **"Import claim file"** button on the Claim page to upload your `.json` voucher file directly. This prevents copy-paste errors or invisible trailing whitespace.

### 3. "Double-Claim Detected: Allocation already claimed"
- **Cause:** This allocation's unique nullifier has already been registered on the blockchain.
- **Solution:**
  - Each allocation can only be claimed once. Check the **Vault** page (`/vault`) to see the list of spent nullifiers and total claimed count.
  - If you already received your payment, the transaction is complete.
  - If you are testing, create a new allocation on the **Create** page with a new unique secret seed.

### 4. "Sum of allocations exceeds total vault funds"
- **Cause:** The total amount allocated across team members is greater than the total funds deposited into the vault.
- **Solution:**
  - On the **Create** page, check the live **Remaining: X tDUST** counter.
  - Either increase the **Total Vault Funds** field or reduce individual recipient amounts until the remaining balance is zero or positive.

### 5. "What if I lose my secret passphrase or claim file?"
- **Important:** Due to the mathematical guarantees of Midnight's zero-knowledge architecture, no private witness data is stored on-chain. If claim credentials are lost, they **cannot be recovered** by anyone (including the organizer or contract owner).
- Always use the **"Download claim file (JSON)"** feature when creating distributions and back up claim files in secure, encrypted storage.

### 6. Where can I get free testnet tokens?
- Visit the official [Midnight Preprod Faucet](https://midnight-tmnight-preprod.nethermind.dev/), paste your unshielded testnet wallet address, and request free tDUST and tNIGHT.
