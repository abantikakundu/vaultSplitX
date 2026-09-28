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
  FileText,
  Sparkles,
  Upload,
  Download,
  X,
  Code2,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { NETWORK_CONFIG, getExplorerTxUrl, getExplorerContractUrl } from '../utils/config';
import { useWallet } from '../context/WalletContext';
import { ContributorAllocation, generateRandomHex32 } from '../utils/contract';

export interface ClaimTemplate {
  id: string;
  title: string;
  category: string;
  role: string;
  amount: string;
  description: string;
  seed: string;
  salt: string;
  badge: string;
}

export const FEATURED_CLAIM_TEMPLATES: ClaimTemplate[] = [
  {
    id: 'alloc-1',
    title: 'Lead ZK Protocol Architect',
    category: 'Core Engineering Milestone',
    role: 'Lead ZK Protocol Architect',
    amount: '40000',
    description: 'Quarterly milestone disbursement for Compact circuit design and proving key generation.',
    seed: '0101010101010101010101010101010101010101010101010101010101010101',
    salt: '1111111111111111111111111111111111111111111111111111111111111111',
    badge: 'Core Grant',
  },
  {
    id: 'alloc-2',
    title: 'Senior Smart Contract Engineer',
    category: 'Smart Contract Delivery',
    role: 'Senior Smart Contract Engineer',
    amount: '35000',
    description: 'Compensation for Midnight Preprod deployment, state machine hardening, and 1AM wallet connector.',
    seed: '0202020202020202020202020202020202020202020202020202020202020202',
    salt: '2222222222222222222222222222222222222222222222222222222222222222',
    badge: 'Development',
  },
  {
    id: 'alloc-3',
    title: 'Security Auditor & Reviewer',
    category: 'Security Review Bounty',
    role: 'Security Auditor & Reviewer',
    amount: '25000',
    description: 'Security vulnerability bounty for confidential leaf commitment and double-claim nullifier audit.',
    seed: '0303030303030303030303030303030303030303030303030303030303030303',
    salt: '3333333333333333333333333333333333333333333333333333333333333333',
    badge: 'Security Bounty',
  },
];

