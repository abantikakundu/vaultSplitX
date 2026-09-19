# How to Use VaultSplitX

VaultSplitX is a privacy-preserving payment distribution platform built on Midnight. It allows teams, organizations, DAOs, and groups to distribute funds from a shared treasury without revealing individual compensation amounts, contractor rates, or recipient identities on a public blockchain.

---

## What You Need

Before using VaultSplitX, make sure you have:

1. **A Web Browser:** Google Chrome, Brave, or Microsoft Edge.
2. **Midnight Lace Wallet:** The official Midnight browser extension configured for the **Midnight Preprod** network.
3. **Preprod tDUST / tNIGHT Tokens:** Testnet tokens to pay for transaction fees (available for free from the [Midnight Preprod Faucet](https://midnight-tmnight-preprod.nethermind.dev/)).
4. **Offline Demo Mode (Alternative):** If you are evaluating or reviewing without the Lace extension, VaultSplitX includes a built-in Reviewer Demo mode that runs the complete zero-knowledge proof workflow locally in your browser.

---

## Step-by-Step Guide

### Scenario A: For Vault Organizers (Creating a Distribution)

1. **Connect Your Wallet:**
   - Open the VaultSplitX dApp.
   - Click **Connect Midnight Wallet** in the top-right header (or click **Demo Mode** for an instant reviewer session).
   - Ensure the network badge shows **PREPROD**.

2. **Access the Organizer Hub:**
   - Click on the **Organizer Vault Hub** tab.
   - Review your distribution batch details and aggregate pool balance.

3. **Register Private Allocations for Your Team:**
   - Under **Register New Private Allocation**, enter:
     - **Contributor Role / Label:** e.g., "Senior Protocol Engineer" or "Security Auditor".
     - **Payment Amount (tDUST):** The exact payment for this contributor (e.g., `25000`).
     - **Contributor Secret Passphrase:** A unique secret passphrase for that contributor.
   - Click **Register Allocation Commitment**.
   - VaultSplitX computes a salted cryptographic commitment hash (`0x7a3f...`) and registers it on Midnight. The actual payment amount and contributor name are **never stored on the blockchain**.

4. **Share Claim Credentials Privately:**
   - Send each contributor their private claim credentials (their secret passphrase, allocated amount, and salt) over a secure channel (such as an encrypted message or password manager).

---

### Scenario B: For Contributors (Claiming Your Share Privately)

1. **Connect Your Wallet:**
   - Click **Connect Midnight Wallet** (or choose Demo Mode).

2. **Navigate to the Private Claim Portal:**
   - Click on the **Private Claim Portal** tab.
   - You can also click **"Claim this Share"** or use the **Quick Test Credentials** buttons to instantly test with preloaded sample allocations.

3. **Enter Your Confidential Claim Details:**
   - Enter your **Recipient Identity Secret** (or seed).
   - Enter your agreed **Allocated Amount** (e.g., `25000`).
   - Enter your **Blinding Salt** and verify the **Distribution Batch ID**.

4. **Generate Your Zero-Knowledge Proof & Claim:**
   - Click **Prove Entitlement & Claim Share**.
   - Your browser will perform a 4-step client-side ZK proof:
     - Step 1: Synthesizes private witnesses.
     - Step 2: Evaluates the allocation circuit.
     - Step 3: Verifies inclusion against Midnight's distribution ledger.
     - Step 4: Derives an un-linkable nullifier.
   - The transaction publishes the nullifier to prevent double claims, and your payout is settled.
   - **Zero on-chain linkage:** Nobody on the blockchain knows who you are or how much you received!

5. **Test Double-Claim & Anti-Cheat Protection:**
   - Try clicking **"Simulate Cheat Attempt"** to alter your claimed amount (+10,000 tDUST) and observe the cryptographic circuit reject the invalid claim.
   - Try claiming the same share twice to verify that Midnight's nullifier set blocks double claims.

---

## What Gets Proved (and What Stays Private)

| Feature | On-Chain (Public to Everyone) | Client-Side (100% Private to You) |
| :--- | :--- | :--- |
| **Organizer Identity** | Public Organizer Key | Organizer Master Signing Key |
| **Distribution Pool** | Aggregate Total (e.g., 75,000 tDUST) | Individual team member breakdown |
| **Allocations** | 32-byte opaque commitment hashes | Exact payment amounts & salts |
| **Recipient Identity** | Hidden (Unlinked) | Recipient private secret |
| **Claim Status** | One-way nullifiers & claim count | Who owns which nullifier |
| **Double-Claim Check** | Verifiable on-chain nullifier set | The connection between nullifier & commitment |

### What the Zero-Knowledge Proof Guarantees:
1. **Entitlement Validity:** You prove you know the secret key and parameters corresponding to one of the organizer's committed allocations in the distribution.
2. **Exact Compensation:** You prove that your requested payout matches the committed allocation without publishing that amount.
3. **Anti-Replay:** You prove that your unique nullifier has not been spent before.

---

## Troubleshooting

### 1. "The wallet did not complete the connection"
- **Solution:** Open your Midnight Lace browser extension, ensure it is unlocked, switch the network setting to **Preprod**, and approve the connection prompt. Alternatively, use the built-in **Demo Mode** to test immediately.

### 2. "ZK Verification Failed: No matching allocation commitment found"
- **Solution:** Ensure that your recipient secret, allocated amount, blinding salt, and distribution ID match the exact values provided by the vault organizer. Changing even a single digit will alter the cryptographic hash.

### 3. "Double-Claim Detected: Allocation already claimed"
- **Solution:** Each allocation can only be claimed once. The contract checks the un-linkable nullifier against the public ledger. If the nullifier is already in `claimedNullifiers`, the transaction is safely rejected.

### 4. Need Test Tokens for Preprod?
- **Solution:** Visit the official [Midnight Preprod Faucet](https://midnight-tmnight-preprod.nethermind.dev/) and paste your unshielded wallet address to receive test tNIGHT and tDUST.
