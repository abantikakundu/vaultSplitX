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
  AlertTriangle,
  ArrowRight,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Info,
  Copy,
  Download,
  FileText,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { formatHumanReadableError } from '../utils/formatError';
import { getExplorerTxUrl, getExplorerContractUrl } from '../utils/config';
import { ContributorAllocation } from '../utils/contract';
import { InfoTooltip } from '../components/common/InfoTooltip';
import { ProofActionButton, useProofAction } from '../components/common/ProofActionButton';
import { FieldError } from '../components/common/FieldError';

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
  const {
    createDistributionBatch,
    vaultState,
    isProving,
    provingStep,
    provingElapsedSeconds,
    resetOrganizerSecret,
  } = useVault();
  const wallet = useWallet();
  const toast = useToast();
  const targetContractAddress =
    vaultState?.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';

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
  const { isProcessing: isSubmitting, elapsedSeconds, executeAction } = useProofAction();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    contractAddress?: string;
    txHash?: string;
    distributionId?: string;
    allocations?: ContributorAllocation[];
  } | null>(null);
  const [createdAllocations, setCreatedAllocations] = useState<ContributorAllocation[]>([]);
  const [showClaimDetailsModal, setShowClaimDetailsModal] = useState(false);
  const [savedSecurelyChecked, setSavedSecurelyChecked] = useState(false);
  const [copiedRecipientId, setCopiedRecipientId] = useState<string | null>(null);

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

  // Validation: Title
  const titleError = useMemo(() => {
    if (!distTitle.trim()) return 'Distribution name is required.';
    return null;
  }, [distTitle]);

  // Validation: Total Vault Funds (Amounts must be positive)
  const totalFundsError = useMemo(() => {
    if (!totalFundsStr.trim()) return 'Total vault funds is required.';
    try {
      const val = BigInt(totalFundsStr);
      if (val <= 0n) return 'Total vault funds must be a positive number greater than 0.';
    } catch {
      return 'Total vault funds must be a valid positive integer.';
    }
    return null;
  }, [totalFundsStr]);

  // Validation: Recipients (Amounts must be positive, no empty or duplicate recipients)
  const recipientErrors = useMemo(() => {
    const errors: Record<string, { role?: string; amount?: string; seed?: string }> = {};

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
      const rowErr: { role?: string; amount?: string; seed?: string } = {};
      const cleanRole = r.role.trim();
      if (!cleanRole) {
        rowErr.role = 'Recipient role/name cannot be empty.';
      } else if (roleCounts[cleanRole.toLowerCase()] > 1) {
        rowErr.role = 'Duplicate recipient: role/name must be unique.';
      }

      if (ruleType === 'fixed') {
        if (!r.amount.trim()) {
          rowErr.amount = 'Amount is required.';
        } else {
          try {
            const amt = BigInt(r.amount);
            if (amt <= 0n) {
              rowErr.amount = 'Amount must be greater than 0 tDUST.';
            }
          } catch {
            rowErr.amount = 'Amount must be a valid positive integer.';
          }
        }
      } else if (ruleType === 'percentage') {
        if (!r.percentage.trim()) {
          rowErr.amount = 'Share percentage is required.';
        } else {
          const num = parseFloat(r.percentage);
          if (isNaN(num) || num <= 0) {
            rowErr.amount = 'Percentage must be greater than 0%.';
          } else if (num > 100) {
            rowErr.amount = 'Percentage cannot exceed 100%.';
          }
        }
      } else {
        if (!r.weight.trim()) {
          rowErr.amount = 'Contribution weight is required.';
        } else {
          const num = parseFloat(r.weight);
          if (isNaN(num) || num <= 0) {
            rowErr.amount = 'Weight must be greater than 0.';
          }
        }
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
  }, [recipients, ruleType]);

  const hasRecipientErrors = useMemo(() => {
    return Object.values(recipientErrors).some((err) => err.role || err.amount || err.seed);
  }, [recipientErrors]);

  // Validation: Sum of allocations must not exceed total vault funds
  const allocationsSumError = useMemo(() => {
    if (allocatedTotal > totalFunds && totalFunds > 0n) {
      return `Sum of allocations (${Number(allocatedTotal).toLocaleString()} tDUST) exceeds total vault funds (${Number(totalFunds).toLocaleString()} tDUST).`;
    }
    if (ruleType === 'percentage') {
      const totalPct = recipients.reduce((acc, r) => acc + (parseFloat(r.percentage) || 0), 0);
      if (totalPct > 100) {
        return `Total percentage (${totalPct.toFixed(1)}%) exceeds 100%.`;
      }
    }
    return null;
  }, [allocatedTotal, totalFunds, ruleType, recipients]);

  // Form is valid when:
  // - Amounts are positive
  // - No empty or duplicate recipients
  // - Sum of allocations does not exceed total vault funds
  const isFormValid = useMemo(() => {
    return (
      !titleError &&
      !totalFundsError &&
      !hasRecipientErrors &&
      !allocationsSumError &&
      recipients.length > 0 &&
      totalFunds > 0n &&
      allocatedTotal > 0n &&
      allocatedTotal <= totalFunds
    );
  }, [
    titleError,
    totalFundsError,
    hasRecipientErrors,
    allocationsSumError,
    recipients.length,
    totalFunds,
    allocatedTotal,
  ]);

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
    if (isSubmitting || isProving) return;
    if (!isFormValid) {
      let msg = 'Please fix all inline validation errors before submitting.';
      if (allocationsSumError) {
        msg = allocationsSumError;
      } else if (hasRecipientErrors) {
        msg = 'Please correct recipient errors: amounts must be positive, and no empty or duplicate recipients.';
      } else if (totalFundsError) {
        msg = totalFundsError;
      }
      setSubmitError(msg);
      toast.error(msg, { title: 'Invalid Form' });
      return;
    }

    setSubmitError(null);

    await executeAction(async () => {
      // 1. Ensure real 1AM wallet is connected. Prompt 1AM wallet if disconnected or in demo mode!
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        try {
          const connected = await wallet.connectWallet(false);
          if (!connected?.connectedApi) {
            throw new Error('1AM Wallet connection was not completed. Please approve connection in your 1AM wallet.');
          }
          activeApi = connected.connectedApi;
        } catch (connErr) {
          toast.error(connErr, { title: 'Wallet Connection Required' });
          const cMsg = formatHumanReadableError(connErr, 'Wallet connection');
          setSubmitError(cMsg);
          return;
        }
      }

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

      const res = await createDistributionBatch(distTitle, totalFunds, allocationsPayload, activeApi);
      setCreatedResult(res);
      setCreatedAllocations(res.allocations || []);
      setSubmitSuccess(true);
      setSavedSecurelyChecked(false);
      setShowClaimDetailsModal(true);
      toast.success('Distribution batch registered successfully on Midnight Preprod!', {
        title: 'Distribution Created',
        txHash: res.txHash,
      });
    }).catch((err: unknown) => {
      toast.error(err, { title: 'Distribution Failed' });
      const humanMsg = formatHumanReadableError(err, 'Distribution registration');
      setSubmitError(humanMsg);
    });
  };

  const effectiveAllocations = useMemo(() => {
    if (createdAllocations.length > 0) return createdAllocations;
    if (createdResult?.allocations && createdResult.allocations.length > 0) return createdResult.allocations;
    return [];
  }, [createdAllocations, createdResult?.allocations]);

  const handleDownloadClaimFile = () => {
    const list = effectiveAllocations;
    const distId =
      createdResult?.distributionId ||
      vaultState?.distributionId ||
      'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';
    const fileData = {
      version: '1.0',
      warning: "These claim details can't be recovered if lost",
      distributionTitle: distTitle,
      contractAddress: targetContractAddress,
      distributionId: distId,
      network: wallet.network || 'preprod',
      createdAt: new Date().toISOString(),
      totalFunds: totalFunds.toString(),
      claims: list.map((alloc) => ({
        role: alloc.role,
        amount: alloc.amount.toString(),
        recipientSecret: alloc.recipientSecret,
        salt: alloc.salt,
        commitment: alloc.commitment ? `0x${alloc.commitment.replace(/^0x/, '')}` : undefined,
        distributionId: distId,
        contractAddress: targetContractAddress,
        instructions: 'Import this claim file on the VaultSplitX Claim page to synthesize a zero-knowledge claim proof.',
      })),
    };

    const jsonStr = JSON.stringify(fileData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle =
      distTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'distribution';
    link.href = url;
    link.download = `claim-file-${safeTitle}-${distId.slice(0, 8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Claim file downloaded successfully! Keep this file in a secure location.', {
      title: 'Claim File Saved',
    });
  };

  const handleCopyRecipientClaim = (alloc: ContributorAllocation) => {
    const distId =
      createdResult?.distributionId ||
      vaultState?.distributionId ||
      'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';
    const recipientVoucher = {
      role: alloc.role,
      amount: alloc.amount.toString(),
      recipientSecret: alloc.recipientSecret,
      salt: alloc.salt,
      commitment: alloc.commitment ? `0x${alloc.commitment.replace(/^0x/, '')}` : undefined,
      distributionId: distId,
      contractAddress: targetContractAddress,
      network: wallet.network || 'preprod',
      warning: "These claim details can't be recovered if lost. Keep your recipient secret and salt private.",
      instructions: 'Import this claim file or copy these details into the VaultSplitX Claim page to claim your funds.',
    };

    navigator.clipboard.writeText(JSON.stringify(recipientVoucher, null, 2));
    setCopiedRecipientId(alloc.id);
    setTimeout(() => setCopiedRecipientId(null), 2500);
    toast.info(`Claim details for ${alloc.role} copied to clipboard!`, {
      title: 'Claim Details Copied',
    });
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
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Target Midnight Smart Contract & Organizer Authority Banner */}
        <div className="p-4 rounded-lg bg-surface border border-sky-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs shadow-sm">
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 mt-1" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-text">Target Midnight Smart Contract:</span>
                <span className="font-mono text-sky-400 font-semibold break-all">
                  0x{targetContractAddress.replace(/^0x/, '')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-muted text-[11px]">
                <span>Organizer Key:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  0x{(vaultState?.organizerKey || 'ec09fba5287d79904b8fc6e9c697beca57ec057ee4d41e8988da557833d5fc13').slice(0, 10)}...
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  <ShieldCheck size={11} /> Verified Organizer
                </span>
              </div>
              <p className="text-muted text-[11px]">
                Prompts connected 1AM wallet to execute <code className="text-sky-300 font-mono">registerAllocation</code> on Midnight Preprod testnet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                resetOrganizerSecret();
                setSubmitError(null);
                toast.info('Organizer credentials reset to contract defaults.', {
                  title: 'Credentials Reset',
                });
              }}
              title="Reset organizer credentials to contract defaults"
              className="btn-pill btn-pill-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 text-muted hover:text-text cursor-pointer"
            >
              <RefreshCw size={11} />
              <span>Reset Credentials</span>
            </button>
            <a
              href={getExplorerContractUrl(targetContractAddress, wallet.network || 'preprod')}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-pill-outline text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold no-underline"
            >
              <span>View on 1AM Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

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
            <InfoTooltip term="vault" />
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
                    <h2 className="font-display text-xl font-bold text-text inline-flex items-center gap-1.5">
                      <span>Distribution Identity</span>
                      <InfoTooltip term="distribution ID" />
                    </h2>
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
                      className={`editorial-input ${titleError ? 'editorial-input-error' : ''}`}
                    />
                    <FieldError message={titleError} />
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
                    <h2 className="font-display text-xl font-bold text-text inline-flex items-center gap-1.5">
                      <span>Fund the Vault</span>
                      <InfoTooltip term="vault" />
                    </h2>
                    <p className="text-xs text-muted">Specify the aggregate pool deposited into the Midnight smart contract.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <label htmlFor="dist-total" className="editorial-label inline-flex items-center gap-1 mb-0">
                        <span>Total Vault Funds (tDUST)</span>
                        <InfoTooltip term="vault" />
                        <InfoTooltip term="tDUST" />
                      </label>
                      <span
                        className={`remaining-counter-badge ${
                          remainingFunds < 0n
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        Remaining: {remainingFunds < 0n ? `-${Number(-remainingFunds).toLocaleString()}` : Number(remainingFunds).toLocaleString()} tDUST
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="dist-total"
                        type="number"
                        min="1"
                        required
                        value={totalFundsStr}
                        onChange={(e) => setTotalFundsStr(e.target.value)}
                        className={`editorial-input editorial-input-mono text-lg font-bold text-sky-400 ${
                          totalFundsError ? 'editorial-input-error' : ''
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-muted inline-flex items-center gap-1">
                        <span>tDUST</span>
                        <InfoTooltip term="tDUST" />
                      </span>
                    </div>
                    <FieldError message={totalFundsError} />
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
                      <p className="text-xs text-muted">
                        Define confidential shares. Amounts are blinded into client-side commitments <InfoTooltip term="commitment" />.
                      </p>
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
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-semibold text-text inline-flex items-center gap-1">
                      <span>
                        Allocated {Number(allocatedTotal).toLocaleString()} of {Number(totalFunds).toLocaleString()} tDUST
                      </span>
                      <InfoTooltip term="tDUST" />
                    </span>
                    <span
                      className={`remaining-counter-badge ${
                        remainingFunds < 0n
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : remainingFunds === 0n
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-sky-400/10 text-sky-400 border border-sky-400/30'
                      }`}
                    >
                      Remaining: {remainingFunds < 0n ? `-${Number(-remainingFunds).toLocaleString()}` : Number(remainingFunds).toLocaleString()} tDUST
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

                  {allocationsSumError && <FieldError message={allocationsSumError} className="pt-1" />}
                </div>

                {/* Recipients Table / Rows */}
                <div className="space-y-3">
                  {recipients.map((rec, index) => (
                    <div
                      key={rec.id}
                      className="p-4 bg-surface border border-border rounded space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
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
                            className={`editorial-input text-xs ${recipientErrors[rec.id]?.role ? 'editorial-input-error' : ''}`}
                          />
                          <FieldError message={recipientErrors[rec.id]?.role} />
                        </div>

                        {/* Amount / Pct / Weight depending on ruleType */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                            {ruleType === 'fixed' ? (
                              <span className="inline-flex items-center gap-1">
                                <span>Amount (tDUST)</span>
                                <InfoTooltip term="tDUST" />
                              </span>
                            ) : ruleType === 'percentage' ? (
                              'Share (%)'
                            ) : (
                              'Weight'
                            )}
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
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
                            className={`editorial-input editorial-input-mono text-xs font-bold text-sky-400 ${
                              recipientErrors[rec.id]?.amount ? 'editorial-input-error' : ''
                            }`}
                          />
                          <FieldError message={recipientErrors[rec.id]?.amount} />
                        </div>

                        {/* Secret Seed */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-muted uppercase block mb-1">
                            <span className="inline-flex items-center gap-1">
                              <span>Secret Seed / Salt</span>
                              <InfoTooltip term="salt" />
                            </span>
                          </label>
                          <input
                            type="text"
                            value={rec.seed}
                            onChange={(e) => handleUpdateRecipient(rec.id, 'seed', e.target.value)}
                            className={`editorial-input editorial-input-mono text-[11px] text-muted truncate ${
                              recipientErrors[rec.id]?.seed ? 'editorial-input-error' : ''
                            }`}
                            title="Private witness seed used for ZK entitlement proof"
                          />
                          <FieldError message={recipientErrors[rec.id]?.seed} />
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

              {/* Proving Status */}
              {(isProving || isSubmitting) && (
                <div className="p-4 rounded bg-sky-500/10 border border-sky-500/30 flex items-center gap-3 text-xs sm:text-sm">
                  <Loader2 size={18} className="animate-spin text-sky-400 shrink-0" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text">Midnight On-Chain Execution</span>
                      <span className="font-mono text-sky-400 text-xs font-semibold">
                        ({elapsedSeconds || provingElapsedSeconds}s)
                      </span>
                    </div>
                    <p className="text-muted text-xs">{provingStep || 'Processing on Midnight network...'}</p>
                  </div>
                </div>
              )}

              {/* Feedback States */}
              {submitError && (
                <div className="p-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{submitError}</span>
                  </div>
                  {(submitError.toLowerCase().includes('organizer') ||
                    submitError.toLowerCase().includes('unauthorized')) && (
                    <div className="pt-1.5 space-y-2">
                      <p className="text-[11px] text-rose-300">
                        The cached organizer administrative key in your browser did not match the smart contract verification key. Resetting will restore the default verified organizer key for this deployment.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          resetOrganizerSecret();
                          setSubmitError(null);
                        }}
                        className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 font-bold cursor-pointer"
                      >
                        <RefreshCw size={13} />
                        <span>Reset Organizer Credentials to Contract Default &amp; Dismiss</span>
                      </button>
                    </div>
                  )}
                  {(submitError.toLowerCase().includes('not detected') ||
                    submitError.toLowerCase().includes('wallet') ||
                    submitError.toLowerCase().includes('lace') ||
                    submitError.toLowerCase().includes('rejected')) && (
                    <div className="pt-2 space-y-2">
                      <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 p-2 rounded flex items-center gap-1.5">
                        <Info size={12} className="text-sky-400 shrink-0" />
                        <span>Switch Lace to the Preprod network</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href="https://www.lace.io"
                          target="_blank"
                          rel="noreferrer"
                          className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 font-bold no-underline"
                        >
                          <span>Install Midnight Lace</span>
                          <ExternalLink size={13} />
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await wallet.connectWallet(false);
                              toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                            } catch (err) {
                              toast.error(err, { title: 'Wallet Connection Failed' });
                            }
                          }}
                          className="btn-pill btn-pill-outline text-xs py-1.5 px-3 cursor-pointer"
                        >
                          Try again
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await wallet.connectWallet('demo');
                              toast.info('Switched to Demo Simulator mode.', { title: 'Demo Mode' });
                            } catch (err) {
                              toast.error(err, { title: 'Simulation Error' });
                            }
                          }}
                          className="text-xs text-muted hover:text-text underline cursor-pointer ml-1"
                        >
                          or switch to Demo Simulator
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {submitSuccess && (
                <div className="p-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm space-y-4">
                  <div className="flex items-center gap-2 font-bold text-base">
                    <Check size={20} />
                    <span>Allocations Registered on Midnight Preprod Smart Contract!</span>
                  </div>
                  <p className="text-xs text-emerald-300">
                    Opaque commitments <InfoTooltip term="commitment" /> have been published to the Midnight ledger on smart contract <code className="text-white font-mono">0x{targetContractAddress.slice(0, 10)}...{targetContractAddress.slice(-6)}</code>. Recipients can now privately claim their allocations with ZK proofs.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Contract Address Block */}
                    <div className="p-3 bg-surface border border-border rounded flex flex-col justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted text-[11px] block font-sans">Smart Contract:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`0x${targetContractAddress.replace(/^0x/, '')}`);
                              toast.info('Contract address copied to clipboard!');
                            }}
                            className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px]"
                            title="Copy contract address"
                          >
                            <Copy size={12} />
                            <span>Copy</span>
                          </button>
                        </div>
                        <span className="font-mono text-text break-all">
                          0x{targetContractAddress.replace(/^0x/, '')}
                        </span>
                      </div>
                      <a
                        href={getExplorerContractUrl(targetContractAddress, wallet.network || 'preprod')}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-pill btn-pill-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 no-underline font-semibold text-sky-400"
                      >
                        <span>Contract on Explorer</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {/* Transaction Hash Block */}
                    {createdResult?.txHash && (
                      <div className="p-3 bg-surface border border-border rounded flex flex-col justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted text-[11px] block font-sans">Transaction Hash:</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`0x${createdResult.txHash!.replace(/^0x/, '')}`);
                                toast.info('Transaction hash copied to clipboard!');
                              }}
                              className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer transition-colors inline-flex items-center gap-1 text-[11px]"
                              title="Copy transaction hash"
                            >
                              <Copy size={12} />
                              <span>Copy</span>
                            </button>
                          </div>
                          <span className="font-mono text-text break-all">
                            0x{createdResult.txHash.replace(/^0x/, '')}
                          </span>
                        </div>
                        <a
                          href={getExplorerTxUrl(createdResult.txHash, wallet.network || 'preprod')}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-pill btn-pill-sky text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 no-underline font-bold"
                        >
                          <span>View on explorer</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowClaimDetailsModal(true)}
                      className="btn-pill btn-pill-outline text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer text-sky-400 border-sky-500/40 hover:bg-sky-500/10 font-semibold"
                    >
                      <FileText size={14} />
                      <span>Review Claim Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadClaimFile}
                      className="btn-pill btn-pill-sky text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-bold shadow-sm"
                    >
                      <Download size={14} />
                      <span>Download claim file (JSON)</span>
                    </button>
                    <Link to="/vault" className="btn-pill btn-pill-outline text-xs py-2 px-3.5 inline-flex items-center gap-1.5 text-text border-border hover:bg-surface">
                      <span>Vault Dashboard</span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link to="/claim" className="btn-pill btn-pill-outline text-xs py-2 px-3.5 inline-flex items-center gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                      <span>Go to Claim Page</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              {!submitSuccess && (
                <div className="pt-2 space-y-2">
                  <ProofActionButton
                    type="submit"
                    isProcessing={isSubmitting || isProving}
                    elapsedSeconds={elapsedSeconds || provingElapsedSeconds}
                    disabled={!isFormValid || isSubmitting || isProving}
                    className="btn-pill btn-pill-sky py-3.5 px-8 text-sm font-bold w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ShieldCheck size={16} />
                    <span>Deploy & Register to Contract (1AM Wallet)</span>
                  </ProofActionButton>
                  {!isFormValid && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1 font-medium">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>
                        {allocationsSumError ||
                          (hasRecipientErrors && 'Please fix recipient errors: amounts must be positive, and no empty or duplicate recipients.') ||
                          totalFundsError ||
                          titleError ||
                          'Complete all required fields with positive amounts and unique recipients to submit.'}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted">
                    Prompts 1AM wallet to execute <code className="text-sky-400 font-mono">registerAllocation</code> on contract <code className="text-muted font-mono">0x{targetContractAddress.slice(0, 10)}...{targetContractAddress.slice(-6)}</code>.
                  </p>
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

                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink/70 flex items-center gap-1">
                    <span>Total Locked Pool</span>
                    <InfoTooltip term="vault" />
                  </div>
                  <div className="font-display text-2xl font-extrabold text-ink">
                    {Number(totalFunds).toLocaleString()}{' '}
                    <span className="text-xs font-mono font-normal inline-flex items-center gap-0.5">
                      <span>tDUST</span>
                      <InfoTooltip term="tDUST" />
                    </span>
                  </div>

                  <div className="pt-2 border-t border-ink/10 flex items-center justify-between text-xs">
                    <span className="text-ink/80 font-bold uppercase text-[10px] tracking-wider">Live Balance</span>
                    <span className={`font-mono font-bold text-xs ${remainingFunds < 0n ? 'text-rose-600' : 'text-emerald-700'}`}>
                      Remaining: {remainingFunds < 0n ? `-${Number(-remainingFunds).toLocaleString()}` : Number(remainingFunds).toLocaleString()} tDUST
                    </span>
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

                {/* Target Contract in Preview */}
                <div className="py-2.5 px-3 bg-surface border border-border rounded text-[11px] font-mono flex items-center justify-between">
                  <span className="text-muted">Contract:</span>
                  <a
                    href={getExplorerContractUrl(targetContractAddress, wallet.network || 'preprod')}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>0x{targetContractAddress.slice(0, 6)}...{targetContractAddress.slice(-4)}</span>
                    <ExternalLink size={10} />
                  </a>
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
                      <span>One claim per recipient enforced via nullifiers <InfoTooltip term="nullifier" /></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>Total vault <InfoTooltip term="vault" /> funds publicly verifiable by all observers</span>
                    </li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </form>
      </div>

      {/* 4. CLAIM DETAILS MODAL */}
      {showClaimDetailsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-details-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (!savedSecurelyChecked) {
                toast.info("Please check \"I've saved these securely\" before closing.", {
                  title: 'Confirmation Required',
                });
              } else {
                setShowClaimDetailsModal(false);
              }
            }
          }}
        >
          <div
            className="bg-bg-elev border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="text-[10px] uppercase font-mono font-bold text-sky-400 tracking-wider mb-1">
                  Private Distribution Credentials
                </div>
                <h2 id="claim-details-modal-title" className="font-display text-xl sm:text-2xl font-extrabold text-text">
                  Confidential Claim Details
                </h2>
              </div>
              <div className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <Check size={13} />
                <span>Registered On-Chain</span>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-lg bg-amber-500/10 border-2 border-amber-500/40 text-amber-300 space-y-2">
              <div className="flex items-center gap-2.5 font-bold text-base text-amber-200">
                <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                <span>These claim details can't be recovered if lost</span>
              </div>
              <p className="text-xs text-amber-300/90 leading-relaxed pl-7">
                VaultSplitX allocations use zero-knowledge cryptography on Midnight. Individual recipient secrets, private seeds, and cryptographic blinding salts exist only on your client and are <strong>never stored on the blockchain</strong>. If these details are lost, recipients will not be able to claim their funds.
              </p>
            </div>

            {/* Download Claim File (JSON) Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface border border-border rounded-lg">
              <div className="space-y-0.5">
                <span className="font-bold text-text text-xs block">Export All Recipient Claims (JSON)</span>
                <span className="text-[11px] text-muted block">
                  Download a single master file containing credentials for all recipients. Recipients can upload this file on the Claim page.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadClaimFile}
                className="btn-pill btn-pill-sky text-xs py-2 px-4 font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm hover:brightness-110 transition-all"
              >
                <Download size={14} />
                <span>Download claim file (JSON)</span>
              </button>
            </div>

            {/* Recipient Credentials List with Copy button per recipient */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Recipients & Private Credentials ({effectiveAllocations.length})</span>
                <span className="text-[11px] font-mono text-muted/80">Copy individual claim details per recipient</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {effectiveAllocations.map((alloc, idx) => (
                  <div
                    key={alloc.id || idx}
                    className="p-3.5 rounded-lg bg-surface border border-border hover:border-sky-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-text text-sm truncate">{alloc.role}</span>
                        <span className="font-mono text-xs font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                          {Number(alloc.amount).toLocaleString()} tDUST
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-muted space-y-0.5">
                        <div className="truncate">
                          <span className="text-muted/70">Secret Witness: </span>
                          <span className="text-text">{alloc.recipientSecret.slice(0, 16)}...{alloc.recipientSecret.slice(-8)}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-muted/70">Blinding Salt: </span>
                          <span>0x{alloc.salt.slice(0, 12)}...</span>
                        </div>
                        {alloc.commitment && (
                          <div className="truncate">
                            <span className="text-muted/70">Commitment: </span>
                            <span className="text-emerald-400">0x{alloc.commitment.slice(0, 12)}...</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyRecipientClaim(alloc)}
                        className={`btn-pill text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                          copiedRecipientId === alloc.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'btn-pill-outline text-muted hover:text-text'
                        }`}
                        title={`Copy claim credentials for ${alloc.role}`}
                      >
                        {copiedRecipientId === alloc.id ? (
                          <>
                            <Check size={12} className="text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkbox "I've saved these securely" & Modal Footer */}
            <div className="pt-4 border-t border-border space-y-4">
              <label className="flex items-start sm:items-center gap-3 p-3.5 rounded-lg border border-border bg-surface cursor-pointer select-none hover:bg-surface-hover transition-colors">
                <input
                  type="checkbox"
                  id="saved-securely-checkbox"
                  checked={savedSecurelyChecked}
                  onChange={(e) => setSavedSecurelyChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 sm:mt-0 rounded border-border text-sky-500 focus:ring-sky-400 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5">
                  <span className="text-xs sm:text-sm font-bold text-text block">
                    I've saved these securely
                  </span>
                  <span className="text-[11px] text-muted block">
                    I have saved or downloaded these claim details and understand they cannot be recovered if lost.
                  </span>
                </div>
              </label>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-muted">
                  {!savedSecurelyChecked ? (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>Check the confirmation checkbox above to enable closing.</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check size={12} className="shrink-0" />
                      <span>Claim details securely acknowledged. You may now close this modal.</span>
                    </span>
                  )}
                </p>

                <button
                  type="button"
                  disabled={!savedSecurelyChecked}
                  onClick={() => {
                    if (!savedSecurelyChecked) return;
                    setShowClaimDetailsModal(false);
                  }}
                  className={`btn-pill py-2.5 px-6 text-xs font-bold transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${
                    savedSecurelyChecked
                      ? 'btn-pill-sky cursor-pointer shadow-sm'
                      : 'opacity-50 cursor-not-allowed bg-surface border border-border text-muted'
                  }`}
                >
                  <span>Close Modal</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
