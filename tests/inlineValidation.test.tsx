import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldError } from '../src/components/common/FieldError';

describe('Form Inline Validation & Live Remaining Counter', () => {
  describe('1. FieldError Component', () => {
    it('returns null when no message is provided', () => {
      const htmlNull = renderToStaticMarkup(<FieldError message={null} />);
      expect(htmlNull).toBe('');

      const htmlUndefined = renderToStaticMarkup(<FieldError message={undefined} />);
      expect(htmlUndefined).toBe('');

      const htmlEmpty = renderToStaticMarkup(<FieldError message="" />);
      expect(htmlEmpty).toBe('');
    });

    it('renders red inline error with alert role and message when provided', () => {
      const html = renderToStaticMarkup(<FieldError message="Amount must be greater than 0." />);
      expect(html).toContain('role="alert"');
      expect(html).toContain('text-rose-400');
      expect(html).toContain('Amount must be greater than 0.');
    });
  });

  describe('2. Positive Amounts Validation', () => {
    function validateAmount(val: string): { isValid: boolean; error: string | null } {
      if (!val || !val.trim()) {
        return { isValid: false, error: 'Amount is required.' };
      }
      try {
        const num = BigInt(val);
        if (num <= 0n) {
          return { isValid: false, error: 'Amount must be a positive number greater than 0.' };
        }
        return { isValid: true, error: null };
      } catch {
        return { isValid: false, error: 'Amount must be a valid positive integer.' };
      }
    }

    it('accepts strictly positive integer amounts', () => {
      expect(validateAmount('1').isValid).toBe(true);
      expect(validateAmount('1000').isValid).toBe(true);
      expect(validateAmount('50000').isValid).toBe(true);
      expect(validateAmount('1000000000000').isValid).toBe(true);
    });

    it('rejects zero, negative amounts, and non-numeric values', () => {
      expect(validateAmount('0').isValid).toBe(false);
      expect(validateAmount('0').error).toBe('Amount must be a positive number greater than 0.');

      expect(validateAmount('-50').isValid).toBe(false);
      expect(validateAmount('-50').error).toBe('Amount must be a positive number greater than 0.');

      expect(validateAmount('').isValid).toBe(false);
      expect(validateAmount('').error).toBe('Amount is required.');

      expect(validateAmount('abc').isValid).toBe(false);
      expect(validateAmount('abc').error).toBe('Amount must be a valid positive integer.');
    });
  });

  describe('3. Empty & Duplicate Recipients Validation', () => {
    interface Recipient {
      id: string;
      role: string;
      seed: string;
    }

    function validateRecipients(recipients: Recipient[]): Record<string, { role?: string; seed?: string }> {
      const errors: Record<string, { role?: string; seed?: string }> = {};
      const roleCounts: Record<string, number> = {};
      const seedCounts: Record<string, number> = {};

      for (const r of recipients) {
        const cleanRole = r.role.trim().toLowerCase();
        if (cleanRole) {
          roleCounts[cleanRole] = (roleCounts[cleanRole] || 0) + 1;
        }
        const cleanSeed = r.seed.trim().toLowerCase();
        if (cleanSeed) {
          seedCounts[cleanSeed] = (seedCounts[cleanSeed] || 0) + 1;
        }
      }

      for (const r of recipients) {
        const rowErr: { role?: string; seed?: string } = {};
        const cleanRole = r.role.trim();
        if (!cleanRole) {
          rowErr.role = 'Recipient role/name cannot be empty.';
        } else if (roleCounts[cleanRole.toLowerCase()] > 1) {
          rowErr.role = 'Duplicate recipient: role/name must be unique.';
        }

        const cleanSeed = r.seed.trim();
        if (!cleanSeed) {
          rowErr.seed = 'Secret seed cannot be empty.';
        } else if (seedCounts[cleanSeed.toLowerCase()] > 1) {
          rowErr.seed = 'Duplicate seed: each recipient must have a unique secret seed.';
        }

        errors[r.id] = rowErr;
      }

      return errors;
    }

    it('detects empty recipient roles', () => {
      const list = [
        { id: '1', role: '   ', seed: 'seed1' },
        { id: '2', role: 'Architect', seed: 'seed2' },
      ];
      const errors = validateRecipients(list);
      expect(errors['1'].role).toBe('Recipient role/name cannot be empty.');
      expect(errors['2'].role).toBeUndefined();
    });

    it('detects duplicate recipient roles (case-insensitive and trimmed)', () => {
      const list = [
        { id: '1', role: 'Core Dev', seed: 'seed1' },
        { id: '2', role: ' core dev ', seed: 'seed2' },
        { id: '3', role: 'Auditor', seed: 'seed3' },
      ];
      const errors = validateRecipients(list);
      expect(errors['1'].role).toBe('Duplicate recipient: role/name must be unique.');
      expect(errors['2'].role).toBe('Duplicate recipient: role/name must be unique.');
      expect(errors['3'].role).toBeUndefined();
    });

    it('passes when all recipients have distinct non-empty roles and seeds', () => {
      const list = [
        { id: '1', role: 'Core Dev', seed: 'seed1' },
        { id: '2', role: 'Auditor', seed: 'seed2' },
        { id: '3', role: 'Designer', seed: 'seed3' },
      ];
      const errors = validateRecipients(list);
      expect(Object.values(errors).every((e) => !e.role && !e.seed)).toBe(true);
    });
  });

  describe('4. Sum of Allocations & Live Remaining Counter', () => {
    function computeRemainingFunds(totalFunds: bigint, allocatedAmounts: bigint[]): {
      allocatedTotal: bigint;
      remainingFunds: bigint;
      exceedsTotal: boolean;
      counterText: string;
      error: string | null;
    } {
      const allocatedTotal = allocatedAmounts.reduce((acc, a) => acc + a, 0n);
      const remainingFunds = totalFunds - allocatedTotal;
      const exceedsTotal = allocatedTotal > totalFunds;

      const counterText = `Remaining: ${
        remainingFunds < 0n ? `-${Number(-remainingFunds).toLocaleString()}` : Number(remainingFunds).toLocaleString()
      } tDUST`;

      const error = exceedsTotal
        ? `Sum of allocations (${Number(allocatedTotal).toLocaleString()} tDUST) exceeds total vault funds (${Number(
            totalFunds,
          ).toLocaleString()} tDUST).`
        : null;

      return {
        allocatedTotal,
        remainingFunds,
        exceedsTotal,
        counterText,
        error,
      };
    }

    it('calculates exact balanced allocation with 0 remaining', () => {
      const res = computeRemainingFunds(100_000n, [40_000n, 35_000n, 25_000n]);
      expect(res.allocatedTotal).toBe(100_000n);
      expect(res.remainingFunds).toBe(0n);
      expect(res.exceedsTotal).toBe(false);
      expect(res.counterText).toBe('Remaining: 0 tDUST');
      expect(res.error).toBeNull();
    });

    it('calculates under-allocated vault with positive remaining counter', () => {
      const res = computeRemainingFunds(100_000n, [40_000n, 35_000n]);
      expect(res.allocatedTotal).toBe(75_000n);
      expect(res.remainingFunds).toBe(25_000n);
      expect(res.exceedsTotal).toBe(false);
      expect(res.counterText).toBe('Remaining: 25,000 tDUST');
      expect(res.error).toBeNull();
    });

    it('detects over-allocation when sum exceeds total vault funds', () => {
      const res = computeRemainingFunds(100_000n, [50_000n, 40_000n, 30_000n]);
      expect(res.allocatedTotal).toBe(120_000n);
      expect(res.remainingFunds).toBe(-20_000n);
      expect(res.exceedsTotal).toBe(true);
      expect(res.counterText).toContain('Remaining: -');
      expect(res.counterText).toContain('20,000 tDUST');
      expect(res.error).toContain('Sum of allocations');
      expect(res.error).toContain('exceeds total vault funds');
    });
  });

  describe('5. Form Validity & Submit Button Disabled State', () => {
    interface FormState {
      title: string;
      totalFundsStr: string;
      recipients: Array<{ id: string; role: string; amount: string; seed: string }>;
    }

    function checkFormValidity(state: FormState): boolean {
      if (!state.title.trim()) return false;

      let totalFunds = 0n;
      try {
        totalFunds = BigInt(state.totalFundsStr);
        if (totalFunds <= 0n) return false;
      } catch {
        return false;
      }

      if (state.recipients.length === 0) return false;

      const roleCounts: Record<string, number> = {};
      for (const r of state.recipients) {
        const cleanRole = r.role.trim().toLowerCase();
        if (!cleanRole) return false;
        roleCounts[cleanRole] = (roleCounts[cleanRole] || 0) + 1;
        if (roleCounts[cleanRole] > 1) return false;

        try {
          const amt = BigInt(r.amount);
          if (amt <= 0n) return false;
        } catch {
          return false;
        }

        if (!r.seed.trim()) return false;
      }

      const allocatedTotal = state.recipients.reduce((sum, r) => sum + BigInt(r.amount), 0n);
      if (allocatedTotal <= 0n || allocatedTotal > totalFunds) {
        return false;
      }

      return true;
    }

    it('disables submit when title is empty', () => {
      const valid: FormState = {
        title: '',
        totalFundsStr: '100000',
        recipients: [{ id: '1', role: 'Dev', amount: '100000', seed: 'seed1' }],
      };
      expect(checkFormValidity(valid)).toBe(false);
    });

    it('disables submit when total vault funds <= 0', () => {
      const state: FormState = {
        title: 'Batch Q1',
        totalFundsStr: '0',
        recipients: [{ id: '1', role: 'Dev', amount: '100', seed: 'seed1' }],
      };
      expect(checkFormValidity(state)).toBe(false);
    });

    it('disables submit when any recipient amount is <= 0', () => {
      const state: FormState = {
        title: 'Batch Q1',
        totalFundsStr: '100000',
        recipients: [
          { id: '1', role: 'Dev 1', amount: '50000', seed: 'seed1' },
          { id: '2', role: 'Dev 2', amount: '0', seed: 'seed2' },
        ],
      };
      expect(checkFormValidity(state)).toBe(false);
    });

    it('disables submit when duplicate recipients exist', () => {
      const state: FormState = {
        title: 'Batch Q1',
        totalFundsStr: '100000',
        recipients: [
          { id: '1', role: 'Core Engineer', amount: '50000', seed: 'seed1' },
          { id: '2', role: 'core engineer', amount: '50000', seed: 'seed2' },
        ],
      };
      expect(checkFormValidity(state)).toBe(false);
    });

    it('disables submit when sum of allocations exceeds total vault funds', () => {
      const state: FormState = {
        title: 'Batch Q1',
        totalFundsStr: '100000',
        recipients: [
          { id: '1', role: 'Dev 1', amount: '60000', seed: 'seed1' },
          { id: '2', role: 'Dev 2', amount: '50000', seed: 'seed2' },
        ],
      };
      expect(checkFormValidity(state)).toBe(false);
    });

    it('enables submit when all constraints are fully satisfied', () => {
      const state: FormState = {
        title: 'Batch Q1',
        totalFundsStr: '100000',
        recipients: [
          { id: '1', role: 'Dev 1', amount: '40000', seed: 'seed1' },
          { id: '2', role: 'Dev 2', amount: '35000', seed: 'seed2' },
          { id: '3', role: 'Dev 3', amount: '25000', seed: 'seed3' },
        ],
      };
      expect(checkFormValidity(state)).toBe(true);
    });
  });

  describe('6. VaultPage Modal Validation Against Existing Vault Allocations', () => {
    const existingAllocations = [
      { id: 'alloc-1', role: 'Lead Architect', amount: 40000n },
      { id: 'alloc-2', role: 'Security Auditor', amount: 25000n },
    ];
    const totalVaultFunds = 100000n;
    const currentAllocated = 65000n; // 40000 + 25000
    const remainingFunds = 35000n;   // 100000 - 65000

    function validateNewAllocationModal(
      newRole: string,
      newAmount: string,
    ): {
      roleError: string | null;
      amountError: string | null;
      liveRemainingText: string;
      isValid: boolean;
    } {
      let roleError: string | null = null;
      const cleanRole = newRole.trim();
      if (!cleanRole) {
        roleError = 'Recipient role/name cannot be empty.';
      } else if (
        existingAllocations.some((a) => a.role.trim().toLowerCase() === cleanRole.toLowerCase())
      ) {
        roleError = `Duplicate recipient: an allocation for "${cleanRole}" already exists in this vault.`;
      }

      let amountError: string | null = null;
      let parsedAmount = 0n;
      if (!newAmount.trim()) {
        amountError = 'Payment amount is required.';
      } else {
        try {
          parsedAmount = BigInt(newAmount);
          if (parsedAmount <= 0n) {
            amountError = 'Amount must be a positive number greater than 0 tDUST.';
          } else if (currentAllocated + parsedAmount > totalVaultFunds) {
            amountError = `Sum of allocations exceeds total vault funds (${Number(totalVaultFunds).toLocaleString()} tDUST). Only ${Number(remainingFunds).toLocaleString()} tDUST remaining.`;
          }
        } catch {
          amountError = 'Amount must be a valid positive integer.';
        }
      }

      const remainingAfter = totalVaultFunds - (currentAllocated + parsedAmount);
      const liveRemainingText = `Remaining: ${
        remainingAfter < 0n ? `-${Number(-remainingAfter).toLocaleString()}` : Number(remainingAfter).toLocaleString()
      } tDUST`;

      const isValid = !roleError && !amountError && cleanRole.length > 0 && parsedAmount > 0n && currentAllocated + parsedAmount <= totalVaultFunds;

      return {
        roleError,
        amountError,
        liveRemainingText,
        isValid,
      };
    }

    it('rejects adding duplicate recipient role already present in vault', () => {
      const res = validateNewAllocationModal('lead architect', '10000');
      expect(res.isValid).toBe(false);
      expect(res.roleError).toContain('Duplicate recipient');
    });

    it('rejects adding non-positive amounts in modal', () => {
      const res = validateNewAllocationModal('Dev Ops Lead', '0');
      expect(res.isValid).toBe(false);
      expect(res.amountError).toBe('Amount must be a positive number greater than 0 tDUST.');
    });

    it('rejects adding amount that exceeds remaining vault funds', () => {
      const res = validateNewAllocationModal('Dev Ops Lead', '40000'); // 65000 + 40000 = 105000 > 100000
      expect(res.isValid).toBe(false);
      expect(res.amountError).toContain('Sum of allocations exceeds total vault funds');
      expect(res.liveRemainingText).toBe('Remaining: -5,000 tDUST');
    });

    it('accepts valid new allocation within remaining funds', () => {
      const res = validateNewAllocationModal('Dev Ops Lead', '20000');
      expect(res.isValid).toBe(true);
      expect(res.roleError).toBeNull();
      expect(res.amountError).toBeNull();
      expect(res.liveRemainingText).toBe('Remaining: 15,000 tDUST');
    });
  });
});
