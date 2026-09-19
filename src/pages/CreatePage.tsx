import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Coins,
  Percent,
  Users,
  AlertCircle,
  ArrowRight,
  EyeOff,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useWallet } from '../context/WalletContext';

interface RecipientRow {
  id: string;
  role: string;
  amount: string;
  percentage: string;
  weight: string;
  seed: string;
}

export const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { createDistributionBatch, vaultState } = useVault();
  const wallet = useWallet();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [distTitle, setDistTitle] = useState('Contributor Treasury Q4 Disbursement');
  const [distPurpose, setDistPurpose] = useState('Core engineering milestone compensation and grant payments');
  const [totalFundsStr, setTotalFundsStr] = useState('100000');
  const [ruleType, setRuleType] = useState<'fixed' | 'percentage' | 'contribution'>('fixed');

  // Recipients
  const [recipients, setRecipients] = useState<RecipientRow[]>([
    {
      id: 'rec-1',
      role: 'Lead ZK Protocol Architect',
      amount: '40000',
      percentage: '40',
      weight: '4',
      seed: 'contributor_alice_seed',
    },
    {
      id: 'rec-2',
      role: 'Senior Smart Contract Engineer',
      amount: '35000',
      percentage: '35',
      weight: '3.5',
      seed: 'contributor_bob_seed',
    },
    {
      id: 'rec-3',
      role: 'Security Auditor & Reviewer',
      amount: '25000',
      percentage: '25',
      weight: '2.5',
      seed: 'contributor_carol_seed',
    },
  ]);

  // Submit and Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Calculations
  const totalFunds = useMemo(() => {
    try {
      const val = BigInt(totalFundsStr || '0');
      return val > 0n ? val : 0n;
    } catch {
      return 0n;
    }
  }, [totalFundsStr]);

  const allocatedTotal = useMemo(() => {
    if (ruleType === 'fixed') {
      return recipients.reduce((acc, r) => {
        try {
          return acc + BigInt(r.amount || '0');
        } catch {
          return acc;
        }
      }, 0n);
    }

    if (ruleType === 'percentage') {
      const totalPct = recipients.reduce((acc, r) => acc + (parseFloat(r.percentage) || 0), 0);
      if (totalPct === 0) return 0n;
      return (totalFunds * BigInt(Math.round(totalPct))) / 100n;
    }

    // Contribution weights
    const totalWeight = recipients.reduce((acc, r) => acc + (parseFloat(r.weight) || 0), 0);
    if (totalWeight === 0) return 0n;
    return totalFunds;
  }, [recipients, ruleType, totalFunds]);

  const remainingFunds = totalFunds - allocatedTotal;
  const isAllocationBalanced = remainingFunds === 0n && totalFunds > 0n && recipients.length > 0;

  // Add & Remove Recipients
  const handleAddRecipient = () => {
    setRecipients((prev) => [
      ...prev,
      {
        id: `rec-${Date.now()}`,
        role: `Contributor ${prev.length + 1}`,
        amount: '0',
        percentage: '0',
        weight: '1',
        seed: `contributor_${Date.now()}`,
      },
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    if (recipients.length <= 1) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRecipient = (id: string, field: keyof RecipientRow, val: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Submit Handler
  const handleSubmitDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllocationBalanced) {
      setSubmitError('The total allocated amount must equal the total vault funds.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Map to computed tDUST amounts
      const allocationsPayload = recipients.map((r) => {
        let finalAmount = 0n;
        if (ruleType === 'fixed') {
          finalAmount = BigInt(r.amount || '0');
        } else if (ruleType === 'percentage') {
          const pct = parseFloat(r.percentage) || 0;
          finalAmount = (totalFunds * BigInt(Math.round(pct * 100))) / 10000n;
        } else {
          const totalWeight = recipients.reduce((acc, cur) => acc + (parseFloat(cur.weight) || 0), 0);
          const weight = parseFloat(r.weight) || 0;
          finalAmount = totalWeight > 0 ? (totalFunds * BigInt(Math.round((weight / totalWeight) * 10000))) / 10000n : 0n;
        }

        return {
          role: r.role,
          amount: finalAmount,
          seed: r.seed,
        };
      });

      await createDistributionBatch(distTitle, totalFunds, allocationsPayload);
      setSubmitSuccess(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to register distribution batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full pb-24 space-y-12">
      {/* 1. DARK HEADER BLOCK */}
      <section className="bg-bg-elev border-b border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <Link
              to="/vault"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text transition-colors no-underline mb-2"
            >
              <ChevronLeft size={14} />
              <span>All distributions</span>
            </Link>

            <div className="text-xs uppercase font-extrabold tracking-widest text-sky-400">
              Create on Midnight Preprod
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight">
              Every share, sealed.
            </h1>

            <p className="text-sm text-muted max-w-lg leading-relaxed">
              Define your distribution batch, deposit aggregate treasury funds, and generate opaque cryptographic commitments for eligible recipients.
            </p>
          </div>

          {/* Tilted Indigo Card on Right with ZK Mark */}
          <div className="relative shrink-0 hidden lg:block">
            <div
              className="w-52 p-5 bg-card-indigo text-white border-2 border-border shadow-lg rounded"
              style={{ transform: 'rotate(4deg)' }}
            >
              <div className="text-[10px] font-bold tracking-widest uppercase opacity-80 mb-2">
                Midnight ZK Circuit
              </div>
              <div className="font-display text-4xl font-extrabold tracking-tight">
                ZK
              </div>
              <div className="text-xs opacity-90 mt-2 font-mono">
                vaultSplitX.compact
              </div>
              <div className="absolute -bottom-2 -right-2 opacity-20 pointer-events-none">
                <ShieldCheck size={70} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Body */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Step Tab Strip */}
        <div className="step-tab-strip" role="tablist">
          <button
            onClick={() => setCurrentStep(1)}
            className={`step-tab-btn ${currentStep === 1 ? 'active' : ''}`}
            role="tab"
            aria-selected={currentStep === 1}
          >
            <span className="font-mono text-xs text-sky-400">01</span>
            <span>Name It</span>
          </button>
          <button
            onClick={() => setCurrentStep(2)}
            className={`step-tab-btn ${currentStep === 2 ? 'active' : ''}`}
            role="tab"
            aria-selected={currentStep === 2}
          >
            <span className="font-mono text-xs text-sky-400">02</span>
            <span>Fund the Vault</span>
          </button>
          <button
            onClick={() => setCurrentStep(3)}
            className={`step-tab-btn ${currentStep === 3 ? 'active' : ''}`}
            role="tab"
            aria-selected={currentStep === 3}
          >
            <span className="font-mono text-xs text-sky-400">03</span>
            <span>Set Allocations</span>
          </button>
        </div>

        <form onSubmit={handleSubmitDistribution}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Form Sections (8 Cols) */}
            <div className="lg:col-span-8 space-y-10">
              {/* STEP 1: IDENTITY */}
              <section className="sharp-card p-7 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <span className="w-7 h-7 rounded-full bg-sky-400/15 text-sky-400 border border-sky-400/30 flex items-center justify-center font-mono text-xs font-bold">
                    01
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold text-text">Distribution Identity</h2>
                    <p className="text-xs text-muted">Assign a recognizable title and operational purpose to this batch.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="dist-title" className="editorial-label">
                      Distribution Name (Required)
                    </label>
                    <input
                      id="dist-title"
                      type="text"
                      required
                      value={distTitle}
                      onChange={(e) => setDistTitle(e.target.value)}
                      placeholder="e.g. Q3 Contributor Treasury Disbursement"
                      className="editorial-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="dist-purpose" className="editorial-label">
                      Purpose & Details (Optional)
                    </label>
                    <input
                      id="dist-purpose"
                      type="text"
                      value={distPurpose}
                      onChange={(e) => setDistPurpose(e.target.value)}
                      placeholder="e.g. Sprint bounty milestones and developer grants"
                      className="editorial-input"
                    />
                  </div>
                </div>
              </section>

              {/* STEP 2: FUND THE VAULT */}
              <section className="sharp-card p-7 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <span className="w-7 h-7 rounded-full bg-sky-400/15 text-sky-400 border border-sky-400/30 flex items-center justify-center font-mono text-xs font-bold">
                    02
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold text-text">Fund the Vault</h2>
                    <p className="text-xs text-muted">Specify the aggregate pool deposited into the Midnight smart contract.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="dist-total" className="editorial-label">
                      Total Vault Funds (tDUST)
                    </label>
                    <div className="relative">
                      <input
                        id="dist-total"
                        type="number"
                        min="1"
                        required
                        value={totalFundsStr}
                        onChange={(e) => setTotalFundsStr(e.target.value)}
                        className="editorial-input editorial-input-mono text-lg font-bold text-sky-400"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-muted">
                        tDUST
                      </span>
                    </div>
                  </div>

                  {/* Quick-Pick Chips */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-muted mr-1">Quick pick:</span>
                    {[
                      { label: '1,000', value: '1000' },
                      { label: '10,000', value: '10000' },
                      { label: '50,000', value: '50000' },
                      { label: '100,000', value: '100000' },
                      { label: '250,000', value: '250000' },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setTotalFundsStr(preset.value)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer ${
                          totalFundsStr === preset.value
                            ? 'bg-sky-400/20 text-sky-400 border-sky-400'
                            : 'bg-surface border-border text-muted hover:text-text'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* STEP 3: ALLOCATIONS & RECIPIENTS */}
              <section className="sharp-card p-7 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-sky-400/15 text-sky-400 border border-sky-400/30 flex items-center justify-center font-mono text-xs font-bold">
                      03
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-bold text-text">Recipient Allocations</h2>
                      <p className="text-xs text-muted">Define confidential shares. Amounts are blinded into client-side commitments.</p>
                    </div>
                  </div>

                  {/* Rule Type Selector */}
                  <div className="flex items-center gap-1.5 p-1 bg-surface-hover border border-border rounded-full">
                    <button
                      type="button"
                      onClick={() => setRuleType('fixed')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        ruleType === 'fixed'
                          ? 'bg-sky-400 text-ink shadow-sm'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      <Coins size={13} />
                      <span>Fixed Shares</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRuleType('percentage')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        ruleType === 'percentage'
                          ? 'bg-sky-400 text-ink shadow-sm'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      <Percent size={13} />
                      <span>Percentage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRuleType('contribution')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        ruleType === 'contribution'
                          ? 'bg-sky-400 text-ink shadow-sm'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      <Users size={13} />
                      <span>Weights</span>
                    </button>
                  </div>
                </div>

                {/* Running Allocated Bar */}
                <div className="p-4 bg-surface-hover border border-border rounded space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text">
                      Allocated {Number(allocatedTotal).toLocaleString()} of {Number(totalFunds).toLocaleString()} tDUST
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        remainingFunds === 0n
                          ? 'text-emerald-400'
                          : remainingFunds > 0n
                          ? 'text-sky-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {remainingFunds === 0n
                        ? '100% Balanced'
                        : remainingFunds > 0n
                        ? `${Number(remainingFunds).toLocaleString()} tDUST Remaining`
                        : `${Number(-remainingFunds).toLocaleString()} tDUST Overallocated`}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        remainingFunds === 0n
                          ? 'bg-emerald-400'
                          : remainingFunds > 0n
                          ? 'bg-sky-400'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          totalFunds > 0n ? Number((allocatedTotal * 100n) / totalFunds) : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Recipients Table / Rows */}
                <div className="space-y-3">
                  {recipients.map((rec, index) => (
                    <div
                      key={rec.id}
                      className="p-4 bg-surface border border-border rounded space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Contributor Label */}
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                            Recipient #{index + 1} Role / Label
                          </label>
                          <input
                            type="text"
                            required
                            value={rec.role}
                            onChange={(e) => handleUpdateRecipient(rec.id, 'role', e.target.value)}
                            placeholder="e.g. Frontend Engineer"
                            className="editorial-input text-xs"
                          />
                        </div>

                        {/* Amount / Pct / Weight depending on ruleType */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                            {ruleType === 'fixed'
                              ? 'Amount (tDUST)'
                              : ruleType === 'percentage'
                              ? 'Share (%)'
                              : 'Weight'}
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step={ruleType === 'percentage' ? '0.1' : '1'}
                            value={
                              ruleType === 'fixed'
                                ? rec.amount
                                : ruleType === 'percentage'
                                ? rec.percentage
                                : rec.weight
                            }
                            onChange={(e) =>
                              handleUpdateRecipient(
                                rec.id,
                                ruleType === 'fixed'
                                  ? 'amount'
                                  : ruleType === 'percentage'
                                  ? 'percentage'
                                  : 'weight',
                                e.target.value
                              )
                            }
                            className="editorial-input editorial-input-mono text-xs font-bold text-sky-400"
                          />
                        </div>

                        {/* Secret Seed */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                            Secret Seed
                          </label>
                          <input
                            type="text"
                            value={rec.seed}
                            onChange={(e) => handleUpdateRecipient(rec.id, 'seed', e.target.value)}
                            className="editorial-input editorial-input-mono text-[11px] text-muted truncate"
                            title="Private witness seed used for ZK entitlement proof"
                          />
                        </div>

                        {/* Delete Row */}
                        <div className="sm:col-span-1 flex justify-end pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(rec.id)}
                            disabled={recipients.length <= 1}
                            className="p-2 rounded text-muted hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                            aria-label="Remove recipient row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Add Recipient Row</span>
                </button>
              </section>

              {/* Feedback States */}
              {submitError && (
                <div className="p-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Check size={18} />
                    <span>Distribution successfully created and registered!</span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    Opaque commitments have been published to Midnight. Recipients can now privately claim their allocations.
                  </p>
                  <div className="pt-2">
                    <Link to="/vault" className="btn-pill btn-pill-sky text-xs py-2 px-4 inline-flex items-center gap-1.5">
                      <span>View in Vault Dashboard</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              {!submitSuccess && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isAllocationBalanced}
                    className="btn-pill btn-pill-sky py-3.5 px-8 text-sm font-bold w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Registering Commitments to Midnight...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Deploy & Register Distribution</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Sticky Right Column: LIVE PREVIEW Panel (4 Cols) */}
            <div className="lg:col-span-4">
              <aside className="live-preview-panel" aria-label="Live Distribution Preview">
                <div className="text-[10px] uppercase font-mono font-bold text-sky-400 tracking-wider mb-3">
                  Live Preview
                </div>

                {/* Tilted Pink Preview Card */}
                <div className="preview-tilted-card">
                  <div className="text-[10px] font-bold tracking-widest uppercase opacity-80 mb-1">
                    Distribution Batch
                  </div>
                  <div className="font-display text-lg font-bold text-ink truncate mb-3">
                    {distTitle || 'Untitled Batch'}
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink/70">
                    Total Locked Pool
                  </div>
                  <div className="font-display text-2xl font-extrabold text-ink">
                    {Number(totalFunds).toLocaleString()}{' '}
                    <span className="text-xs font-mono font-normal">tDUST</span>
                  </div>

                  <div className="card-corner-icon" aria-hidden="true">
                    <EyeOff size={58} />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold block">Recipients</span>
                    <span className="font-mono text-sm font-bold text-text">
                      {recipients.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold block">Rule</span>
                    <span className="text-xs font-semibold text-text capitalize">
                      {ruleType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase font-bold block">Network</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      Preprod
                    </span>
                  </div>
                </div>

                {/* Built-in Privacy Checklist */}
                <div className="pt-4 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-text">
                    Built-in Privacy Guarantees
                  </div>

                  <ul className="space-y-2 text-xs text-muted list-none p-0">
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>Individual payment amounts never stored on-chain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>One claim per recipient enforced via nullifiers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>Total funds publicly verifiable by all observers</span>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
