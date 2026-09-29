import { describe, expect, it } from 'vitest';
import {
  TECHNICAL_TERMS,
  normalizeTermKey,
  getTermDefinition,
  type TechnicalTermKey,
} from '../src/components/common/InfoTooltip';

describe('InfoTooltip Definitions & Accessibility Glossary', () => {
  const requiredTerms: TechnicalTermKey[] = [
    'commitment',
    'nullifier',
    'salt',
    'tDUST',
    'vault',
    'distribution ID',
  ];

  it('1. Provides valid definitions for all required technical terms', () => {
    for (const term of requiredTerms) {
      const def = getTermDefinition(term);
      expect(def, `Missing definition for term: ${term}`).not.toBeNull();
      expect(def?.title.length).toBeGreaterThan(0);
      expect(def?.explanation.length).toBeGreaterThan(15);
    }
  });

  it('2. Enforces strictly one-sentence explanations in plain English', () => {
    for (const [key, def] of Object.entries(TECHNICAL_TERMS)) {
      expect(def.explanation.endsWith('.'), `Explanation for ${key} must end with a period`).toBe(true);

      // Verify it is a single sentence (contains only 1 terminal period, not multiple sentences)
      const sentenceEnders = def.explanation.match(/\./g);
      expect(
        sentenceEnders?.length,
        `Explanation for "${key}" should be exactly one sentence: "${def.explanation}"`
      ).toBe(1);

      // Verify no empty string
      expect(def.explanation.trim().length).toBeGreaterThan(20);
    }
  });

  it('3. Robust normalization of technical term keys', () => {
    expect(normalizeTermKey('commitment')).toBe('commitment');
    expect(normalizeTermKey('Commitment')).toBe('commitment');
    expect(normalizeTermKey('nullifier')).toBe('nullifier');
    expect(normalizeTermKey('Nullifier')).toBe('nullifier');
    expect(normalizeTermKey('salt')).toBe('salt');
    expect(normalizeTermKey('Blinding Salt')).toBe('blindingsalt');
    expect(normalizeTermKey('tDUST')).toBe('tdust');
    expect(normalizeTermKey('TDUST')).toBe('tdust');
    expect(normalizeTermKey('vault')).toBe('vault');
    expect(normalizeTermKey('Distribution ID')).toBe('distributionid');
    expect(normalizeTermKey('distributionId')).toBe('distributionid');
    expect(normalizeTermKey('distribution-id')).toBe('distributionid');
  });

  it('4. Correctly retrieves definitions regardless of case and spacing', () => {
    expect(getTermDefinition('commitment')?.title).toBe('Commitment');
    expect(getTermDefinition('COMMITMENT')?.title).toBe('Commitment');
    expect(getTermDefinition('nullifier')?.title).toBe('Nullifier');
    expect(getTermDefinition('salt')?.title).toBe('Blinding Salt');
    expect(getTermDefinition('tDUST')?.title).toBe('tDUST');
    expect(getTermDefinition('TDUST')?.title).toBe('tDUST');
    expect(getTermDefinition('vault')?.title).toBe('Vault');
    expect(getTermDefinition('distribution ID')?.title).toBe('Distribution ID');
    expect(getTermDefinition('distributionId')?.title).toBe('Distribution ID');
  });
});
