/**
 * VaultSplitX: Cryptographic and Contract Interaction Helpers
 *
 * Implements client-side derivation using Midnight Compact pureCircuits:
 * 1. Organizer Key: pureCircuits.deriveOrganizerKey(secret)
 * 2. Recipient Key: pureCircuits.deriveRecipientKey(secret)
 * 3. Allocation Commitment: pureCircuits.deriveAllocationCommitment(recipientKey, amount, salt, distId)
 * 4. Claim Nullifier: pureCircuits.deriveClaimNullifier(commitment, claimSecret)
 */

import { pureCircuits } from '../contract/index.js';
import {
  hexToBytes as hexToBytesImpl,
  bytesToHex as bytesToHexImpl,
  generateRandomHex,
  pad32String,
  bigintToBytes32,
} from '../midnight/crypto';
import deployment from '../../deployment.json';

export interface ContributorAllocation {
  id: string;
  role: string;
  recipientKey: string;
  recipientSecret: string;
  amount: bigint;
  salt: string;
  commitment: string;
  claimed: boolean;
  txHash?: string;
}

export interface DistributionVaultState {
  organizerKey: string;
  distributionId: string;
  title: string;
  totalVaultFunds: bigint;
  commitments: string[];
  claimedNullifiers: string[];
  claimedCount: number;
  isClosed: boolean;
  allocations: ContributorAllocation[];
  contractAddress: string;
}

export interface ClaimSubmission {
  distributionId: string;
  recipientSecret: string;
  amount: bigint;
  salt: string;
  claimSecret: string;
}

export interface ClaimVerificationResult {
  success: boolean;
  commitment: string;
  nullifier: string;
  txHash?: string;
  message: string;
  timestamp: string;
}

export const hexToBytes = hexToBytesImpl;
export const bytesToHex = bytesToHexImpl;
export const padString32 = pad32String;
export { bigintToBytes32 };

export function generateRandomHex32(): string {
  return generateRandomHex(32);
}

/**
 * Derive Organizer Key via Midnight Compact circuit
 */
export async function deriveOrganizerKey(organizerSecret: Uint8Array): Promise<Uint8Array> {
  return pureCircuits.deriveOrganizerKey(organizerSecret);
}

/**
 * Derive Recipient Key via Midnight Compact circuit
 */
export async function deriveRecipientKey(recipientSecret: Uint8Array): Promise<Uint8Array> {
  return pureCircuits.deriveRecipientKey(recipientSecret);
}

/**
 * Derive Allocation Commitment via Midnight Compact circuit
 */
export async function deriveAllocationCommitment(
  recipientKey: Uint8Array,
  amount: bigint,
  salt: Uint8Array,
  distributionId: Uint8Array,
): Promise<Uint8Array> {
  return pureCircuits.deriveAllocationCommitment(recipientKey, amount, salt, distributionId);
}

/**
 * Derive Claim Nullifier via Midnight Compact circuit
 */
export async function deriveClaimNullifier(
  commitment: Uint8Array,
  claimSecret: Uint8Array,
): Promise<Uint8Array> {
  return pureCircuits.deriveClaimNullifier(commitment, claimSecret);
}

/**
 * Create default initial state matching deployed contract on Midnight Preprod
 */
export async function createDemoVaultState(): Promise<DistributionVaultState> {
  const contractAddress =
    deployment.contractAddress ||
    'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';

  const distIdHex =
    deployment.parameters?.distributionId ||
    'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';
  const distIdBytes = hexToBytes(distIdHex);

  const organizerKeyHex =
    deployment.parameters?.organizerKey ||
    'ec09fba5287d79904b8fc6e9c697beca57ec057ee4d41e8988da557833d5fc13';

  // 3 sample confidential allocations
  const demoAllocationsData = [
    {
      role: 'Lead ZK Protocol Architect',
      amount: 40_000n,
      seedHex: '0101010101010101010101010101010101010101010101010101010101010101',
      saltHex: '1111111111111111111111111111111111111111111111111111111111111111',
    },
    {
      role: 'Senior Smart Contract Engineer',
      amount: 35_000n,
      seedHex: '0202020202020202020202020202020202020202020202020202020202020202',
      saltHex: '2222222222222222222222222222222222222222222222222222222222222222',
    },
    {
      role: 'Security Auditor & Reviewer',
      amount: 25_000n,
      seedHex: '0303030303030303030303030303030303030303030303030303030303030303',
      saltHex: '3333333333333333333333333333333333333333333333333333333333333333',
    },
  ];

  const allocations: ContributorAllocation[] = [];
  const commitments: string[] = [];

  for (let i = 0; i < demoAllocationsData.length; i++) {
    const item = demoAllocationsData[i];
    const recSecret = hexToBytes(item.seedHex);
    const recKeyBytes = pureCircuits.deriveRecipientKey(recSecret);
    const saltBytes = hexToBytes(item.saltHex);
    const commBytes = pureCircuits.deriveAllocationCommitment(
      recKeyBytes,
      item.amount,
      saltBytes,
      distIdBytes,
    );
    const commHex = bytesToHex(commBytes);

    commitments.push(commHex);
    allocations.push({
      id: `alloc-${i + 1}`,
      role: item.role,
      recipientKey: bytesToHex(recKeyBytes),
      recipientSecret: item.seedHex,
      amount: item.amount,
      salt: item.saltHex,
      commitment: commHex,
      claimed: false,
    });
  }

  return {
    organizerKey: organizerKeyHex,
    distributionId: distIdHex,
    title: 'Contributor Treasury Q4 Disbursement',
    totalVaultFunds: 100_000n,
    commitments: [],
    claimedNullifiers: [],
    claimedCount: 0,
    isClosed: false,
    allocations,
    contractAddress,
  };
}
