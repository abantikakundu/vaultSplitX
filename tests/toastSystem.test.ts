import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatHumanReadableError } from '../src/utils/formatError';
import {
  ToastCard,
  ToastContainer,
  buildExplorerUrl,
} from '../src/components/common/Toast';
import {
  ToastProvider,
  useToast,
  toast,
  ToastItem,
} from '../src/context/ToastContext';

describe('Toast Notification System', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('1. Error Handling & Human-Readable Message Mapping', () => {
    it('logs raw error to console.error when formatHumanReadableError is called', () => {
      const rawError = new Error('Raw unhandled exception: indexer socket hang up');
      const formatted = formatHumanReadableError(rawError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[VaultSplitX Action Error]:', rawError);
      expect(formatted).not.toContain('socket hang up');
      expect(formatted).toContain('Network connection error');
    });

    it('maps wallet cancellation / rejection to human-readable text', () => {
      const err1 = new Error('User rejected the request');
      expect(formatHumanReadableError(err1)).toBe(
        'Transaction or connection request was cancelled in your wallet.',
      );

      const err2 = new Error('Connection request was declined by user');
      expect(formatHumanReadableError(err2)).toBe(
        'Transaction or connection request was cancelled in your wallet.',
      );

      const err3 = 'Transaction was denied';
      expect(formatHumanReadableError(err3)).toBe(
        'Transaction or connection request was cancelled in your wallet.',
      );
    });

    it('maps missing Midnight Lace wallet to actionable installation guidance', () => {
      const err = new Error('Midnight Lace wallet is not detected. Please install Midnight Lace.');
      expect(formatHumanReadableError(err)).toBe(
        'Midnight Lace wallet is not detected. Please install Midnight Lace and switch to the Preprod network.',
      );
    });

    it('maps double-claim / spent nullifier to clear warning', () => {
      const err = new Error(
        'Double-Claim Rejected: This allocation has already been claimed! The nullifier exists on the ledger.',
      );
      expect(formatHumanReadableError(err)).toBe(
        'Double-claim rejected: This allocation has already been claimed on the Midnight ledger.',
      );
    });

    it('maps ZK proof verification failure to clear guidance', () => {
      const err = new Error(
        'ZK Verification Failed: No matching allocation commitment found on-chain. Check your secret passphrase, payout amount, or blinding salt.',
      );
      expect(formatHumanReadableError(err)).toBe(
        'Zero-Knowledge verification failed: No matching allocation commitment was found on-chain. Please verify your secret passphrase, payout amount, or blinding salt.',
      );
    });

    it('maps closed distribution error to clear explanation', () => {
      const err = new Error('Cannot register allocations to a closed distribution');
      expect(formatHumanReadableError(err)).toBe(
        'This distribution batch is closed. No new claims or allocations can be accepted.',
      );
    });

    it('maps network and indexer connection failures to user-friendly message', () => {
      const err = new Error('Failed to fetch from https://indexer.preprod.midnight.network');
      expect(formatHumanReadableError(err)).toBe(
        'Network connection error: Unable to reach the Midnight Preprod indexer or RPC node. Please check your internet connection.',
      );
    });

    it('maps invalid JSON voucher to clear guidance', () => {
      const err = new SyntaxError('Unexpected token in JSON at position 12');
      expect(formatHumanReadableError(err)).toBe(
        'Invalid voucher format. Please ensure you provide a valid JSON voucher containing recipient secret, amount, and salt.',
      );
    });
  });

  describe('2. Explorer URL Construction', () => {
    it('constructs explorer URL with ?network=preprod when txHash is provided', () => {
      const txHash = '0x3fa2b1098ec76543210fedcba9876543';
      const url = buildExplorerUrl(txHash);

      expect(url).toBe('https://explorer.1am.xyz/tx/3fa2b1098ec76543210fedcba9876543?network=preprod');
      expect(url).toContain('https://explorer.1am.xyz/');
      expect(url).toContain('?network=preprod');
    });

    it('handles txHash without 0x prefix cleanly', () => {
      const txHash = 'abcdef0123456789abcdef0123456789';
      const url = buildExplorerUrl(txHash);

      expect(url).toBe('https://explorer.1am.xyz/tx/abcdef0123456789abcdef0123456789?network=preprod');
      expect(url).not.toContain('tx/0x');
    });

    it('constructs base explorer URL with ?network=preprod when no txHash is provided', () => {
      const url = buildExplorerUrl();
      expect(url).toBe('https://explorer.1am.xyz/?network=preprod');
    });

    it('respects customUrl when explicitly provided', () => {
      const custom = 'https://custom.explorer/tx/123';
      expect(buildExplorerUrl('0x123', custom)).toBe(custom);
    });
  });

  describe('3. Success Toast UI with Transaction Hash, Copy Button, and Explorer Link', () => {
    it('renders transaction hash, copy button, and "View on explorer" link on success', () => {
      const mockToast: ToastItem = {
        id: 'toast-test-1',
        type: 'success',
        title: 'Allocation Registered',
        message: 'Allocation commitment registered on-chain!',
        txHash: '0x99887766554433221100aabbccddeeff00112233445566778899aabbccddeeff',
        createdAt: Date.now(),
      };

      const html = renderToStaticMarkup(
        React.createElement(ToastCard, {
          toast: mockToast,
          onDismiss: () => {},
        }),
      );

      // Verify title and message
      expect(html).toContain('Allocation Registered');
      expect(html).toContain('Allocation commitment registered on-chain!');

      // Verify success icon
      expect(html).toContain('data-testid="toast-icon-success"');

      // Verify transaction hash section
      expect(html).toContain('data-testid="toast-tx-section"');
      expect(html).toContain('data-testid="toast-tx-hash"');
      expect(html).toContain('0x99887766...ddeeff');

      // Verify copy button
      expect(html).toContain('data-testid="toast-tx-copy-btn"');
      expect(html).toContain('aria-label="Copy transaction hash"');

      // Verify "View on explorer" link
      expect(html).toContain('data-testid="toast-explorer-link"');
      expect(html).toContain('View on explorer');
      expect(html).toContain(
        'href="https://explorer.1am.xyz/tx/99887766554433221100aabbccddeeff00112233445566778899aabbccddeeff?network=preprod"',
      );
      expect(html).toContain('target="_blank"');
    });

    it('renders clean success toast without tx section if no txHash is provided', () => {
      const mockToast: ToastItem = {
        id: 'toast-test-2',
        type: 'success',
        title: 'Wallet Connected',
        message: 'Connected to Midnight Lace wallet.',
        createdAt: Date.now(),
      };

      const html = renderToStaticMarkup(
        React.createElement(ToastCard, {
          toast: mockToast,
          onDismiss: () => {},
        }),
      );

      expect(html).toContain('Wallet Connected');
      expect(html).toContain('Connected to Midnight Lace wallet.');
      expect(html).not.toContain('data-testid="toast-tx-section"');
    });
  });

  describe('4. Error Toast UI with Human-Readable Messages', () => {
    it('renders error toast with AlertCircle icon, title, and formatted message', () => {
      const mockToast: ToastItem = {
        id: 'toast-test-3',
        type: 'error',
        title: 'Action Failed',
        message: 'Transaction or connection request was cancelled in your wallet.',
        createdAt: Date.now(),
      };

      const html = renderToStaticMarkup(
        React.createElement(ToastCard, {
          toast: mockToast,
          onDismiss: () => {},
        }),
      );

      expect(html).toContain('Action Failed');
      expect(html).toContain('Transaction or connection request was cancelled in your wallet.');
      expect(html).toContain('data-testid="toast-icon-error"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('data-testid="toast-close-btn"');
    });
  });

  describe('5. Info Toast UI', () => {
    it('renders info toast with Info icon and notice message', () => {
      const mockToast: ToastItem = {
        id: 'toast-test-4',
        type: 'info',
        title: 'Address Copied',
        message: 'Wallet address copied to clipboard!',
        createdAt: Date.now(),
      };

      const html = renderToStaticMarkup(
        React.createElement(ToastCard, {
          toast: mockToast,
          onDismiss: () => {},
        }),
      );

      expect(html).toContain('Address Copied');
      expect(html).toContain('Wallet address copied to clipboard!');
      expect(html).toContain('data-testid="toast-icon-info"');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-live="polite"');
    });
  });

  describe('6. Global Dispatcher toast.error Logs and Dispatches', () => {
    it('logs raw error even when called via toast.error directly', () => {
      const rawError = new Error('ZK prover rejected private input');
      toast.error(rawError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[VaultSplitX Action Error]:', rawError);
    });
  });
});
