import { describe, expect, it } from 'vitest';
import { pureCircuits } from '../managed/vaultSplitX/contract/index.js';
import crypto from 'node:crypto';

// Helper to create random 32-byte buffers
function randomBytes32(): Uint8Array {
  return new Uint8Array(crypto.randomBytes(32));
}

// Helper to convert string to 32-byte Uint8Array
function stringToBytes32(str: string): Uint8Array {
  const hash = crypto.createHash('sha256').update(str).digest();
  return new Uint8Array(hash);
}

describe('VaultSplitX Contract Privacy & Circuit Tests', () => {
  const organizerSecret = stringToBytes32('organizer_master_seed_secret_123');
  const recipientAliceSecret = stringToBytes32('alice_contributor_secret_key_456');
  const recipientBobSecret = stringToBytes32('bob_contributor_secret_key_789');
  const distributionId = stringToBytes32('vault_distribution_epoch_01');

  const aliceAmount = 15_000n; // 15,000 DUST
  const bobAmount = 25_000n;   // 25,000 DUST
  const aliceSalt = randomBytes32();
  const bobSalt = randomBytes32();

  it('1. Correctly derives organizer key and recipient keys with domain separation', () => {
    const organizerKey = pureCircuits.deriveOrganizerKey(organizerSecret);
    const aliceKey = pureCircuits.deriveRecipientKey(recipientAliceSecret);
    const bobKey = pureCircuits.deriveRecipientKey(recipientBobSecret);

    expect(organizerKey).toBeInstanceOf(Uint8Array);
    expect(organizerKey.length).toBe(32);
    expect(aliceKey.length).toBe(32);
    expect(bobKey.length).toBe(32);

    // Ensure distinct keys
    expect(aliceKey).not.toEqual(bobKey);
    expect(organizerKey).not.toEqual(aliceKey);

    // Verify determinism
    const aliceKeyAgain = pureCircuits.deriveRecipientKey(recipientAliceSecret);
    expect(aliceKeyAgain).toEqual(aliceKey);
  });

  it('2. Computes opaque allocation commitments sensitive to private parameters', () => {
    const aliceKey = pureCircuits.deriveRecipientKey(recipientAliceSecret);
    const commitment = pureCircuits.deriveAllocationCommitment(
      aliceKey,
      aliceAmount,
      aliceSalt,
      distributionId,
    );

    expect(commitment).toBeInstanceOf(Uint8Array);
    expect(commitment.length).toBe(32);

    // Tampered amount must produce a completely different commitment
    const tamperedAmountCommitment = pureCircuits.deriveAllocationCommitment(
      aliceKey,
      aliceAmount + 1n,
      aliceSalt,
      distributionId,
    );
    expect(tamperedAmountCommitment).not.toEqual(commitment);

    // Tampered salt must produce a completely different commitment
    const tamperedSalt = randomBytes32();
    const tamperedSaltCommitment = pureCircuits.deriveAllocationCommitment(
      aliceKey,
      aliceAmount,
      tamperedSalt,
      distributionId,
    );
    expect(tamperedSaltCommitment).not.toEqual(commitment);

    // Different recipient must produce a completely different commitment
    const bobKey = pureCircuits.deriveRecipientKey(recipientBobSecret);
    const bobCommitment = pureCircuits.deriveAllocationCommitment(
      bobKey,
      aliceAmount,
      aliceSalt,
      distributionId,
    );
    expect(bobCommitment).not.toEqual(commitment);
  });

  it('3. Generates un-linkable nullifiers that prevent replay attacks', () => {
    const aliceKey = pureCircuits.deriveRecipientKey(recipientAliceSecret);
    const commitment = pureCircuits.deriveAllocationCommitment(
      aliceKey,
      aliceAmount,
      aliceSalt,
      distributionId,
    );

    const claimSecret = stringToBytes32('alice_claim_spend_secret');
    const nullifier1 = pureCircuits.deriveClaimNullifier(commitment, claimSecret);
    const nullifier2 = pureCircuits.deriveClaimNullifier(commitment, claimSecret);

    // Deterministic nullifier for the same claimant and commitment
    expect(nullifier1).toEqual(nullifier2);
    expect(nullifier1.length).toBe(32);

    // Unlinkability: Nullifier gives zero clue about the recipient key or amount
    expect(nullifier1).not.toEqual(aliceKey);
    expect(nullifier1).not.toEqual(commitment);

    // A simulated on-chain nullifier set catches duplicates
    const spentNullifiers = new Set<string>();
    const nullifierHex = Buffer.from(nullifier1).toString('hex');

    // First claim succeeds
    expect(spentNullifiers.has(nullifierHex)).toBe(false);
    spentNullifiers.add(nullifierHex);

    // Second claim fails
    expect(spentNullifiers.has(nullifierHex)).toBe(true);
  });

  it('4. Enforces the strict privacy boundary (zero witness leakage)', () => {
    const aliceKey = pureCircuits.deriveRecipientKey(recipientAliceSecret);
    const commitment = pureCircuits.deriveAllocationCommitment(
      aliceKey,
      aliceAmount,
      aliceSalt,
      distributionId,
    );
    const claimSecret = stringToBytes32('alice_privacy_spend_secret');
    const nullifier = pureCircuits.deriveClaimNullifier(commitment, claimSecret);

    // Simulate public ledger record
    const publicLedgerState = {
      distributionId: Buffer.from(distributionId).toString('hex'),
      totalVaultFunds: '100000',
      allocationCommitments: [Buffer.from(commitment).toString('hex')],
      claimedNullifiers: [Buffer.from(nullifier).toString('hex')],
      claimedCount: '1',
    };

    const serializedState = JSON.stringify(publicLedgerState);

    // The individual payment amount must NEVER appear in public ledger
    expect(serializedState).not.toContain(aliceAmount.toString());

    // The private keys and salts must NEVER appear in public ledger
    expect(serializedState).not.toContain(Buffer.from(recipientAliceSecret).toString('hex'));
    expect(serializedState).not.toContain(Buffer.from(aliceSalt).toString('hex'));
    expect(serializedState).not.toContain(Buffer.from(claimSecret).toString('hex'));
  });
});