export const ClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const wallet = useWallet();
  const { vaultState, claimPayout, isProving, provingStep, claimResult, claimError, clearClaimState } = useVault();

  const targetContractAddress =
    vaultState?.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';

  // Form Fields (Preserving existing field semantics)
  const [recipientSecret, setRecipientSecret] = useState('');
  const [amount, setAmount] = useState('');
  const [salt, setSalt] = useState('');
  const [distId, setDistId] = useState('');
  const [claimSpendSecret, setClaimSpendSecret] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedAllocId, setSelectedAllocId] = useState<string | null>(null);

  // Template Modal and Prompt State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTab, setTemplateTab] = useState<'featured' | 'custom'>('featured');
  const [pastedVoucherText, setPastedVoucherText] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [templateLoadedNotice, setTemplateLoadedNotice] = useState<string | null>(null);
  const [exportedVoucherNotice, setExportedVoucherNotice] = useState(false);

  // Initialize distId
  useEffect(() => {
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
  }, [vaultState?.distributionId]);

  const handleQuickFill = (alloc: ContributorAllocation) => {
    clearClaimState();
    setSelectedAllocId(alloc.id);
    setRecipientSecret(alloc.recipientSecret);
    setAmount(alloc.amount.toString());
    setSalt(alloc.salt);
    setClaimSpendSecret(generateRandomHex32());
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
  };

  // Handle URL query parameter prefill or auto-select first available allocation
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && vaultState?.allocations) {
      const match = vaultState.allocations.find(
        (a) => a.role.toLowerCase() === roleParam.toLowerCase()
      );
      if (match) {
        handleQuickFill(match);
        return;
      }
    }

    // Default pre-select first available allocation if fields are not populated
    if (!recipientSecret && vaultState?.allocations?.length) {
      const firstAvailable = vaultState.allocations.find((a) => !a.claimed) || vaultState.allocations[0];
      if (firstAvailable) {
        handleQuickFill(firstAvailable);
      }
    }
  }, [searchParams, vaultState?.allocations]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyTemplate = (tpl: ClaimTemplate) => {
    clearClaimState();
    setSelectedAllocId(tpl.id);
    setRecipientSecret(tpl.seed);
    setAmount(tpl.amount);
    setSalt(tpl.salt);
    setClaimSpendSecret(generateRandomHex32());
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
    setTemplateLoadedNotice(`Template loaded: ${tpl.title} (${Number(tpl.amount).toLocaleString()} tDUST)`);
    setShowTemplateModal(false);
    setTimeout(() => setTemplateLoadedNotice(null), 4000);
  };

  const handleParseVoucher = () => {
    setVoucherError(null);
    try {
      if (!pastedVoucherText.trim()) {
        throw new Error('Please paste a valid JSON voucher or template object.');
      }
      const parsed = JSON.parse(pastedVoucherText.trim());
      const recSec = parsed.recipientSecret || parsed.seed || parsed.secret || '';
      const amt = parsed.amount?.toString() || '';
      const s = parsed.salt || '';
      const d = parsed.distributionId || parsed.distId || vaultState?.distributionId || '';

      if (!recSec || !amt || !s) {
        throw new Error('Missing required voucher fields: recipientSecret, amount, and salt are required.');
      }

      clearClaimState();
      setRecipientSecret(recSec);
      setAmount(amt);
      setSalt(s);
      if (d) setDistId(d);
      setClaimSpendSecret(generateRandomHex32());
      setSelectedAllocId(null);
      setShowTemplateModal(false);
      setPastedVoucherText('');
      setTemplateLoadedNotice(`Voucher parsed and loaded: ${Number(amt).toLocaleString()} tDUST`);
      setTimeout(() => setTemplateLoadedNotice(null), 4000);
    } catch (err: unknown) {
      setVoucherError(err instanceof Error ? err.message : 'Invalid JSON voucher format.');
    }
  };

  const handleLoadSampleVoucherIntoModal = () => {
    const sample = {
      network: wallet.network || 'preprod',
      contractAddress: targetContractAddress,
      distributionId: distId || vaultState?.distributionId || 'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a',
      role: 'Lead ZK Protocol Architect',
      amount: '40000',
      recipientSecret: '0101010101010101010101010101010101010101010101010101010101010101',
      salt: '1111111111111111111111111111111111111111111111111111111111111111',
      instructions: 'Paste this voucher into VaultSplitX to prove entitlement via ZK witness.',
    };
    setPastedVoucherText(JSON.stringify(sample, null, 2));
    setVoucherError(null);
  };

  const handleExportVoucher = () => {
    const voucherData = {
      network: wallet.network || 'preprod',
      contractAddress: targetContractAddress,
      distributionId: distId || vaultState?.distributionId || '',
      role: FEATURED_CLAIM_TEMPLATES.find((t) => t.id === selectedAllocId)?.role || 'Confidential Contributor',
      amount: amount || '0',
      recipientSecret,
      salt,
      instructions: 'Use this voucher on the VaultSplitX Claim page to synthesize a zero-knowledge claim proof.',
    };

    navigator.clipboard.writeText(JSON.stringify(voucherData, null, 2));
    setExportedVoucherNotice(true);
    setTimeout(() => setExportedVoucherNotice(false), 2500);
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || BigInt(amount) <= 0n) {
      return;
    }

    try {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        try {
          const connected = await wallet.connectWallet(false);
          if (!connected?.connectedApi) {
            throw new Error('1AM Wallet connection was not completed. Please approve connection in your 1AM wallet.');
          }
          activeApi = connected.connectedApi;
        } catch (connErr) {
          const cMsg = (connErr as Error)?.message || '1AM Wallet connection failed or was rejected.';
          throw new Error(cMsg);
        }
      }
      await claimPayout(recipientSecret, BigInt(amount), salt, distId, claimSpendSecret, activeApi);
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
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        {/* Target Midnight Smart Contract Banner */}
        <div className="p-4 rounded-lg bg-surface border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-text">Target Midnight Smart Contract:</span>
                <span className="font-mono text-emerald-400 font-semibold break-all">
                  0x{targetContractAddress.replace(/^0x/, '')}
                </span>
              </div>
              <p className="text-muted text-[11px] mt-0.5">
                Submitting this claim prompts your connected 1AM wallet to execute the on-chain smart contract function <code className="text-emerald-300 font-mono">claimPayout</code> on Midnight Preprod.
              </p>
            </div>
          </div>
          <a
            href={getExplorerContractUrl(targetContractAddress, wallet.network || 'preprod')}
            target="_blank"
            rel="noreferrer"
            className="btn-pill btn-pill-outline text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 shrink-0 text-emerald-400 hover:text-emerald-300 font-semibold no-underline"
          >
            <span>View on 1AM Explorer</span>
            <ExternalLink size={12} />
          </a>
        </div>

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

        {/* Template Loaded Notice Banner */}
        {templateLoadedNotice && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-400 shrink-0" />
              <span className="font-semibold">{templateLoadedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setTemplateLoadedNotice(null)}
              className="text-emerald-400 hover:text-white cursor-pointer p-0.5"
              aria-label="Dismiss template loaded notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Claim Templates & Voucher Prompt Section */}
        <div className="sharp-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-400" />
                <h3 className="font-display text-base font-bold text-text">
                  Claim Templates & Vouchers
                </h3>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Select a preconfigured entitlement scenario or prompt a private JSON voucher.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setTemplateTab('custom');
                  setShowTemplateModal(true);
                }}
                className="btn-pill btn-pill-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 cursor-pointer"
                title="Prompt or paste a custom JSON claim voucher"
              >
                <Upload size={13} />
                <span>Prompt / Paste Voucher</span>
              </button>

              <button
                type="button"
                onClick={handleExportVoucher}
                className="btn-pill btn-pill-outline text-xs py-1.5 px-3 flex items-center gap-1.5 text-muted hover:text-text cursor-pointer"
                title="Copy current claim credentials as a sharable JSON voucher"
              >
                <Copy size={13} />
                <span>{exportedVoucherNotice ? '✓ Copied Voucher!' : 'Export Voucher'}</span>
              </button>
            </div>
          </div>

          {/* 3 Featured Template Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {FEATURED_CLAIM_TEMPLATES.map((tpl) => {
              const isSelected = selectedAllocId === tpl.id;
              const matchingAlloc = vaultState?.allocations.find(
                (a) => a.recipientSecret === tpl.seed || a.role.toLowerCase() === tpl.role.toLowerCase()
              );
              const isClaimed = matchingAlloc?.claimed ?? false;

              return (
                <div
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-400/40'
                      : 'border-border bg-surface hover:bg-surface-hover hover:border-emerald-400/50'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-hover border border-border text-muted">
                        {tpl.badge}
                      </span>
                      {isClaimed ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                          Claimed
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check size={10} />
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-sm font-bold text-text truncate">
                      {tpl.title}
                    </h4>

                    <div className="font-mono text-lg font-extrabold text-sky-400">
                      {Number(tpl.amount).toLocaleString()}{' '}
                      <span className="text-xs font-sans font-normal text-muted">tDUST</span>
                    </div>

                    <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-muted text-[10px]">
                      seed: {tpl.seed.slice(0, 8)}...
                    </span>
                    <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-muted group-hover:text-text'}`}>
                      {isSelected ? 'Selected ✓' : 'Load Template →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Access Chips for Other Batch Allocations */}
          {vaultState?.allocations && vaultState.allocations.length > 3 && (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                Additional Vault Batch Allocations:
              </span>
              <div className="flex flex-wrap gap-2">
                {vaultState.allocations
                  .filter((a) => !FEATURED_CLAIM_TEMPLATES.some((t) => t.seed === a.recipientSecret))
                  .map((alloc) => {
                    const isSelected = selectedAllocId === alloc.id;
                    return (
                      <button
                        key={alloc.id}
                        type="button"
                        onClick={() => handleQuickFill(alloc)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                            : 'bg-surface-hover hover:bg-surface border-border text-text'
                        }`}
                      >
                        {isSelected && <Check size={11} className="text-emerald-400" />}
                        <span>{alloc.role}</span>
                        <span className="font-mono text-sky-400">
                          ({Number(alloc.amount).toLocaleString()} tDUST)
                        </span>
                        {alloc.claimed && (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase">
                            [Claimed]
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
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
            <div className="p-5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>Verification Rejection / Error</span>
              </div>
              <p className="leading-relaxed">{claimError}</p>
              {(claimError.toLowerCase().includes('1am') ||
                claimError.toLowerCase().includes('wallet') ||
                claimError.toLowerCase().includes('not detected') ||
                claimError.toLowerCase().includes('rejected')) && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <a
                    href="https://1am.xyz"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 font-bold no-underline"
                  >
                    <span>Install 1AM Wallet</span>
                    <ExternalLink size={13} />
                  </a>
                  <button
                    type="button"
                    onClick={() => wallet.connectWallet(false)}
                    className="btn-pill btn-pill-outline text-xs py-1.5 px-3 cursor-pointer"
                  >
                    Retry Connection
                  </button>
                  <button
                    type="button"
                    onClick={() => wallet.connectWallet('demo')}
                    className="text-xs text-muted hover:text-text underline cursor-pointer ml-1"
                  >
                    or switch to Demo Simulator
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Result */}
          {claimResult && (
            <div className="p-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Contract Address Block */}
                <div className="p-3 bg-surface border border-border rounded flex flex-col justify-between gap-2 text-xs">
                  <div>
                    <span className="text-muted text-[11px] block font-sans">Smart Contract:</span>
                    <span className="font-mono text-text break-all">
                      0x{targetContractAddress.replace(/^0x/, '')}
                    </span>
                  </div>
                  <a
                    href={getExplorerContractUrl(targetContractAddress, wallet.network || 'preprod')}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill btn-pill-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 no-underline font-semibold text-emerald-400"
                  >
                    <span>Contract on Explorer</span>
                    <ExternalLink size={12} />
                  </a>
                </div>

                {/* Transaction Hash Block */}
                {claimResult.txHash && (
                  <div className="p-3 bg-surface border border-border rounded flex flex-col justify-between gap-2 text-xs">
                    <div>
                      <span className="text-muted text-[11px] block font-sans">Transaction Hash (claimPayout):</span>
                      <span className="font-mono text-text break-all">
                        0x{claimResult.txHash.replace(/^0x/, '')}
                      </span>
                    </div>
                    <a
                      href={getExplorerTxUrl(claimResult.txHash, wallet.network || 'preprod')}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill btn-pill-sky text-xs py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0 no-underline font-bold"
                    >
                      <span>Tx on 1AM Explorer</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <p className="text-xs text-emerald-300 italic">
                  Nullifier published to prevent double spending. Recipient identity and amount ({amount} tDUST) remain strictly secret.
                </p>
                <Link
                  to="/vault"
                  className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5"
                >
                  <span>View in Dashboard</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* CTA Row */}
          <div className="space-y-2 pt-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isProving}
                className="btn-pill btn-pill-sky flex-1 py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{provingStep || 'Prompting 1AM Wallet...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Prove Entitlement & Settle Claim (1AM Wallet)</span>
                  </>
                )}
              </button>

              {/* Cheat Simulator Button for Reviewer */}
              <button
                type="button"
                onClick={handleSimulateCheat}
                className="btn-pill btn-pill-outline py-3.5 px-4 text-xs font-semibold text-muted hover:text-text cursor-pointer"
                title="Tamper with allocation amount to test cryptographic ZK circuit rejection"
              >
                Simulate Cheat (+10k tDUST)
              </button>
            </div>
            <p className="text-[11px] text-muted text-center sm:text-left">
              Prompts 1AM wallet to execute <code className="text-emerald-400 font-mono">claimPayout</code> on contract <code className="text-muted font-mono">0x{targetContractAddress.slice(0, 10)}...{targetContractAddress.slice(-6)}</code> on Midnight Preprod.
            </p>
          </div>
        </form>
      </div>

      {/* Template & Voucher Prompt Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-elev border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <Sparkles size={20} className="text-emerald-400" />
                <h3 className="font-display text-lg font-bold text-text">
                  Prompt Claim Template or Voucher
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setVoucherError(null);
                }}
                className="p-1 rounded text-muted hover:text-text cursor-pointer"
                aria-label="Close template modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
              <button
                type="button"
                onClick={() => setTemplateTab('featured')}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                  templateTab === 'featured'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-muted hover:text-text'
                }`}
              >
                Preset Scenarios (3)
              </button>
              <button
                type="button"
                onClick={() => setTemplateTab('custom')}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                  templateTab === 'custom'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-muted hover:text-text'
                }`}
              >
                Paste JSON Voucher
              </button>
            </div>

            {templateTab === 'featured' ? (
              <div className="space-y-3">
                <p className="text-xs text-muted leading-relaxed">
                  Select a preconfigured Midnight contributor credential set to populate your private witness, amount, and blinding salt into the claim circuit:
                </p>
                <div className="space-y-2.5">
                  {FEATURED_CLAIM_TEMPLATES.map((tpl) => {
                    const isClaimed = vaultState?.allocations.find(
                      (a) => a.recipientSecret === tpl.seed || a.role.toLowerCase() === tpl.role.toLowerCase()
                    )?.claimed;

                    return (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-lg bg-surface border border-border hover:border-emerald-400/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-text text-sm">{tpl.title}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {tpl.badge}
                            </span>
                            {isClaimed && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                Claimed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted leading-relaxed">{tpl.description}</p>
                          <div className="font-mono text-[11px] text-muted flex items-center gap-2 pt-0.5">
                            <span>Witness: {tpl.seed.slice(0, 10)}...</span>
                            <span>•</span>
                            <span className="text-sky-400 font-bold">{Number(tpl.amount).toLocaleString()} tDUST</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="btn-pill btn-pill-sky text-xs py-2 px-4 shrink-0 font-bold cursor-pointer"
                        >
                          Prompt & Apply
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text">
                    Paste Voucher JSON or Template Object:
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSampleVoucherIntoModal}
                    className="text-[11px] text-sky-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Code2 size={13} />
                    <span>Insert Sample Voucher</span>
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={pastedVoucherText}
                  onChange={(e) => setPastedVoucherText(e.target.value)}
                  placeholder={`{\n  "recipientSecret": "0101010101010101010101010101010101010101010101010101010101010101",\n  "amount": "40000",\n  "salt": "1111111111111111111111111111111111111111111111111111111111111111",\n  "distributionId": "a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a"\n}`}
                  className="w-full bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text focus:outline-none focus:border-emerald-400 resize-none"
                />

                {voucherError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{voucherError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateModal(false);
                      setVoucherError(null);
                    }}
                    className="btn-pill btn-pill-outline text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseVoucher}
                    className="btn-pill btn-pill-sky text-xs py-2 px-5 font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload size={13} />
                    <span>Parse & Populate Claim Form</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
