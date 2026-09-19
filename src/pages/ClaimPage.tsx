import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Copy,
  ExternalLink,
  Sigma,
  ArrowRight,
  EyeOff,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { NETWORK_CONFIG } from '../utils/config';
import { ContributorAllocation, generateRandomHex32 } from '../utils/contract';

export const ClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { vaultState, claimPayout, isProving, provingStep, claimResult, claimError, clearClaimState } = useVault();

  // Form Fields (Preserving existing field semantics)
  const [recipientSecret, setRecipientSecret] = useState('');
  const [amount, setAmount] = useState('');
  const [salt, setSalt] = useState('');
  const [distId, setDistId] = useState('');
  const [claimSpendSecret, setClaimSpendSecret] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize distId
  useEffect(() => {
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
  }, [vaultState?.distributionId]);

  // Handle URL query parameter prefill
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && vaultState?.allocations) {
      const match = vaultState.allocations.find(
        (a) => a.role.toLowerCase() === roleParam.toLowerCase()
      );
      if (match) {
        handleQuickFill(match);
      }
    }
  }, [searchParams, vaultState?.allocations]);

  const handleQuickFill = (alloc: ContributorAllocation) => {
    clearClaimState();
    setRecipientSecret(alloc.recipientSecret);
    setAmount(alloc.amount.toString());
    setSalt(alloc.salt);
    setClaimSpendSecret(generateRandomHex32());
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || BigInt(amount) <= 0n) {
      return;
    }

    try {
      await claimPayout(recipientSecret, BigInt(amount), salt, distId, claimSpendSecret);
    } catch {
      // Handled in context
    }
  };

  // Tamper / Cheat Attempt simulation for reviewer
  const handleSimulateCheat = () => {
    clearClaimState();
    const tampered = (BigInt(amount || '1000') + 10_000n).toString();
    setAmount(tampered);
  };

  return (
    <div className="w-full pb-24 space-y-12">
      {/* 1. MINT HEADER BLOCK */}
      <section className="bg-bg-elev border-b border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
              Private Claim on Midnight
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight">
              Prove your share. Reveal nothing.
            </h1>

            <p className="text-sm text-muted max-w-lg leading-relaxed">
              Synthesize client-side zero-knowledge proofs from your confidential credentials.
              The smart contract verifies your entitlement without ever learning your identity or payout amount.
            </p>
          </div>

          {/* Tilted Mint Card on Right */}
          <div className="relative shrink-0 hidden lg:block">
            <div
              className="w-52 p-5 bg-card-mint text-ink border-2 border-border shadow-lg rounded"
              style={{ transform: 'rotate(-4deg)' }}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase opacity-70 mb-2">
                Midnight Settlement
              </div>
              <div className="font-display text-4xl font-extrabold tracking-tight">
                Shield
              </div>
              <div className="text-xs opacity-90 mt-2 font-mono">
                Unlinkable Nullifiers
              </div>
              <div className="absolute -bottom-2 -right-2 opacity-15 pointer-events-none">
                <Sigma size={70} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTENT: 3-STEP FLOW */}
      <div className="max-w-5xl mx-auto px-6 space-y-8">
        {/* Step Indicator Strip */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono text-xs font-bold">
              01
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-text">Enter Private Credentials</h2>
              <span className="text-xs text-muted">Client-side witnesses kept strictly in local memory</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-muted hidden sm:inline-flex items-center gap-1">
              <Lock size={12} className="text-emerald-400" />
              <span>Zero Witness Leakage</span>
            </span>
          </div>
        </div>

        {/* Quick-Test Presets from Vault */}
        <div className="p-5 bg-surface border border-border rounded space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted block">
            Preloaded Contributor Test Credentials (Click to Auto-Fill):
          </span>
          <div className="flex flex-wrap gap-2">
            {vaultState?.allocations.map((alloc) => (
              <button
                key={alloc.id}
                type="button"
                onClick={() => handleQuickFill(alloc)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-hover hover:bg-surface border border-border hover:border-sky-400 text-text transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>{alloc.role}</span>
                <span className="font-mono text-sky-400">
                  ({Number(alloc.amount).toLocaleString()} tDUST)
                </span>
                {alloc.claimed && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">
                    [Claimed]
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleClaim} className="sharp-card p-7 sm:p-8 space-y-6">
          {/* Recipient Identity Secret */}
          <div>
            <label className="editorial-label flex items-center justify-between">
              <span>Recipient Identity Secret (Private Witness)</span>
              <span className="text-[10px] font-mono text-muted lowercase">never revealed on-chain</span>
            </label>
            <input
              type="text"
              required
              value={recipientSecret}
              onChange={(e) => setRecipientSecret(e.target.value)}
              placeholder="32-byte hex secret or passphrase seed"
              className="editorial-input editorial-input-mono text-xs text-text"
            />
          </div>

          {/* Amount & Salt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="editorial-label">Allocated Payout Amount (tDUST)</label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="editorial-input editorial-input-mono text-sm font-bold text-sky-400"
              />
            </div>

            <div>
              <label className="editorial-label">Cryptographic Blinding Salt (32-byte Hex)</label>
              <input
                type="text"
                required
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="256-bit entropy salt"
                className="editorial-input editorial-input-mono text-xs text-muted"
              />
            </div>
          </div>

          {/* Distribution Batch ID */}
          <div>
            <label className="editorial-label">Distribution Batch ID</label>
            <input
              type="text"
              required
              value={distId}
              onChange={(e) => setDistId(e.target.value)}
              placeholder="Distribution identifier"
              className="editorial-input editorial-input-mono text-xs text-muted"
            />
          </div>

          {/* Nullifier Secret */}
          <div>
            <label className="editorial-label flex items-center justify-between">
              <span>Nullifier Spending Key (Auto-Generated Entropy)</span>
              <span className="text-[10px] font-mono text-muted lowercase">ensures un-linkability</span>
            </label>
            <input
              type="text"
              value={claimSpendSecret}
              onChange={(e) => setClaimSpendSecret(e.target.value)}
              placeholder="Random 32-byte spending key"
              className="editorial-input editorial-input-mono text-xs text-muted"
            />
          </div>

          {/* Privacy Note Panel */}
          <div className="p-4 rounded bg-surface-hover border border-border flex items-start gap-3 text-xs text-muted">
            <Lock size={16} className="text-sky-400 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Zero Witness Leakage Guarantee:</strong> Your secret passphrase, salt, and amount never leave your local browser runtime.
              Midnight's circuit generates a mathematical zero-knowledge proof proving entitlement against the on-chain commitment set.
            </p>
          </div>

          {/* Proving Step Progress Panel */}
          {isProving && (
            <div className="p-5 rounded bg-sky-500/10 border border-sky-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-sky-400" />
                <span className="text-sm font-bold text-text">{provingStep}</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className="bg-sky-400 h-full rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Error Notice */}
          {claimError && (
            <div className="p-5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm space-y-1">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Verification Rejection</span>
              </div>
              <p className="leading-relaxed">{claimError}</p>
            </div>
          )}

          {/* Success Result */}
          {claimResult && (
            <div className="p-6 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <Check size={18} />
                  <span>{claimResult.message}</span>
                </div>
                <span className="font-mono text-xs text-emerald-300">{claimResult.timestamp}</span>
              </div>

              <div className="space-y-2 font-mono text-xs pt-2 border-t border-emerald-500/20">
                <div className="p-3 bg-surface border border-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted font-sans text-[11px]">Unlinkable Nullifier:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text break-all">{claimResult.nullifier}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(claimResult.nullifier, 'nullifier')}
                      className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer"
                    >
                      {copiedField === 'nullifier' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-surface border border-border rounded flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-muted font-sans text-[11px]">Committed Leaf:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text break-all">{claimResult.commitment}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(claimResult.commitment, 'commitment')}
                      className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer"
                    >
                      {copiedField === 'commitment' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <p className="text-xs text-emerald-300 italic">
                  Nullifier published to prevent double spending. Recipient identity and amount ({amount} tDUST) remain strictly secret.
                </p>
                <a
                  href={NETWORK_CONFIG.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
                >
                  <span>View Contract on 1AM Explorer</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}

          {/* CTA Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="submit"
              disabled={isProving}
              className="btn-pill btn-pill-sky flex-1 py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Synthesizing ZK Proof...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Prove Entitlement & Settle Claim</span>
                </>
              )}
            </button>

            {/* Cheat Simulator Button for Reviewer */}
            <button
              type="button"
              onClick={handleSimulateCheat}
              className="btn-pill btn-pill-outline py-3.5 px-4 text-xs font-semibold text-muted hover:text-text"
              title="Tamper with allocation amount to test cryptographic ZK circuit rejection"
            >
              Simulate Cheat (+10k tDUST)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
