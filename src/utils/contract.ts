/**
 * VaultSplitX: Cryptographic and Contract Interaction Helpers
 *
 * Implements client-side derivation of:
 * 1. Organizer Key: hash("VaultSplitX:v1:organizer" || secret)
 * 2. Recipient Key: hash("VaultSplitX:v1:recipient" || secret)
 * 3. Allocation Commitment: hash("VaultSplitX:v1:commitment" || recipientKey || amount || salt || distId)
 * 4. Claim Nullifier: hash("VaultSplitX:v1:nullifier" || commitment || claimSecret)
 */

export interface ContributorAllocation {
  id: string;
  role: string;
  recipientKey: string;
  recipientSecret: string;
  amount: bigint;
  salt: string;
  commitment: string;
  claimed: boolean;
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
  message: string;
  timestamp: string;
}

// SHA-256 helper for client-side browsers and node
async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hash = await window.crypto.subtle.digest('SHA-256', data as unknown as ArrayBufferView<ArrayBuffer>);
    return new Uint8Array(hash);
  }
  // Fallback for Node environments
  const cryptoModule = await import('node:crypto');
  return new Uint8Array(cryptoModule.createHash('sha256').update(data).digest());
}

// Convert string to UTF-8 bytes with 32-byte padding
export function padString32(str: string): Uint8Array {
  const enc = new TextEncoder().encode(str);
  const out = new Uint8Array(32);
  out.set(enc.subarray(0, 32));
  return out;
}

// Convert bigint to 32-byte big-endian Uint8Array
export function bigintToBytes32(val: bigint): Uint8Array {
  const hex = val.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Convert hex string to Uint8Array
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const len = clean.length;
  const bytes = new Uint8Array(Math.ceil(len / 2));
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate random 32-byte hex string
export function generateRandomHex32(): string {
  const bytes = new Uint8Array(32);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
}

// Concatenate multiple Uint8Arrays
function concatBytes(arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

/**
 * Derive Organizer Key
 */
export async function deriveOrganizerKey(organizerSecret: Uint8Array): Promise<Uint8Array> {
  const tag = padString32('VaultSplitX:v1:organizer');
  return sha256Bytes(concatBytes([tag, organizerSecret]));
}

/**
 * Derive Recipient Key
 */
export async function deriveRecipientKey(recipientSecret: Uint8Array): Promise<Uint8Array> {
  const tag = padString32('VaultSplitX:v1:recipient');
  return sha256Bytes(concatBytes([tag, recipientSecret]));
}

/**
 * Derive Allocation Commitment
 * Commitment = Hash(tag, recipientKey, amount, salt, distributionId)
 */
export async function deriveAllocationCommitment(
  recipientKey: Uint8Array,
  amount: bigint,
  salt: Uint8Array,
  distributionId: Uint8Array,
): Promise<Uint8Array> {
  const tag = padString32('VaultSplitX:v1:commitment');
  const amountBytes = bigintToBytes32(amount);
  return sha256Bytes(concatBytes([tag, recipientKey, amountBytes, salt, distributionId]));
}

/**
 * Derive Claim Nullifier
 * Nullifier = Hash(tag, commitment, claimSecret)
 */
export async function deriveClaimNullifier(
  commitment: Uint8Array,
  claimSecret: Uint8Array,
): Promise<Uint8Array> {
  const tag = padString32('VaultSplitX:v1:nullifier');
  return sha256Bytes(concatBytes([tag, commitment, claimSecret]));
}

/**
 * Create default initial demo distribution
 */
export async function createDemoVaultState(): Promise<DistributionVaultState> {
  const distIdBytes = padString32('VaultSplitX:Preprod:Batch01');
  const distIdHex = bytesToHex(distIdBytes);

  const organizerSecret = padString32('demo_treasury_lead_secret_key');
  const organizerKeyBytes = await deriveOrganizerKey(organizerSecret);
  const organizerKeyHex = bytesToHex(organizerKeyBytes);

  // 3 sample confidential allocations
  const demoAllocationsData = [
    { role: 'Lead ZK Protocol Architect', amount: 35_000n, seed: 'contributor_alice_seed' },
    { role: 'Senior Smart Contract Engineer', amount: 25_000n, seed: 'contributor_bob_seed' },
    { role: 'Security Auditor & Reviewer', amount: 15_000n, seed: 'contributor_carol_seed' },
  ];

  const allocations: ContributorAllocation[] = [];
  const commitments: string[] = [];

  for (let i = 0; i < demoAllocationsData.length; i++) {
    const item = demoAllocationsData[i];
    const recSecret = padString32(item.seed);
    const recKeyBytes = await deriveRecipientKey(recSecret);
    const saltBytes = hexToBytes(generateRandomHex32());
    const commBytes = await deriveAllocationCommitment(
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
      recipientSecret: bytesToHex(recSecret),
      amount: item.amount,
      salt: bytesToHex(saltBytes),
      commitment: commHex,
      claimed: false,
    });
  }

  return {
    organizerKey: organizerKeyHex,
    distributionId: distIdHex,
    title: 'Q3 Contributor Treasury Disbursement',
    totalVaultFunds: 75_000n,
    commitments,
    claimedNullifiers: [],
    claimedCount: 0,
    isClosed: false,
    allocations,
  };
}
