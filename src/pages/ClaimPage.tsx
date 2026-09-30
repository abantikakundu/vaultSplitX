import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
  Info,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { formatHumanReadableError } from '../utils/formatError';
import { NETWORK_CONFIG, getExplorerTxUrl, getExplorerContractUrl } from '../utils/config';
import { ContributorAllocation, generateRandomHex32, hexToBytes, bytesToHex } from '../utils/contract';
import { pureCircuits } from '../contract/index.js';
import { InfoTooltip } from '../components/common/InfoTooltip';
import { ProofActionButton, useProofAction } from '../components/common/ProofActionButton';

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

export interface UnifiedClaimTemplate extends ClaimTemplate {
  commitment: string;
  isOnChain: boolean;
  isClaimed: boolean;
  txHash?: string;
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

/**
 * Computes the 32-byte allocation commitment hash using Midnight Compact pureCircuits
 */
function computeCommitmentHex(
  seedStr: string,
  amountStr: string,
  saltStr: string,
  distIdStr: string,
): string | null {
  try {
    if (!seedStr || !amountStr || !saltStr || !distIdStr) return null;
    const amt = BigInt(amountStr);
    if (amt <= 0n) return null;
    const recSecret =
      seedStr.length === 64
        ? hexToBytes(seedStr)
        : hexToBytes(bytesToHex(new TextEncoder().encode(seedStr)).padEnd(64, '0').slice(0, 64));
    const recKey = pureCircuits.deriveRecipientKey(recSecret);
    const saltBytes = hexToBytes(saltStr);
    const distIdBytes = hexToBytes(distIdStr);
    const commBytes = pureCircuits.deriveAllocationCommitment(recKey, amt, saltBytes, distIdBytes);
    return bytesToHex(commBytes);
  } catch {
    return null;
  }
}

export const ClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const wallet = useWallet();
  const toast = useToast();
  const {
    vaultState,
    claimPayout,
    registerAllocation,
    isProving,
    provingStep,
    provingElapsedSeconds,
    claimResult,
    claimError,
    clearClaimState,
  } = useVault();

  const targetContractAddress =
    vaultState?.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';

  // Action state managers
  const claimAction = useProofAction();
  const registerAction = useProofAction();
  const [activeRegisterBtn, setActiveRegisterBtn] = useState<'banner' | 'main'>('main');

  // Form Fields
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

