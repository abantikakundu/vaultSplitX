# VaultSplitX

![CI](https://github.com/abantikakundu/vaultSplitX/actions/workflows/ci.yml/badge.svg?branch=main)

> A privacy-preserving payment distribution dApp built on Midnight that enables organizations to disburse shared funds without publicly exposing individual payment amounts.

## Live Demo

[Preprod demo URL — I will paste after deploying frontend]

## Contract Address

| Network  | Address                              |
|----------|--------------------------------------|
| Preprod  | [ADDRESS — I will paste after deploy]|

## What This Product Does

On traditional transparent blockchains, every payment, treasury transfer, and wallet balance is broadcast to the public. When organizations, DAOs, or freelance collectives distribute shared funds, all individual contractor rates, executive compensation, and team salaries become permanently visible to competitors, colleagues, and external observers. This complete lack of confidentiality forces Web3 projects into centralized, off-chain payroll solutions and exposes recipients to targeted exploitation.

VaultSplitX solves this challenge by leveraging Midnight's dual-state zero-knowledge architecture to enable confidential treasury distributions. A vault organizer deposits funds into a distribution batch and registers opaque cryptographic commitments for each recipient's allocation. The exact compensation amounts, blinding salts, and recipient keys are never stored on the public ledger.

Participants privately prove their entitlement to a specific payout using client-side zero-knowledge proofs. The smart contract validates that the claim matches a registered allocation and prevents double-claiming via un-linkable cryptographic nullifiers—all without revealing which team member claimed or what amount was disbursed. Potential applications include DAO contributor compensation, freelance team milestones, research grant funding, and private revenue sharing.

## Privacy Model

- **What is PUBLIC (on-chain, anyone can see):**
  - The organizer's public verification key (`organizer`).
  - The unique distribution batch identifier (`distributionId`).
  - The total aggregate funds deposited into the vault (`totalVaultFunds`).
  - The set of 32-byte opaque allocation commitments (`allocationCommitments`).
  - The set of spent claim nullifiers (`claimedNullifiers`) used to prevent replay attacks.
  - The public counter of successfully settled claims (`claimedCount`).
  - The open/closed lifecycle status flag (`isClosed`).

- **What is PRIVATE (private witness, never on-chain):**
  - The recipient's private identity secret (`recipientSecret`).
  - The individual payment or compensation amount (`allocatedAmount`).
  - The 256-bit cryptographic blinding salt (`allocationSalt`) preventing dictionary and rainbow table attacks.
  - The participant's private spending key (`claimSecret`) used to construct the nullifier.
  - The organizer's administrative signing key (`organizerSecret`).

- **What the user PROVES without revealing:**
  - The claimant proves knowledge of a valid `(recipientSecret, allocatedAmount, allocationSalt)` tuple whose derived commitment exists in the on-chain `allocationCommitments` set.
  - The claimant proves that their requested payout matches the exact amount allocated by the organizer.
  - The claimant proves that their generated nullifier is correctly derived and has not already been recorded in `claimedNullifiers`.
  - Observers learn only that an authorized participant claimed their valid share; no observer can determine who claimed, what amount they received, or link their wallet to any individual allocation commitment.

## Tech Stack

- **Smart Contracts:** Midnight Compact (`contracts/vaultSplitX.compact`, version 0.23)
- **Zero-Knowledge Runtime:** `@midnight-ntwrk/compact-runtime`, WASM circuit compilation
- **Midnight SDK:** `@midnight-ntwrk/midnight-js-contracts`, `@midnight-ntwrk/testkit-js`
- **Frontend:** React 19, TypeScript 5.9, Vite 8
- **Styling:** Custom Obsidian Dark Cyberpunk Theme & Utilities
- **Testing:** Vitest 4 with client-side circuit evaluation
- **CI/CD:** GitHub Actions (Automated install, compile, test, and build)

## Prerequisites

Before running or deploying VaultSplitX, ensure you have:

- **Node.js:** v22.12.0 or higher (v24 supported)
- **Midnight Lace Wallet:** Configured for the Midnight Preprod network
- **Docker:** (Optional) For running a local proof server when deploying contracts
- **Midnight Compact Toolchain:** `compact 0.5.1` (available natively or via WSL)

## Setup & Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abantikakundu/vaultSplitX.git
   cd vaultSplitX
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the Compact contract:**
   ```bash
   npm run compile
   ```

4. **Run the local development server:**
   ```bash
   npm run dev
   ```

5. **Open the application:**
   Navigate to `http://localhost:5173` in your browser.

## Run Tests

Run the automated Vitest test suite covering contract circuit derivations, nullifier uniqueness, replay protection, and strict privacy boundary verification:

```bash
npm test
```

To run tests in watch mode during development:

```bash
npm run test:watch
```

## CI/CD

VaultSplitX uses GitHub Actions for continuous integration. On every push and pull request to `main`, the workflow:
1. Sets up Node.js 22.
2. Installs JavaScript and Midnight dependencies.
3. Installs the Midnight Compact compiler.
4. Compiles `contracts/vaultSplitX.compact` to target WASM and ZKIR keys.
5. Executes all automated Vitest tests.
6. Builds the production frontend bundle (`npm run build`) ensuring zero errors.

## Usage Guide

See [docs/USAGE.md](docs/USAGE.md) for a comprehensive, non-technical step-by-step user manual and troubleshooting tips.

## Product X Profile

[PLACEHOLDER — I will add after creating the account]
