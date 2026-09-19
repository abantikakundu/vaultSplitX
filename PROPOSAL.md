# Product Proposal: VaultSplitX

> **Submission Status:** Approved for Level 4 Midnight Builder Challenge.

---

## What is the product, and who uses it?

**VaultSplitX** is a privacy-preserving payment distribution dApp built on Midnight that enables teams, organizations, DAOs, and groups to distribute shared funds without publicly exposing individual payment amounts.

A distribution can be created with predefined rules, such as fixed shares, percentages, or contribution-based allocations. Participants can privately prove that they are entitled to a specific payment, while zero-knowledge proofs verify that the overall distribution follows the agreed rules and that the total funds are accounted for correctly.

### Who Uses It:
- **DAO Treasuries & Working Groups:** Disburse contributor compensation without publicly doxxing individual pay rates or salaries.
- **Freelance Teams & Agencies:** Split project milestone payments among contractors and specialists with confidential agreed-upon shares.
- **Grant Programs & Foundations:** Award funding allocations to researchers and developers while protecting recipient privacy and security.
- **Startups & Web3 Organizations:** Execute confidential bonus and revenue-sharing distributions with verifiable on-chain accounting.

---

## Why Midnight Specifically?

On traditional transparent blockchains (like Ethereum, Cardano, or Solana), all payment transactions, wallet balances, and distribution splits are permanently recorded on a public ledger. Anyone—including competitors, bad actors, and colleagues—can inspect individual salaries, contractor rates, or treasury payouts.

This total exposure leads to:
1. **Financial Disadvantage:** Public compensation details weaken negotiation leverage and expose contributors to targeted phishing and social engineering attacks.
2. **Privacy Violations:** Organizations are forced to use off-chain centralized payroll services, sacrificing blockchain trust and self-custody.

### Midnight's Value Proposition:
Midnight solves this fundamental conflict through dual-state zero-knowledge architecture and selective disclosure:
- **Confidential Allocations:** Individual payment amounts, recipient identities, and blinding factors are held as client-side private witnesses and never touch the public ledger.
- **Verifiable Settlement:** Zero-knowledge proofs independently verify that the claimant is an authorized participant entitled to the exact payout, that the allocation belongs to the registered distribution, and that total funds balance accurately.
- **Double-Claim Prevention:** Cryptographic nullifiers ensure each allocated share can only be claimed once, preserving complete unlinkability between the recipient's identity and their claimed share.

---

## Data Model

| Data Point | Type | Disclosed To | Description |
| :--- | :--- | :--- | :--- |
| **Vault Organizer Key** | Public Ledger | Everyone | Public verification identity of the distribution creator |
| **Distribution Batch ID** | Public Ledger | Everyone | Unique identifier for the payment distribution cycle |
| **Total Vault Funds** | Public Ledger | Everyone | Aggregate funding allocated for the batch |
| **Allocation Commitments** | Public Ledger | Everyone | Opaque cryptographic hashes of individual private allocations |
| **Claimed Nullifiers** | Public Ledger | Everyone | One-way nullifiers preventing replay/double-claims |
| **Claim Counter** | Public Ledger | Everyone | Public tally of completed claims |
| **Recipient Identity Secret** | Private Witness | Recipient Only | Private key proving authorization |
| **Individual Payment Amount** | Private Witness | Recipient & Organizer | Confidential compensation amount |
| **Allocation Blinding Salt** | Private Witness | Recipient Only | Cryptographic salt preventing rainbow table analysis |
| **Claim Nullifier Secret** | Private Witness | Recipient Only | Secret deriving un-linkable nullifier |
| **Entitlement ZK Proof** | ZK Proof | Smart Contract Only | Verifies allocation validity without revealing values |

---

## Mainnet Feasibility

VaultSplitX addresses an acute, multi-billion-dollar pain point in Web3 treasury management and contractor payroll. As Web3 teams scale, confidential compensation is one of the single most requested enterprise privacy features.

### Roadmap to Production Mainnet:
1. **Level 4 MVP (Current):** Dual-mode dApp on Midnight Preprod with Compact contract, client-side proof generation, Lace wallet integration, and audit explorer.
2. **Treasury Multisig & Token Support:** Native integration with Midnight shielded tokens and multi-party threshold approval for treasury disbursements.
3. **Automated Merkle Batching:** Large-scale distribution trees supporting thousands of contributors per batch with sub-second proof generation.
4. **Integration with Payroll & Invoicing Standards:** CSV/spreadsheet export and import for seamless accounting compliance without sacrificing individual privacy.
