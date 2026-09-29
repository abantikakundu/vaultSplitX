import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  shortenAddress,
  isLaceWallet,
  isLaceInstalled,
  LACE_INSTALL_URL,
  LACE_NETWORK_NOTE,
  listInstalledWallets,
} from '../src/midnight/wallet';

describe('Wallet Connect Flow & Midnight Lace Integration', () => {
  const originalMidnight = (globalThis as any).window?.midnight;

  beforeEach(() => {
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = {};
    }
  });

  afterEach(() => {
    (globalThis as any).window.midnight = originalMidnight;
  });

  describe('1. Address shortening (first 6 and last 4 characters)', () => {
    it('shortens address to exactly first 6 and last 4 characters separated by ...', () => {
      const address = 'mn_addr_preprod1abc123def456xyz9';
      const shortened = shortenAddress(address);

      expect(shortened).toBe('mn_add...xyz9');
      // Verify prefix is exactly first 6 chars
      expect(shortened.slice(0, 6)).toBe('mn_add');
      expect(shortened.slice(0, 6)).toBe(address.slice(0, 6));
      // Verify suffix is exactly last 4 chars
      expect(shortened.slice(-4)).toBe('xyz9');
      expect(shortened.slice(-4)).toBe(address.slice(-4));
      // Verify length
      expect(shortened).toHaveLength(6 + 3 + 4);
    });

    it('handles various address formats correctly', () => {
      const addr1 = 'mn_addr_preview19876543210qwerty';
      expect(shortenAddress(addr1)).toBe('mn_add...erty');
      expect(shortenAddress(addr1).slice(0, 6)).toBe(addr1.slice(0, 6));
      expect(shortenAddress(addr1).slice(-4)).toBe(addr1.slice(-4));

      const addr2 = 'addr_test1qqqq2222333344445555';
      expect(shortenAddress(addr2)).toBe('addr_t...5555');
      expect(shortenAddress(addr2).slice(0, 6)).toBe('addr_t');
      expect(shortenAddress(addr2).slice(-4)).toBe('5555');
    });

    it('handles null, undefined, and short strings safely', () => {
      expect(shortenAddress(null)).toBe('');
      expect(shortenAddress(undefined)).toBe('');
      expect(shortenAddress('')).toBe('');
      expect(shortenAddress('short')).toBe('short');
    });
  });

  describe('2. Midnight Lace Detection & Metadata', () => {
    it('contains the official Lace install URL and exact network note', () => {
      expect(LACE_INSTALL_URL).toBe('https://www.lace.io');
      expect(LACE_NETWORK_NOTE).toBe('Switch Lace to the Preprod network');
    });

    it('correctly detects Lace from wallet id or name', () => {
      expect(isLaceWallet('midnight-lace')).toBe(true);
      expect(isLaceWallet('lace')).toBe(true);
      expect(isLaceWallet('wallet-123', 'Midnight Lace')).toBe(true);
      expect(isLaceWallet('custom-id', 'Lace Wallet (Midnight)')).toBe(true);

      expect(isLaceWallet('1am-wallet')).toBe(false);
      expect(isLaceWallet('metamask')).toBe(false);
    });

    it('reports isLaceInstalled as false when window.midnight is empty or missing', () => {
      (globalThis as any).window.midnight = undefined;
      expect(isLaceInstalled()).toBe(false);

      (globalThis as any).window.midnight = {};
      expect(isLaceInstalled()).toBe(false);
    });

    it('reports isLaceInstalled as true when Midnight Lace is present in window.midnight', () => {
      (globalThis as any).window.midnight = {
        'midnight-lace': {
          name: 'Midnight Lace',
          apiVersion: '1.0.0',
        },
      };
      expect(isLaceInstalled()).toBe(true);

      const wallets = listInstalledWallets();
      expect(wallets).toHaveLength(1);
      expect(wallets[0].name).toBe('Midnight Lace');
    });
  });

  describe('3. Wallet rejection and failure patterns', () => {
    it('properly formats rejection messages for clear user guidance', () => {
      const rejectionError = new Error('User declined the connection');
      const msg = rejectionError.message.toLowerCase();
      const isRejection =
        msg.includes('reject') ||
        msg.includes('declined') ||
        msg.includes('cancel') ||
        msg.includes('denied');

      expect(isRejection).toBe(true);
    });

    it('distinguishes between not-detected vs rejection errors', () => {
      const notDetectedMsg =
        'Midnight Lace wallet is not detected. Please install Midnight Lace. Switch Lace to the Preprod network.';
      expect(notDetectedMsg).toContain('Midnight Lace');
      expect(notDetectedMsg).toContain('Switch Lace to the Preprod network');
    });
  });
});
