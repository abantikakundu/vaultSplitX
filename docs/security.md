# VaultSplitX: Security Policy & Cryptographic Model

VaultSplitX is built from the ground up on Midnight's dual-state zero-knowledge architecture to eliminate trust, fraud, front-running, public salary leaks, and central points of failure in organizational fund distribution. This document outlines the security policies, cryptographic primitives, threat mitigations, and mathematical invariants governing the protocol.

---

## 1. Core Security Guarantees

| Security Property | Mechanism | Enforcement Layer |
|:---|:---|:---|
| **Zero Witness Exposure** | 256-bit CSPRNG salts & client-side ZK proofs | Client browser & Midnight Proof Server |
| **Commitment Integrity** | Cryptographic one-way hashing with domain separation | Compact smart contract (`vaultSplitX.compact`) |
| **Amount & Rate Confidentiality** | Private witness assertions & zero-knowledge set membership | Compact arithmetic circuit (`claimPayout`) |
| **Double-Claim Prevention** | Deterministic, single-use, un-linkable claim nullifiers | On-chain contract ledger (`claimedNullifiers` set) |
| **Organizer Access Control** | Secret-derived verification key preimage enforcement | Compact circuit (`organizerKey(organizerSecret()) == organizer`) |
| **Replay & Cross-Batch Isolation** | Strict binding of 32-byte `distributionId` into commitment schema | Cryptographic circuit constraint & ledger verification |
| **Identity Un-linkability** | Independent blinding salts $S_{\text{alloc}}$ and private claim secrets $S_{\text{claim}}$ | Dual cryptographic hashing circuits |
| **Batch Lifecycle Immutability** | One-way monotonic state transitions (`isClosed`, `claimedCount`) | Contract ledger & atomic state updates |
| **Auditable Fairness & Verifiability** | Client-side pure circuit bindings & automated Vitest verification suite | Pure circuit evaluation & testkit suites |

---

## 2. Cryptographic Primitives & Domain Separation

VaultSplitX employs strict cryptographic domain separation across all hashing routines using Midnight's `persistentHash` primitive. This guarantees collision resistance and prevents cross-protocol or type-confusion attacks:

1. **Organizer Verification Key Derivation**:
   $$K_{\text{organizer}} = \mathcal{H}\Big(\text{pad}(32, \text{"VaultSplitX:v1:organizer"}) \,\|\, S_{\text{organizer}}\Big)$$
   - $S_{\text{organizer}}$: 256-bit private master administrative secret of the vault organizer.
   - $K_{\text{organizer}}$: 32-byte public verification key stored on the Midnight ledger.

2. **Recipient Verification Key Derivation**:
   $$K_{\text{recipient}} = \mathcal{H}\Big(\text{pad}(32, \text{"VaultSplitX:v1:recipient"}) \,\|\, S_{\text{recipient}}\Big)$$
   - $S_{\text{recipient}}$: 256-bit private entitlement key held confidentially by the authorized contributor.
   - $K_{\text{recipient}}$: 32-byte intermediate recipient identifier bound into the allocation commitment.

3. **Confidential Allocation Commitment**:
   $$C_{\text{alloc}} = \mathcal{H}\Big(\text{pad}(32, \text{"VaultSplitX:v1:commitment"}) \,\|\, K_{\text{recipient}} \,\|\, \text{amount} \,\|\, S_{\text{alloc}} \,\|\, \text{distributionId}\Big)$$
   - $K_{\text{recipient}}$: Derived 32-byte recipient verification key.
   - $\text{amount}$: 64-bit unsigned integer (`Uint<64>`) cast as `Bytes<32>` representing the exact payment amount in tDUST.
   - $S_{\text{alloc}}$: 256-bit cryptographically secure pseudorandom salt ($2^{256}$ search space) preventing dictionary and rainbow table enumeration attacks on common pay rates.
   - $\text{distributionId}$: 32-byte unique distribution batch identifier permanently anchoring the allocation to a specific vault epoch.

4. **Confidential Claim Nullifier**:
   $$\text{Nullifier} = \mathcal{H}\Big(\text{pad}(32, \text{"VaultSplitX:v1:nullifier"}) \,\|\, C_{\text{alloc}} \,\|\, S_{\text{claim}}\Big)$$
   - $C_{\text{alloc}}$: 32-byte allocation commitment hash already registered on the public ledger.
   - $S_{\text{claim}}$: Private spending secret / claim key known only to the claimant.
   - The resulting 32-byte nullifier is published on-chain upon successful claim settlement. Because the hash is one-way, observers cannot link $\text{Nullifier}$ to $C_{\text{alloc}}$, $K_{\text{recipient}}$, or the claimant's public wallet address.

---

## 3. Mathematical Invariants & Circuit Constraints

### 3.1 Strict Positive Allocation Constraint
To prevent zero-value spam, phantom withdrawals, or arithmetic underflows:
$$\text{assert}(\text{disclose}(\text{amount} > 0), \text{"Allocated amount must be greater than zero"})$$

The witness `allocatedAmount()` is evaluated in the arithmetic circuit, ensuring that only non-zero positive disbursements can ever be claimed.

### 3.2 Cryptographic Commitment Membership Assertion
In VaultSplitX, the claimant never discloses which specific allocation slot or salary figure belongs to them:
$$C_{\text{alloc}} = \text{computeAllocationCommitment}(K_{\text{recipient}}, \text{amount}, S_{\text{alloc}}, \text{targetDistributionId})$$
$$\text{assert}(\text{allocationCommitments}.\text{member}(C_{\text{alloc}}), \text{"Invalid claim: No matching allocation found"})$$

The circuit evaluates the one-way hash within the zero-knowledge boundary and checks membership against the ledger's public set of registered commitments. Observers confirm only that a valid allocation exists in the set without discovering *which* commitment was satisfied or who is claiming.