  // On-Chain Registration Notice
  const isRegisteringAllocation = registerAction.isProcessing;
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);

  // Initialize distId
  useEffect(() => {
    if (vaultState?.distributionId) {
      setDistId(vaultState.distributionId);
    }
  }, [vaultState?.distributionId]);

  const effectiveDistId =
    distId ||
    vaultState?.distributionId ||
    'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';

  // -------------------------------------------------------------------------
  // Dynamic Real Templates: Harmonize on-chain allocations + presets
  // -------------------------------------------------------------------------
  const unifiedTemplates = useMemo<UnifiedClaimTemplate[]>(() => {
    const list: UnifiedClaimTemplate[] = [];
    const seenCommitments = new Set<string>();

    // 1. Allocations registered in vaultState (from on-chain creation or localStorage)
    if (vaultState?.allocations) {
      for (const a of vaultState.allocations) {
        const comm =
          a.commitment ||
          computeCommitmentHex(a.recipientSecret, a.amount.toString(), a.salt, effectiveDistId) ||
          '';
        if (comm) seenCommitments.add(comm.toLowerCase());
        const isOnChain = Boolean(
          vaultState.commitments &&
            vaultState.commitments.some((c) => c.toLowerCase() === comm.toLowerCase()),
        );
        list.push({
          id: a.id,
          title: a.role,
          category: a.txHash ? 'On-Chain Batch' : 'Vault Allocation',
          role: a.role,
          amount: a.amount.toString(),
          description: `Confidential entitlement for ${a.role}. Private witness held client-side.`,
          seed: a.recipientSecret,
          salt: a.salt,
          badge: isOnChain ? 'Verified On-Chain' : 'Batch Allocation',
          commitment: comm,
          isOnChain,
          isClaimed: Boolean(a.claimed),
          txHash: a.txHash,
        });
      }
    }

    // 2. Also include preset templates with computed commitments
    for (const f of FEATURED_CLAIM_TEMPLATES) {
      const comm = computeCommitmentHex(f.seed, f.amount, f.salt, effectiveDistId) || '';
      if (!seenCommitments.has(comm.toLowerCase())) {
        seenCommitments.add(comm.toLowerCase());
        const isOnChain = Boolean(
          vaultState?.commitments &&
            vaultState.commitments.some((c) => c.toLowerCase() === comm.toLowerCase()),
        );
        list.push({
          id: f.id,
          title: f.title,
          category: f.category,
          role: f.role,
          amount: f.amount,
          description: f.description,
          seed: f.seed,
          salt: f.salt,
          badge: f.badge,
          commitment: comm,
          isOnChain,
          isClaimed: false,
        });
      }
    }

    // Sort: Verified on-chain (and unclaimed) first!
    return list.sort((a, b) => {
      if (a.isClaimed !== b.isClaimed) return a.isClaimed ? 1 : -1;
      if (a.isOnChain !== b.isOnChain) return a.isOnChain ? -1 : 1;
      return 0;
    });
  }, [vaultState?.allocations, vaultState?.commitments, effectiveDistId]);

  // Current commitment derived from active form fields
  const currentCommitmentHex = useMemo(() => {
    return computeCommitmentHex(recipientSecret, amount, salt, effectiveDistId);
  }, [recipientSecret, amount, salt, effectiveDistId]);

  // Check if current form commitment exists in on-chain contract state
  const isCurrentOnChain = useMemo(() => {
    if (!currentCommitmentHex || !vaultState?.commitments) return false;
    return vaultState.commitments.some(
      (c) => c.toLowerCase() === currentCommitmentHex.toLowerCase(),
    );
  }, [currentCommitmentHex, vaultState?.commitments]);

  const handleApplyTemplate = (tpl: ClaimTemplate | UnifiedClaimTemplate) => {
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

  // Auto-select on initial load: URL query parameter or first verified unclaimed template
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && unifiedTemplates.length > 0) {
      const match = unifiedTemplates.find(
        (t) => t.role.toLowerCase() === roleParam.toLowerCase(),
      );
      if (match) {
        handleApplyTemplate(match);
        return;
      }
    }

    if (!recipientSecret && unifiedTemplates.length > 0) {
      const firstAvailable =
        unifiedTemplates.find((t) => t.isOnChain && !t.isClaimed) || unifiedTemplates[0];
      if (firstAvailable) {
        handleApplyTemplate(firstAvailable);
      }
    }
  }, [searchParams, unifiedTemplates]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
    toast.info(`${label} copied to clipboard!`);
  };

  // -------------------------------------------------------------------------
  // 1-Click Register Allocation on Midnight Preprod (1AM Wallet)
  // -------------------------------------------------------------------------
  const handleRegisterCurrentAllocation = async (source: 'banner' | 'main' = 'main') => {
    if (registerAction.isProcessing || claimAction.isProcessing || isProving) return;
    if (!recipientSecret || !amount || BigInt(amount) <= 0n || !salt) {
      toast.error('Please provide valid recipient secret, amount, and salt to register.', {
        title: 'Missing Parameters',
      });
      return;
    }

    setActiveRegisterBtn(source);
    clearClaimState();

    await registerAction.executeAction(async () => {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        const connected = await wallet.connectWallet(false);
        activeApi = connected?.connectedApi ?? null;
      }

      const activeRole =
        unifiedTemplates.find((t) => t.id === selectedAllocId)?.role ||
        'Confidential Contributor';

      const res = await registerAllocation(
        activeRole,
        BigInt(amount),
        recipientSecret,
        activeApi,
        salt,
      );

      setRegistrationNotice(
        `Allocation registered on Midnight Preprod! Commitment: 0x${res.commitment.slice(0, 10)}... (Tx: 0x${res.txHash ? res.txHash.slice(0, 10) : ''}...). Ready to claim!`,
      );
      setTimeout(() => setRegistrationNotice(null), 8000);
      toast.success('Allocation registered on Midnight Preprod!', {
        title: 'Allocation Registered',
        txHash: res.txHash,
      });
    }).catch((err: unknown) => {
      toast.error(err, { title: 'Registration Failed' });
    });
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
      toast.success(`Voucher parsed and loaded: ${Number(amt).toLocaleString()} tDUST`, {
        title: 'Voucher Loaded',
      });
    } catch (err: unknown) {
      toast.error(err, { title: 'Invalid Voucher' });
      setVoucherError(formatHumanReadableError(err, 'Voucher parsing'));
    }
  };

  const handleLoadSampleVoucherIntoModal = () => {
    // Pick the first available on-chain template if available, else first preset
    const pick = unifiedTemplates.find((t) => t.isOnChain && !t.isClaimed) || unifiedTemplates[0];
    const sample = {
      network: wallet.network || 'preprod',
      contractAddress: targetContractAddress,
      distributionId: distId || vaultState?.distributionId || 'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a',
      role: pick?.role || 'Lead ZK Protocol Architect',
      amount: pick?.amount || '40000',
      recipientSecret: pick?.seed || '0101010101010101010101010101010101010101010101010101010101010101',
      salt: pick?.salt || '1111111111111111111111111111111111111111111111111111111111111111',
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
      role: unifiedTemplates.find((t) => t.id === selectedAllocId)?.role || 'Confidential Contributor',
      amount: amount || '0',
      recipientSecret,
      salt,
      commitment: currentCommitmentHex ? `0x${currentCommitmentHex}` : undefined,
      instructions: 'Use this voucher on the VaultSplitX Claim page to synthesize a zero-knowledge claim proof.',
    };

    navigator.clipboard.writeText(JSON.stringify(voucherData, null, 2));
    setExportedVoucherNotice(true);
    setTimeout(() => setExportedVoucherNotice(false), 2500);
    toast.info('Claim voucher JSON copied to clipboard!', { title: 'Voucher Exported' });
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claimAction.isProcessing || registerAction.isProcessing || isProving) return;
    if (!amount || BigInt(amount) <= 0n) {
      toast.error('Claim amount must be greater than zero.', { title: 'Invalid Amount' });
      return;
    }

    // Safety verification before invoking 1AM wallet: ensure commitment exists in on-chain set
    if (
      currentCommitmentHex &&
      vaultState?.commitments &&
      !vaultState.commitments.some((c) => c.toLowerCase() === currentCommitmentHex.toLowerCase())
    ) {
      clearClaimState();
      toast.error(
        `The commitment 0x${currentCommitmentHex.slice(0, 10)}... is not registered in Midnight smart contract 0x${targetContractAddress.slice(0, 8)}... on Preprod. Please register first.`,
        { title: 'Commitment Not Registered' }
      );
      return;
    }

    await claimAction.executeAction(async () => {
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
          const cMsg = (connErr as Error)?.message || '1AM Wallet connection failed or was rejected.';
          throw new Error(cMsg);
        }
      }
      const res = await claimPayout(recipientSecret, BigInt(amount), salt, distId, claimSpendSecret, activeApi);
      toast.success('Zero-Knowledge proof verified! Payout claimed on Midnight Preprod.', {
        title: 'Payout Claimed',
        txHash: res.txHash,
      });
    }).catch((err: unknown) => {
      toast.error(err, { title: 'Claim Failed' });
    });
  };

  // Tamper / Cheat Attempt simulation for reviewer
  const handleSimulateCheat = () => {
    clearClaimState();
    const tampered = (BigInt(amount || '1000') + 10_000n).toString();
    setAmount(tampered);
    toast.info('Simulated tampered credentials loaded (+10,000 tDUST) to verify ZK circuit rejection.', {
      title: 'Tamper Simulation',
    });
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

        {/* Registration Success Banner */}
        {registrationNotice && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span className="font-semibold">{registrationNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setRegistrationNotice(null)}
              className="text-emerald-400 hover:text-white cursor-pointer p-0.5"
              aria-label="Dismiss notice"
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
                  Claim Templates & On-Chain Allocations
                </h3>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Select an allocation verified on Midnight Preprod, or paste a private JSON voucher.
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

          {/* Unified Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {unifiedTemplates.slice(0, 6).map((tpl) => {
              const isSelected =
                selectedAllocId === tpl.id ||
                (recipientSecret === tpl.seed && amount === tpl.amount);

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
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-hover border border-border text-muted">
                        {tpl.badge}
                      </span>
                      {tpl.isClaimed ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                          Claimed
                        </span>
                      ) : tpl.isOnChain ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Check size={10} />
                          Verified On-Chain
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle size={10} />
                          Not On-Chain
                        </span>
                      )}
                    </div>

                    <h4 className="font-display text-sm font-bold text-text truncate">
                      {tpl.title}
                    </h4>

                    <div className="font-mono text-lg font-extrabold text-sky-400 flex items-center gap-1">
                      <span>{Number(tpl.amount).toLocaleString()}</span>
                      <span className="text-xs font-sans font-normal text-muted inline-flex items-center gap-0.5">
                        <span>tDUST</span>
                        <InfoTooltip term="tDUST" />
                      </span>
                    </div>

                    <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span
                      className="font-mono text-muted text-[10px] truncate max-w-[140px] inline-flex items-center gap-0.5"
                      title={tpl.commitment ? `Commitment: 0x${tpl.commitment}` : undefined}
                    >
                      {tpl.commitment ? (
                        <>
                          <span>comm: 0x{tpl.commitment.slice(0, 6)}...</span>
                          <InfoTooltip term="commitment" />
                        </>
                      ) : (
                        `seed: ${tpl.seed.slice(0, 6)}...`
                      )}
                    </span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        isSelected ? 'text-emerald-400' : 'text-muted'
                      }`}
                    >
                      {isSelected ? 'Selected ✓' : tpl.isOnChain ? 'Load & Prove →' : 'Load Template →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Quick Access Chips if there are more templates */}
          {unifiedTemplates.length > 6 && (
            <div className="pt-2 border-t border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                Additional Vault Batch Allocations:
              </span>
              <div className="flex flex-wrap gap-2">
                {unifiedTemplates.slice(6).map((tpl) => {
                  const isSelected = selectedAllocId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : 'bg-surface-hover hover:bg-surface border-border text-text'
                      }`}
                    >
                      {isSelected && <Check size={11} className="text-emerald-400" />}
                      <span>{tpl.role}</span>
                      <span className="font-mono text-sky-400">
                        ({Number(tpl.amount).toLocaleString()} tDUST)
                      </span>
                      {tpl.isOnChain && (
                        <span className="text-[9px] text-emerald-400 font-bold uppercase">
                          [On-Chain]
                        </span>
                      )}
                      {tpl.isClaimed && (
                        <span className="text-[9px] text-rose-400 font-bold uppercase">
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

        {/* Real-time Commitment Verification Banner */}
        {currentCommitmentHex &&
          (isCurrentOnChain ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
              <div className="flex items-start sm:items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-text inline-flex items-center gap-1">
                      <span>On-Chain Commitment Verified</span>
                      <InfoTooltip term="commitment" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active in Contract Set
                    </span>
                  </div>
                  <p className="text-muted text-[11px] mt-0.5">
                    Leaf commitment{' '}
                    <code className="text-emerald-300 font-mono">
                      0x{currentCommitmentHex.slice(0, 16)}...{currentCommitmentHex.slice(-8)}
                    </code>{' '}
                    exists in smart contract{' '}
                    <code className="text-muted font-mono">
                      0x{targetContractAddress.slice(0, 8)}...
                    </code>
                    . Zero-knowledge proof assertion is guaranteed to pass.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] text-emerald-400 font-bold hidden md:inline">
                  Ready for 1AM Wallet
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-text">Allocation Not Yet Registered On-Chain</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Registration Needed
                    </span>
                  </div>
                  <p className="text-muted text-[11px] mt-0.5">
                    Commitment{' '}
                    <code className="text-amber-300 font-mono">
                      0x{currentCommitmentHex.slice(0, 14)}...
                    </code>{' '}
                    is not recorded on Midnight contract{' '}
                    <code className="text-muted font-mono">
                      0x{targetContractAddress.slice(0, 8)}...
                    </code>
                    . Register it first using 1AM wallet before claiming so the smart contract assertion passes!
                  </p>
                </div>
              </div>
              {activeRegisterBtn === 'banner' && registerAction.isProcessing ? (
                <ProofActionButton
                  type="button"
                  isProcessing={true}
                  elapsedSeconds={registerAction.elapsedSeconds}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4 shrink-0 font-bold border-amber-500/40 text-amber-300"
                >
                  <ShieldCheck size={14} className="text-amber-400" />
                  <span>Register to Contract (1AM Wallet)</span>
                </ProofActionButton>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRegisterCurrentAllocation('banner')}
                  disabled={registerAction.isProcessing || claimAction.isProcessing || isProving}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4 shrink-0 font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/15 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {registerAction.isProcessing ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-amber-400" />
                      <span>Registering ({registerAction.elapsedSeconds}s)...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} className="text-amber-400" />
                      <span>Register to Contract (1AM Wallet)</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}

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
              <label className="editorial-label inline-flex items-center gap-1">
                <span>Allocated Payout Amount (tDUST)</span>
                <InfoTooltip term="tDUST" />
              </label>
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
              <label className="editorial-label inline-flex items-center gap-1">
                <span>Cryptographic Blinding Salt (32-byte Hex)</span>
                <InfoTooltip term="salt" />
              </label>
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
            <label className="editorial-label inline-flex items-center gap-1">
              <span>Distribution Batch ID</span>
              <InfoTooltip term="distribution ID" />
            </label>
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
              <span className="inline-flex items-center gap-1">
                <span>Nullifier Spending Key (Auto-Generated Entropy)</span>
                <InfoTooltip term="nullifier" />
              </span>
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
              <strong>Zero Witness Leakage Guarantee:</strong> Your secret passphrase, salt <InfoTooltip term="salt" />, and amount never leave your local browser runtime.
              Midnight's circuit generates a mathematical zero-knowledge proof proving entitlement against the on-chain commitment <InfoTooltip term="commitment" /> set.
            </p>
          </div>

          {/* Proving Step Progress Panel */}
          {(isProving || claimAction.isProcessing || registerAction.isProcessing) && (
            <div className="p-5 rounded bg-sky-500/10 border border-sky-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-sky-400" />
                  <span className="text-sm font-bold text-text">{provingStep || 'Executing Zero-Knowledge Prover...'}</span>
                </div>
                <span className="font-mono text-sky-400 text-xs font-semibold">
                  ({claimAction.elapsedSeconds || registerAction.elapsedSeconds || provingElapsedSeconds}s)
                </span>
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
                claimError.toLowerCase().includes('lace') ||
                claimError.toLowerCase().includes('wallet') ||
                claimError.toLowerCase().includes('not detected') ||
                claimError.toLowerCase().includes('rejected')) && (
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
                  <span className="text-muted font-sans text-[11px] inline-flex items-center gap-1">
                    <span>Unlinkable Nullifier:</span>
                    <InfoTooltip term="nullifier" />
                  </span>
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
                  <span className="text-muted font-sans text-[11px] inline-flex items-center gap-1">
                    <span>Committed Leaf:</span>
                    <InfoTooltip term="commitment" />
                  </span>
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
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted text-[11px] block font-sans">Transaction Hash (claimPayout):</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`0x${claimResult.txHash!.replace(/^0x/, '')}`);
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
                        0x{claimResult.txHash.replace(/^0x/, '')}
                      </span>
                    </div>
                    <a
                      href={getExplorerTxUrl(claimResult.txHash, wallet.network || 'preprod')}
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

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                <p className="text-xs text-emerald-300 italic">
                  Nullifier <InfoTooltip term="nullifier" /> published to prevent double spending. Recipient identity and amount ({amount} tDUST <InfoTooltip term="tDUST" />) remain strictly secret.
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
              {isCurrentOnChain ? (
                <ProofActionButton
                  type="submit"
                  isProcessing={claimAction.isProcessing || (isProving && !registerAction.isProcessing)}
                  elapsedSeconds={claimAction.elapsedSeconds || provingElapsedSeconds}
                  disabled={registerAction.isProcessing}
                  className="btn-pill btn-pill-sky flex-1 py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  <span>Prove Entitlement & Settle Claim (1AM Wallet)</span>
                </ProofActionButton>
              ) : activeRegisterBtn === 'banner' && registerAction.isProcessing ? (
                <button
                  type="button"
                  disabled={true}
                  className="btn-pill flex-1 py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-not-allowed bg-amber-500 text-ink border border-amber-600"
                >
                  <Loader2 size={16} className="animate-spin text-ink" />
                  <span>Registering Allocation ({registerAction.elapsedSeconds}s)...</span>
                </button>
              ) : (
                <ProofActionButton
                  type="button"
                  onClick={() => handleRegisterCurrentAllocation('main')}
                  isProcessing={registerAction.isProcessing}
                  elapsedSeconds={registerAction.elapsedSeconds}
                  disabled={claimAction.isProcessing || isProving}
                  className="btn-pill flex-1 py-3.5 px-6 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer bg-amber-500 hover:bg-amber-400 text-ink border border-amber-600 transition-colors shadow-sm"
                >
                  <ShieldCheck size={16} />
                  <span>Register Allocation on Contract First (1AM Wallet)</span>
                </ProofActionButton>
              )}

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
              {isCurrentOnChain ? (
                <>
                  Prompts 1AM wallet to execute <code className="text-emerald-400 font-mono">claimPayout</code> on contract <code className="text-muted font-mono">0x{targetContractAddress.slice(0, 10)}...{targetContractAddress.slice(-6)}</code> on Midnight Preprod.
                </>
              ) : (
                <>
                  Prompts 1AM wallet to execute <code className="text-amber-400 font-mono">registerAllocation</code> on contract <code className="text-muted font-mono">0x{targetContractAddress.slice(0, 10)}...{targetContractAddress.slice(-6)}</code> so your entitlement exists on-chain before claiming.
                </>
              )}
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
                Preset & Batch Scenarios ({unifiedTemplates.length})
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
                  Select a contributor credential set to populate your private witness, amount, and blinding salt into the claim circuit:
                </p>
                <div className="space-y-2.5">
                  {unifiedTemplates.map((tpl) => {
                    return (
                      <div
                        key={tpl.id}
                        className="p-4 rounded-lg bg-surface border border-border hover:border-emerald-400/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-text text-sm">{tpl.title}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-surface-hover border border-border text-muted">
                              {tpl.badge}
                            </span>
                            {tpl.isClaimed ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                Claimed
                              </span>
                            ) : tpl.isOnChain ? (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                ✓ Verified On-Chain
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                Not On-Chain
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted leading-relaxed">{tpl.description}</p>
                          <div className="font-mono text-[11px] text-muted flex items-center gap-2 pt-0.5">
                            <span>Witness: {tpl.seed.slice(0, 10)}...</span>
                            <span>•</span>
                            <span className="text-sky-400 font-bold">
                              {Number(tpl.amount).toLocaleString()} tDUST
                            </span>
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
