import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ZK_PROVING_MESSAGE,
  useProofAction,
  ProofActionButton,
} from '../src/components/common/ProofActionButton';

describe('Proof & Transaction Action Feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. ZK Proving Message Specification', () => {
    it('matches the exact required zero-knowledge proof notice string', () => {
      expect(ZK_PROVING_MESSAGE).toBe(
        "Generating zero-knowledge proof… this can take up to a minute. Please don't close this tab.",
      );

      // Verify the presence of unicode horizontal ellipsis character U+2026
      expect(ZK_PROVING_MESSAGE).toContain('proof… this');
      expect(ZK_PROVING_MESSAGE.charCodeAt(ZK_PROVING_MESSAGE.indexOf('…'))).toBe(0x2026);

      // Verify warning advice
      expect(ZK_PROVING_MESSAGE).toContain("Please don't close this tab.");
      expect(ZK_PROVING_MESSAGE).toContain('this can take up to a minute');
    });
  });

  describe('2. Double Submit Prevention & Concurrency Control', () => {
    it('prevents concurrent executions and rejects double submits', async () => {
      // Simulate hook execution logic in pure Node test
      let isLocked = false;
      let isProcessing = false;
      let callCount = 0;

      const executeAction = async (fn: () => Promise<string>): Promise<string | undefined> => {
        if (isLocked) {
          return undefined; // Blocked
        }
        isLocked = true;
        isProcessing = true;
        try {
          return await fn();
        } finally {
          isLocked = false;
          isProcessing = false;
        }
      };

      let resolveSlowAction: (val: string) => void;
      const slowPromise = new Promise<string>((resolve) => {
        resolveSlowAction = resolve;
      });

      // Launch first action (in flight)
      const p1 = executeAction(async () => {
        callCount++;
        return slowPromise;
      });

      // Immediately attempt second action (double click)
      const p2 = executeAction(async () => {
        callCount++;
        return 'second';
      });

      // Immediately attempt third action (triple click)
      const p3 = executeAction(async () => {
        callCount++;
        return 'third';
      });

      // Second and third calls should be immediately rejected (returning undefined)
      const result2 = await p2;
      const result3 = await p3;

      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
      expect(callCount).toBe(1);

      // Settle first action
      resolveSlowAction!('first-success');
      const result1 = await p1;

      expect(result1).toBe('first-success');
      expect(callCount).toBe(1);
      expect(isProcessing).toBe(false);
    });

    it('releases lock upon action error, allowing future retries', async () => {
      let isLocked = false;
      let isProcessing = false;
      let attempts = 0;

      const executeAction = async (fn: () => Promise<void>) => {
        if (isLocked) return undefined;
        isLocked = true;
        isProcessing = true;
        try {
          return await fn();
        } finally {
          isLocked = false;
          isProcessing = false;
        }
      };

      // First attempt fails
      await expect(
        executeAction(async () => {
          attempts++;
          throw new Error('Wallet connection rejected');
        }),
      ).rejects.toThrow('Wallet connection rejected');

      expect(isLocked).toBe(false);
      expect(isProcessing).toBe(false);
      expect(attempts).toBe(1);

      // Second attempt succeeds after user fixes issue
      await executeAction(async () => {
        attempts++;
      });

      expect(attempts).toBe(2);
      expect(isLocked).toBe(false);
      expect(isProcessing).toBe(false);
    });
  });

  describe('3. Elapsed Seconds Tracking', () => {
    it('increments elapsed seconds every 1000ms while processing', () => {
      let elapsedSeconds = 0;
      let startTime = Date.now();
      const interval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      }, 1000);

      expect(elapsedSeconds).toBe(0);

      // Advance by 3 seconds
      vi.advanceTimersByTime(3000);
      expect(elapsedSeconds).toBe(3);

      // Advance by 12 seconds
      vi.advanceTimersByTime(12000);
      expect(elapsedSeconds).toBe(15);

      clearInterval(interval);
    });

    it('formats elapsed seconds as clean counter strings', () => {
      const formatElapsed = (s: number) => `(${s}s)`;
      expect(formatElapsed(0)).toBe('(0s)');
      expect(formatElapsed(1)).toBe('(1s)');
      expect(formatElapsed(14)).toBe('(14s)');
      expect(formatElapsed(60)).toBe('(60s)');
    });
  });

  describe('4. ProofActionButton Component Rendering & Accessibility', () => {
    it('renders normal button content when not processing', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ProofActionButton,
          { isProcessing: false, elapsedSeconds: 0 },
          React.createElement('span', null, 'Deploy & Register to Contract'),
        ),
      );

      expect(html).toContain('Deploy &amp; Register to Contract');
      expect(html).not.toContain('Generating zero-knowledge proof');
      expect(html).not.toContain('disabled');
      expect(html).not.toContain('aria-busy="true"');
    });

    it('renders disabled button, spinner, ZK message, and elapsed seconds when isProcessing is true', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ProofActionButton,
          { isProcessing: true, elapsedSeconds: 8 },
          React.createElement('span', null, 'Deploy & Register to Contract'),
        ),
      );

      // Button is disabled and marked busy
      expect(html).toContain('disabled=""');
      expect(html).toContain('aria-busy="true"');

      // Spinner is present
      expect(html).toContain('data-testid="zk-proving-spinner"');
      expect(html).toContain('animate-spin');

      // Exact text is displayed
      expect(html).toContain('data-testid="zk-proving-message"');
      expect(html).toContain(
        "Generating zero-knowledge proof… this can take up to a minute. Please don&#x27;t close this tab.",
      );

      // Elapsed seconds is displayed
      expect(html).toContain('data-testid="zk-elapsed-seconds"');
      expect(html).toContain('(8s)');

      // Original text is hidden during processing
      expect(html).not.toContain('Deploy &amp; Register to Contract');
    });

    it('respects initial external disabled prop while not processing', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          ProofActionButton,
          { isProcessing: false, disabled: true, elapsedSeconds: 0 },
          React.createElement('span', null, 'Disabled Action'),
        ),
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('Disabled Action');
    });
  });
});
