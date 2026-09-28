import { pureCircuits } from '../contract/index.js';

export function generateRandomHex(byteCount = 32): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function pad32String(str: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  const result = new Uint8Array(32);
  result.set(encoded.slice(0, 32));
  return result;
}

export function bigintToBytes32(val: bigint): Uint8Array {
  const hex = val.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
    try {
      const hashBuf = await window.crypto.subtle.digest(
        'SHA-256',
        data as unknown as ArrayBufferView<ArrayBuffer>,
      );
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback
    }
  }
  return bytesToHex(pureCircuits.deriveOrganizerKey(data));
}

// ---------------------------------------------------------------------------
// Pure Circuit Wrappers (Exact Midnight Compact Hash Implementations)
// ---------------------------------------------------------------------------

export function deriveOrganizerKey(organizerSecret: Uint8Array): Uint8Array {
  return pureCircuits.deriveOrganizerKey(organizerSecret);
}

export function deriveRecipientKey(recipientSecret: Uint8Array): Uint8Array {
  return pureCircuits.deriveRecipientKey(recipientSecret);
}

export function deriveAllocationCommitment(
  recipientKey: Uint8Array,
  amount: bigint,
  salt: Uint8Array,
  distributionId: Uint8Array,
): Uint8Array {
  return pureCircuits.deriveAllocationCommitment(recipientKey, amount, salt, distributionId);
}

export function deriveClaimNullifier(
  commitment: Uint8Array,
  claimSecret: Uint8Array,
): Uint8Array {
  return pureCircuits.deriveClaimNullifier(commitment, claimSecret);
}

// ---------------------------------------------------------------------------
// LocalStorage Persistence for Organizer Secrets
// ---------------------------------------------------------------------------

const STORAGE_KEY_ORGANIZER_SECRETS = 'vaultsplitx_organizer_secrets';

export function saveOrganizerSecret(contractAddress: string, secretHex: string): void {
  try {
    const cleanAddr = contractAddress.toLowerCase().replace(/^0x/, '');
    const cleanSecret = secretHex.toLowerCase().replace(/^0x/, '');
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_ORGANIZER_SECRETS) ?? '{}');
    existing[cleanAddr] = cleanSecret;
    existing[`0x${cleanAddr}`] = cleanSecret;
    localStorage.setItem(STORAGE_KEY_ORGANIZER_SECRETS, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to save organizer secret to localStorage:', err);
  }
}

export function removeOrganizerSecret(contractAddress?: string): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_ORGANIZER_SECRETS) ?? '{}');
    if (contractAddress) {
      const cleanAddr = contractAddress.toLowerCase().replace(/^0x/, '');
      delete existing[cleanAddr];
      delete existing[`0x${cleanAddr}`];
    } else {
      delete existing['default'];
    }
    localStorage.setItem(STORAGE_KEY_ORGANIZER_SECRETS, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to remove organizer secret from localStorage:', err);
  }
}

export function validateOrganizerSecret(secretHex: string, expectedKeyHex: string): boolean {
  try {
    const cleanSecret = secretHex.toLowerCase().replace(/^0x/, '');
    const cleanKey = expectedKeyHex.toLowerCase().replace(/^0x/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(cleanSecret) || !/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
      return false;
    }
    const derivedKey = bytesToHex(pureCircuits.deriveOrganizerKey(hexToBytes(cleanSecret))).toLowerCase();
    return derivedKey === cleanKey;
  } catch {
    return false;
  }
}

export function getOrganizerSecret(contractAddress?: string, expectedOrganizerKey?: string): string | null {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_ORGANIZER_SECRETS) ?? '{}');
    const cleanAddr = contractAddress?.toLowerCase().replace(/^0x/, '');
    const cleanExpectedKey = expectedOrganizerKey?.toLowerCase().replace(/^0x/, '');

    const candidate =
      (cleanAddr && (existing[cleanAddr] || existing[`0x${cleanAddr}`])) ||
      existing['default'] ||
      null;

    if (!candidate) return null;

    if (cleanExpectedKey && /^[0-9a-fA-F]{64}$/.test(candidate)) {
      try {
        const derived = bytesToHex(pureCircuits.deriveOrganizerKey(hexToBytes(candidate))).toLowerCase();
        if (derived !== cleanExpectedKey) {
          console.warn(
            `[VaultSplitX] Stored organizer secret for ${contractAddress} derives to ${derived}, but expected ${cleanExpectedKey}. Discarding invalid secret.`,
          );
          if (cleanAddr) {
            delete existing[cleanAddr];
            delete existing[`0x${cleanAddr}`];
            localStorage.setItem(STORAGE_KEY_ORGANIZER_SECRETS, JSON.stringify(existing));
          }
          return null;
        }
      } catch {
        return null;
      }
    }

    return candidate;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bech32m Address Encoding for Midnight Unshielded Addresses
// ---------------------------------------------------------------------------

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
const BECH32M_CONST = 0x2bc830a3;

function bech32mPolymod(values: number[]): number {
  let chk = 1;
  for (let p = 0; p < values.length; ++p) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ values[p];
    for (let i = 0; i < 5; ++i) {
      if ((top >> i) & 1) {
        chk ^= BECH32_GENERATOR[i];
      }
    }
  }
  return chk;
}

function bech32mHrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) >> 5);
  }
  ret.push(0);
  for (let p = 0; p < hrp.length; ++p) {
    ret.push(hrp.charCodeAt(p) & 31);
  }
  return ret;
}

function bech32mCreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32mHrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32mPolymod(values) ^ BECH32M_CONST;
  const ret: number[] = [];
  for (let p = 0; p < 6; ++p) {
    ret.push((mod >> (5 * (5 - p))) & 31);
  }
  return ret;
}

function convertBits(data: Uint8Array, frombits: number, tobits: number, pad: boolean): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << tobits) - 1;
  for (let p = 0; p < data.length; ++p) {
    const value = data[p];
    if (value < 0 || (value >> frombits) !== 0) {
      return null;
    }
    acc = (acc << frombits) | value;
    bits += frombits;
    while (bits >= tobits) {
      bits -= tobits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) {
      ret.push((acc << (tobits - bits)) & maxv);
    }
  } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
    return null;
  }
  return ret;
}

export function encodeBech32m(hrp: string, bytes: Uint8Array): string {
  const words = convertBits(bytes, 8, 5, true);
  if (!words) throw new Error('convertBits failed for Bech32m');
  const check = bech32mCreateChecksum(hrp, words);
  const combined = words.concat(check);
  let ret = hrp + '1';
  for (let p = 0; p < combined.length; ++p) {
    ret += BECH32_CHARSET.charAt(combined[p]);
  }
  return ret;
}

export function formatToBech32mAddress(
  addressOrHex: string | undefined,
  network: 'preprod' | 'preview' = 'preprod',
): string | undefined {
  if (!addressOrHex) return undefined;
  const clean = addressOrHex.trim();
  if (/^mn_addr/i.test(clean)) return clean;
  if (/^[0-9a-fA-F]{64}$/.test(clean)) {
    try {
      const bytes = hexToBytes(clean);
      const hrp = network === 'preprod' ? 'mn_addr_preprod' : 'mn_addr_preview';
      return encodeBech32m(hrp, bytes);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