### 3.3 Nullifier Uniqueness & Anti-Double-Claim Invariant
To enforce strict single-payout semantics without compromising privacy:
$$\text{Nullifier} = \text{computeClaimNullifier}(C_{\text{alloc}}, S_{\text{claim}})$$
$$\text{assert}(!\text{claimedNullifiers}.\text{member}(\text{Nullifier}), \text{"Double claim detected: Allocation already claimed"})$$
$$\text{claimedNullifiers}.\text{insert}(\text{Nullifier})$$
$$\text{claimedCount}.\text{increment}(1)$$

By the deterministic properties of `persistentHash`, the exact same $(C_{\text{alloc}}, S_{\text{claim}})$ inputs generate the identical nullifier. Any subsequent attempt to claim the same allocation results in an immediate circuit assertion failure, preventing replay and double-claiming attacks.

### 3.4 Distribution Batch Isolation & Anti-Replay
To prevent cross-vault replay attacks across multiple distributions:
$$\text{assert}(\text{disclose}(\text{targetDistributionId}) == \text{distributionId}, \text{"Distribution ID mismatch"})$$
$$\text{assert}(!\text{isClosed}, \text{"Distribution is closed"})$$

Commitments registered under Batch $A$ cannot be claimed under Batch $B$, even if the recipient secret, amount, and salt are identical, because $\text{distributionId}$ is cryptographically baked into $C_{\text{alloc}}$.

### 3.5 Organizer Administrative Authority Invariant
Access control over privileged operations is strictly bounded by public key preimage proofs:
$$\text{assert}(\text{organizerKey}(\text{organizerSecret}()) == \text{organizer}, \text{"Unauthorized: Only organizer can register allocations"})$$

No third party or malicious actor can register commitments or close a vault without possessing the 256-bit `organizerSecret`.

---

## 4. Operational Security & Anti-Fraud Measures

### 4.1 256-Bit Blinding Salt Entropy ($2^{256}$ Security Margin)
In financial distributions, compensation values frequently fall into predictable ranges or standardized salary tiers (e.g., 5,000, 10,000, or 25,000 tokens). Without a blinding salt, an adversary who observes $C_{\text{alloc}}$ could mount offline dictionary or rainbow table attacks to deduce contributor pay rates.
- VaultSplitX pairs every allocation with an independent 256-bit CSPRNG blinding salt $S_{\text{alloc}}$.
- Searching the $2^{256}$ entropy space is computationally infeasible, rendering brute-force or dictionary attacks impossible.

### 4.2 Non-Linkability & Dual-State Privacy
Midnight's dual-state execution model enforces a strict firewall between private witnesses and the public ledger:
- **Private State:** `organizerSecret`, `recipientSecret`, `allocatedAmount`, `allocationSalt`, and `claimSecret` remain isolated inside the client's local execution environment and are never broadcast over the network.
- **Public State:** The on-chain ledger records only opaque 32-byte hashes (`allocationCommitments`, `claimedNullifiers`), the batch ID, aggregate total funds, and the claim counter.
- **Unlinkable Payouts:** Because nullifiers are constructed using an independent private secret $S_{\text{claim}}$, even if an observer monitors all transactions in a block, they cannot correlate a spent nullifier to any specific commitment in `allocationCommitments`.

### 4.3 Client-Side Cheat Attempt Simulation
The VaultSplitX dApp features a built-in simulation engine demonstrating cryptographic boundary enforcement:
- Simulating a tampered payout (+10,000 tDUST) changes the commitment preimage, causing immediate circuit rejection (`"No matching allocation found"`).
- Re-submitting an already claimed allocation triggers the nullifier set collision check (`"Double claim detected: Allocation already claimed"`).

### 4.4 Strict State Machine Lifecycle
Distribution batches follow an irreversible monotonic lifecycle:
- **ACTIVE / OPEN (`isClosed = false`):** Organizer can register allocation commitments; eligible participants can generate zero-knowledge proofs and settle payouts.
- **CLOSED (`isClosed = true`):** The organizer permanently seals the vault (`closeDistribution()`). Further registrations and claims are immediately aborted by the contract assertion `assert(!isClosed)`. Rollback to open status is mathematically impossible.

---

## 5. Independent Cryptographic Auditing & Verification

The protocol guarantees that participants, organizers, and third-party auditors do not need to rely on blind trust. Integrity can be independently validated via:
- **Pure Circuit Test Suite:** Automated Vitest suite (`tests/vaultSplitX.test.ts`) verifies domain separation, commitment sensitivity, nullifier collision resistance, and zero witness leakage. Run locally via:
  ```bash
  npm test
  ```
- **Direct Circuit Bindings:** Exported pure circuits in `managed/vaultSplitX/contract/index.js` allow independent verification of `deriveOrganizerKey`, `deriveRecipientKey`, `deriveAllocationCommitment`, and `deriveClaimNullifier`.
- **Preprod Subscan Explorer:** All smart contract state variables, commitment insertions, nullifier sets, and execution extrinsics can be audited on-chain at:
  - Contract: `0xff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e`
  - Explorer: [Midnight Preprod Subscan](https://midnight-preprod.subscan.io/contract/0xff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e)

---

## 6. Vulnerability Disclosure Policy

If you discover a potential vulnerability or security issue in VaultSplitX:
1. Please report it privately via GitHub Security Advisories or reach out on our official communication channel ([@VaultSplitX](https://x.com/VaultSplitX)).
2. Provide detailed steps to reproduce the issue, including network parameters, transaction payloads, and circuit traces.
3. We follow coordinated disclosure guidelines and will promptly investigate, patch, and publicly credit confirmed security findings.
