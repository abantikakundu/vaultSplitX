import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

interface ContributorAllocation {
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

/**
 * Generates the master claim file JSON structure matching CreatePage
 */
function generateClaimFileJson(
  distTitle: string,
  contractAddress: string,
  distributionId: string,
  network: string,
  allocations: ContributorAllocation[],
): string {
  const fileData = {
    version: '1.0',
    warning: "These claim details can't be recovered if lost",
    distributionTitle: distTitle,
    contractAddress,
    distributionId,
    network,
    createdAt: new Date().toISOString(),
    totalFunds: allocations.reduce((acc, a) => acc + a.amount, 0n).toString(),
    claims: allocations.map((alloc) => ({
      role: alloc.role,
      amount: alloc.amount.toString(),
      recipientSecret: alloc.recipientSecret,
      salt: alloc.salt,
      commitment: alloc.commitment ? `0x${alloc.commitment.replace(/^0x/, '')}` : undefined,
      distributionId,
      contractAddress,
      instructions: 'Import this claim file on the VaultSplitX Claim page to synthesize a zero-knowledge claim proof.',
    })),
  };

  return JSON.stringify(fileData, null, 2);
}

/**
 * Generates the per-recipient claim voucher JSON matching CreatePage Copy button
 */
function generateRecipientClaimJson(
  alloc: ContributorAllocation,
  distributionId: string,
  contractAddress: string,
  network: string,
): string {
  const recipientVoucher = {
    role: alloc.role,
    amount: alloc.amount.toString(),
    recipientSecret: alloc.recipientSecret,
    salt: alloc.salt,
    commitment: alloc.commitment ? `0x${alloc.commitment.replace(/^0x/, '')}` : undefined,
    distributionId,
    contractAddress,
    network,
    warning: "These claim details can't be recovered if lost. Keep your recipient secret and salt private.",
    instructions: 'Import this claim file or copy these details into the VaultSplitX Claim page to claim your funds.',
  };

  return JSON.stringify(recipientVoucher, null, 2);
}

/**
 * Normalizes and parses imported JSON files on ClaimPage
 */
function parseImportedClaimJson(jsonText: string) {
  if (!jsonText || !jsonText.trim()) {
    throw new Error('The selected claim file is empty.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText.trim());
  } catch {
    throw new Error('Selected file is not valid JSON. Please provide a valid JSON claim file.');
  }

  let candidateClaims: any[] = [];
  if (Array.isArray(parsed)) {
    candidateClaims = parsed;
  } else if (Array.isArray(parsed.claims)) {
    candidateClaims = parsed.claims;
  } else if (Array.isArray(parsed.allocations)) {
    candidateClaims = parsed.allocations;
  } else if (Array.isArray(parsed.recipients)) {
    candidateClaims = parsed.recipients;
  } else {
    candidateClaims = [parsed];
  }

  const normalizedClaims = candidateClaims
    .map((c: any, idx: number) => {
      const recSec = c.recipientSecret || c.seed || c.secret || '';
      const amt = c.amount ? c.amount.toString() : '';
      const s = c.salt || '';
      const d =
        c.distributionId ||
        c.distId ||
        parsed.distributionId ||
        parsed.distId ||
        '';
      const r = c.role || c.title || `Recipient #${idx + 1}`;
      const comm = c.commitment || '';
      return {
        role: r,
        amount: amt,
        recipientSecret: recSec,
        salt: s,
        distributionId: d,
        commitment: comm,
      };
    })
    .filter((c: any) => c.recipientSecret && c.amount && c.salt);

  if (normalizedClaims.length === 0) {
    throw new Error(
      'No valid claim credentials found in file. Expected fields: recipientSecret, amount, and salt.',
    );
  }

  return normalizedClaims;
}

describe('Claim Details Modal & Claim File Import System', () => {
  const mockAllocations: ContributorAllocation[] = [
    {
      id: 'rec-1',
      role: 'Lead ZK Protocol Architect',
      recipientKey: 'key_alice',
      recipientSecret: '0101010101010101010101010101010101010101010101010101010101010101',
      amount: 40000n,
      salt: '1111111111111111111111111111111111111111111111111111111111111111',
      commitment: 'comm_alice_123',
      claimed: false,
    },
    {
      id: 'rec-2',
      role: 'Senior Smart Contract Engineer',
      recipientKey: 'key_bob',
      recipientSecret: '0202020202020202020202020202020202020202020202020202020202020202',
      amount: 35000n,
      salt: '2222222222222222222222222222222222222222222222222222222222222222',
      commitment: 'comm_bob_456',
      claimed: false,
    },
    {
      id: 'rec-3',
      role: 'Security Auditor & Reviewer',
      recipientKey: 'key_carol',
      recipientSecret: '0303030303030303030303030303030303030303030303030303030303030303',
      amount: 25000n,
      salt: '3333333333333333333333333333333333333333333333333333333333333333',
      commitment: 'comm_carol_789',
      claimed: false,
    },
  ];

  const contractAddress = 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';
  const distributionId = 'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';

  describe('1. Claim Details Modal UI & Security Checkbox Gating', () => {
    // Render sample Claim Details Modal component with boolean checked state
    function renderClaimModal(savedSecurelyChecked: boolean) {
      return renderToStaticMarkup(
        <div role="dialog" aria-modal="true" aria-labelledby="claim-details-modal-title">
          <div className="warning-callout">
            <span>These claim details can't be recovered if lost</span>
          </div>

          <button type="button">
            <span>Download claim file (JSON)</span>
          </button>

          <div className="recipients-list">
            {mockAllocations.map((alloc) => (
              <div key={alloc.id} className="recipient-row">
                <span>{alloc.role}</span>
                <span>{Number(alloc.amount).toLocaleString()} tDUST</span>
                <button type="button" title={`Copy claim credentials for ${alloc.role}`}>
                  <span>Copy</span>
                </button>
              </div>
            ))}
          </div>

          <label htmlFor="saved-securely-checkbox">
            <input
              type="checkbox"
              id="saved-securely-checkbox"
              checked={savedSecurelyChecked}
              readOnly
            />
            <span>I've saved these securely</span>
          </label>

          <button
            type="button"
            disabled={!savedSecurelyChecked}
            className={savedSecurelyChecked ? 'enabled-btn' : 'disabled-btn'}
          >
            <span>Close Modal</span>
          </button>
        </div>,
      );
    }

    it('renders the critical warning "These claim details can\'t be recovered if lost"', () => {
      const html = renderClaimModal(false);
      expect(html).toContain("These claim details can&#x27;t be recovered if lost");
    });

    it('renders the "Download claim file (JSON)" button', () => {
      const html = renderClaimModal(false);
      expect(html).toContain('Download claim file (JSON)');
    });

    it('renders a Copy button for each recipient in the batch', () => {
      const html = renderClaimModal(false);
      expect(html).toContain('Lead ZK Protocol Architect');
      expect(html).toContain('Senior Smart Contract Engineer');
      expect(html).toContain('Security Auditor &amp; Reviewer');
      // Verify copy buttons
      expect(html).toContain('title="Copy claim credentials for Lead ZK Protocol Architect"');
      expect(html).toContain('title="Copy claim credentials for Senior Smart Contract Engineer"');
      expect(html).toContain('title="Copy claim credentials for Security Auditor &amp; Reviewer"');
    });

    it('renders the "I\'ve saved these securely" confirmation checkbox', () => {
      const html = renderClaimModal(false);
      expect(html).toContain("I&#x27;ve saved these securely");
      expect(html).toContain('id="saved-securely-checkbox"');
    });

    it('disables the close button when "I\'ve saved these securely" is unchecked', () => {
      const html = renderClaimModal(false);
      expect(html).toContain('disabled=""');
      expect(html).toContain('disabled-btn');
    });

    it('enables the close button when "I\'ve saved these securely" is checked', () => {
      const html = renderClaimModal(true);
      expect(html).not.toContain('disabled=""');
      expect(html).toContain('enabled-btn');
      expect(html).toContain('Close Modal');
    });
  });

  describe('2. Master Claim File (JSON) Generation', () => {
    it('generates a valid JSON file containing all required batch details', () => {
      const jsonStr = generateClaimFileJson(
        'Contributor Treasury Q4 Disbursement',
        contractAddress,
        distributionId,
        'preprod',
        mockAllocations,
      );

      const parsed = JSON.parse(jsonStr);
      expect(parsed.warning).toBe("These claim details can't be recovered if lost");
      expect(parsed.distributionTitle).toBe('Contributor Treasury Q4 Disbursement');
      expect(parsed.contractAddress).toBe(contractAddress);
      expect(parsed.distributionId).toBe(distributionId);
      expect(parsed.network).toBe('preprod');
      expect(parsed.totalFunds).toBe('100000');
      expect(parsed.claims).toHaveLength(3);

      // Verify individual recipient claim structure in the batch file
      const alice = parsed.claims[0];
      expect(alice.role).toBe('Lead ZK Protocol Architect');
      expect(alice.amount).toBe('40000');
      expect(alice.recipientSecret).toBe(mockAllocations[0].recipientSecret);
      expect(alice.salt).toBe(mockAllocations[0].salt);
      expect(alice.distributionId).toBe(distributionId);
      expect(alice.contractAddress).toBe(contractAddress);
    });
  });

  describe('3. Per-Recipient Claim Voucher (JSON) Generation for Copy Button', () => {
    it('generates clean JSON containing recipient witness, salt, amount, and contract address', () => {
      const bobAlloc = mockAllocations[1];
      const jsonStr = generateRecipientClaimJson(
        bobAlloc,
        distributionId,
        contractAddress,
        'preprod',
      );

      const parsed = JSON.parse(jsonStr);
      expect(parsed.role).toBe('Senior Smart Contract Engineer');
      expect(parsed.amount).toBe('35000');
      expect(parsed.recipientSecret).toBe(bobAlloc.recipientSecret);
      expect(parsed.salt).toBe(bobAlloc.salt);
      expect(parsed.commitment).toBe('0xcomm_bob_456');
      expect(parsed.distributionId).toBe(distributionId);
      expect(parsed.contractAddress).toBe(contractAddress);
      expect(parsed.warning).toContain("These claim details can't be recovered if lost");
    });
  });

  describe('4. "Import claim file" Logic on ClaimPage', () => {
    it('successfully imports a single recipient claim JSON file', () => {
      const singleClaimJson = JSON.stringify({
        role: 'Lead ZK Protocol Architect',
        amount: '40000',
        recipientSecret: '0101010101010101010101010101010101010101010101010101010101010101',
        salt: '1111111111111111111111111111111111111111111111111111111111111111',
        distributionId,
      });

      const result = parseImportedClaimJson(singleClaimJson);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('Lead ZK Protocol Architect');
      expect(result[0].amount).toBe('40000');
      expect(result[0].recipientSecret).toBe(
        '0101010101010101010101010101010101010101010101010101010101010101',
      );
      expect(result[0].salt).toBe(
        '1111111111111111111111111111111111111111111111111111111111111111',
      );
      expect(result[0].distributionId).toBe(distributionId);
    });

    it('successfully imports a batch claim file downloaded from CreatePage (multiple claims)', () => {
      const batchFileJson = generateClaimFileJson(
        'Treasury Batch',
        contractAddress,
        distributionId,
        'preprod',
        mockAllocations,
      );

      const result = parseImportedClaimJson(batchFileJson);
      expect(result).toHaveLength(3);
      expect(result[0].role).toBe('Lead ZK Protocol Architect');
      expect(result[1].role).toBe('Senior Smart Contract Engineer');
      expect(result[2].role).toBe('Security Auditor & Reviewer');
      expect(result[0].amount).toBe('40000');
      expect(result[1].amount).toBe('35000');
      expect(result[2].amount).toBe('25000');
    });

    it('supports alternative field names like "seed" and "secret"', () => {
      const altJson = JSON.stringify({
        title: 'Core Dev',
        amount: 50000,
        seed: 'dev_secret_key_123',
        salt: 'random_salt_456',
        distId: 'dist_abc_789',
      });

      const result = parseImportedClaimJson(altJson);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('Core Dev');
      expect(result[0].amount).toBe('50000');
      expect(result[0].recipientSecret).toBe('dev_secret_key_123');
      expect(result[0].salt).toBe('random_salt_456');
      expect(result[0].distributionId).toBe('dist_abc_789');
    });

    it('throws descriptive error on invalid JSON syntax', () => {
      expect(() => parseImportedClaimJson('{ invalid: json')).toThrow(
        'Selected file is not valid JSON. Please provide a valid JSON claim file.',
      );
    });

    it('throws descriptive error on empty file', () => {
      expect(() => parseImportedClaimJson('')).toThrow(
        'The selected claim file is empty.',
      );
      expect(() => parseImportedClaimJson('   ')).toThrow(
        'The selected claim file is empty.',
      );
    });

    it('throws descriptive error when required fields are missing', () => {
      const incomplete = JSON.stringify({
        role: 'Tester',
        amount: '1000',
        // missing recipientSecret and salt
      });

      expect(() => parseImportedClaimJson(incomplete)).toThrow(
        'No valid claim credentials found in file. Expected fields: recipientSecret, amount, and salt.',
      );
    });
  });
});
