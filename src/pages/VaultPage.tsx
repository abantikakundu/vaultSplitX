import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Vault,
  ShieldCheck,
  Coins,
  CheckCircle2,
  Lock,
  Plus,
  ArrowRight,
  Wallet,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { formatHumanReadableError } from '../utils/formatError';
import { getExplorerContractUrl, getExplorerTxUrl } from '../utils/config';
import { InfoTooltip } from '../components/common/InfoTooltip';
import { ProofActionButton, useProofAction } from '../components/common/ProofActionButton';
import { FieldError } from '../components/common/FieldError';

export const VaultPage: React.FC = () => {
  const {
    vaultState,
    isLoadingVault,
    isSyncing,
    refreshVaultState,
    registerAllocation,
    closeDistribution,
    resetOrganizerSecret,
    isProving,
    provingStep,
    provingElapsedSeconds,
    lastTxHash,
    lastTxExplorerUrl,
  } = useVault();
  const wallet = useWallet();
  const toast = useToast();

  // Action state managers
  const addAllocAction = useProofAction();
  const closeAction = useProofAction();

  // New allocation modal/form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newSeed, setNewSeed] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Vault totals & allocations calculations
  const totalFunds = vaultState?.totalVaultFunds ?? 0n;
  const allocationsCount = vaultState?.allocations.length ?? 0;
  const claimsCount = vaultState?.claimedCount ?? 0;
  const isClosed = vaultState?.isClosed ?? false;
  const claimedPercent = allocationsCount > 0 ? Math.round((claimsCount / allocationsCount) * 100) : 0;

  const currentAllocated = useMemo(() => {
    return (
      vaultState?.allocations.reduce((acc, a) => {
        try {
          return acc + BigInt(a.amount || 0);
        } catch {
          return acc;
        }
      }, 0n) ?? 0n
    );
  }, [vaultState?.allocations]);

  const remainingVaultFunds = totalFunds > currentAllocated ? totalFunds - currentAllocated : 0n;

  // Modal live calculations and inline validation
  const parsedModalAmount = useMemo(() => {
    try {
      const val = BigInt(newAmount || '0');
      return val > 0n ? val : 0n;
    } catch {
      return 0n;
    }
  }, [newAmount]);

  const remainingAfterModal = totalFunds - (currentAllocated + parsedModalAmount);

  const modalRoleError = useMemo(() => {
    if (!showAddModal) return null;
    const cleanRole = newRole.trim();
    if (!cleanRole) return 'Recipient role/name cannot be empty.';
    const isDuplicate = vaultState?.allocations.some(
      (a) => a.role.trim().toLowerCase() === cleanRole.toLowerCase()
    );
    if (isDuplicate) {
      return `Duplicate recipient: an allocation for "${cleanRole}" already exists in this vault.`;
    }
    return null;
  }, [newRole, showAddModal, vaultState?.allocations]);

  const modalAmountError = useMemo(() => {
    if (!showAddModal) return null;
    if (!newAmount.trim()) return 'Payment amount is required.';
    try {
      const amt = BigInt(newAmount);
      if (amt <= 0n) return 'Amount must be a positive number greater than 0 tDUST.';
      if (currentAllocated + amt > totalFunds) {
        return `Sum of allocations exceeds total vault funds (${Number(totalFunds).toLocaleString()} tDUST). Only ${Number(remainingVaultFunds).toLocaleString()} tDUST remaining.`;
      }
    } catch {
      return 'Amount must be a valid positive integer.';
    }
    return null;
  }, [newAmount, showAddModal, currentAllocated, totalFunds, remainingVaultFunds]);

  const isModalValid = useMemo(() => {
    return (
      !modalRoleError &&
      !modalAmountError &&
      newRole.trim().length > 0 &&
      parsedModalAmount > 0n &&
      currentAllocated + parsedModalAmount <= totalFunds
    );
  }, [modalRoleError, modalAmountError, newRole, parsedModalAmount, currentAllocated, totalFunds]);

  // Close distribution confirmation
  const [copiedCommitment, setCopiedCommitment] = useState<string | null>(null);

  const handleCopy = (text: string, label = 'Commitment') => {
    navigator.clipboard.writeText(text);
    setCopiedCommitment(text);
    setTimeout(() => setCopiedCommitment(null), 2000);
    toast.info(`${label} copied to clipboard!`);
  };

  const handleSync = async () => {
    try {
      await refreshVaultState();
      toast.info('Vault state synced with Midnight indexer.', { title: 'Indexer Synced' });
    } catch (err) {
      toast.error(err, { title: 'Sync Failed' });
    }
  };

  const handleAddNewAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addAllocAction.isProcessing || isProving) return;
    if (!isModalValid) {
      const msg = modalRoleError || modalAmountError || 'Please fix all inline errors before registering.';
      setAddError(msg);
      toast.error(msg, { title: 'Invalid Form' });
      return;
    }

    setAddError(null);

    await addAllocAction.executeAction(async () => {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        const connected = await wallet.connectWallet(false);
        activeApi = connected?.connectedApi ?? null;
      }
      const res = await registerAllocation(newRole || 'Contributor', BigInt(newAmount), newSeed, activeApi);
      setNewRole('');
      setNewAmount('');
      setNewSeed('');
      setShowAddModal(false);
      toast.success('Allocation successfully registered on-chain!', {
        title: 'Allocation Registered',
        txHash: res?.txHash,
      });
    }).catch((err: unknown) => {
      toast.error(err, { title: 'Registration Failed' });
      setAddError(formatHumanReadableError(err, 'Allocation registration'));
    });
  };

  const handleClose = async () => {
    if (closeAction.isProcessing || isProving) return;
    if (!window.confirm('Are you sure you want to permanently close this distribution batch? No further claims will be accepted.')) {
      return;
    }

    await closeAction.executeAction(async () => {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        const connected = await wallet.connectWallet(false);
        activeApi = connected?.connectedApi ?? null;
      }
      const res = await closeDistribution(activeApi);
      toast.success('Distribution batch permanently closed on Midnight Preprod.', {
        title: 'Distribution Closed',
        txHash: res?.txHash,
      });
    }).catch((err: unknown) => {
      toast.error(err, { title: 'Close Failed' });
    });
  };

  if (isLoadingVault) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-4">
        <Loader2 size={32} className="animate-spin text-sky-400 mx-auto" />
        <p className="text-sm text-muted font-mono">Loading Midnight vault state...</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-24 space-y-12">
      {/* 1. HEADER BLOCK */}
      <section className="bg-bg-elev border-b border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-extrabold tracking-widest text-sky-400">
                Organizer Dashboard
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  isClosed
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isClosed ? 'Closed' : 'Open & Active'}
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              {vaultState?.title || 'Distribution Vault'}
            </h1>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
              <div className="flex items-center gap-1.5">
                <span>Batch ID:</span>
                <span className="text-text">{vaultState?.distributionId.slice(0, 16)}...{vaultState?.distributionId.slice(-8)}</span>
                <InfoTooltip term="distribution ID" />
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span>Contract:</span>
                <a
                  href={getExplorerContractUrl(vaultState?.contractAddress || '', wallet.network || 'preprod')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>{vaultState?.contractAddress.slice(0, 8)}...{vaultState?.contractAddress.slice(-6)}</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>

          {/* Organizer Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn-pill btn-pill-outline min-h-[44px] text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
              title="Refresh live state from Midnight indexer"
              aria-label="Sync indexer state"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-400' : ''} aria-hidden="true" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Indexer'}</span>
            </button>

            {!isClosed && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-pill btn-pill-sky min-h-[44px] text-xs py-2 px-4 flex items-center justify-center gap-1.5 cursor-pointer"
                  aria-label="Register new allocation"
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>Register Allocation</span>
                </button>

                <ProofActionButton
                  type="button"
                  onClick={handleClose}
                  isProcessing={closeAction.isProcessing}
                  elapsedSeconds={closeAction.elapsedSeconds}
                  disabled={isProving || addAllocAction.isProcessing}
                  className="btn-pill btn-pill-outline min-h-[44px] text-xs py-2 px-4 flex items-center justify-center gap-1.5 text-rose-400 hover:border-rose-400 cursor-pointer"
                  aria-label="Close distribution batch"
                >
                  <Lock size={14} aria-hidden="true" />
                  <span>Close Distribution</span>
                </ProofActionButton>
              </>
            )}

            <Link
              to="/claim"
              className="btn-pill btn-pill-dark min-h-[44px] text-xs py-2 px-4 flex items-center justify-center gap-1.5"
              aria-label="Go to test claim portal"
            >
              <span>Test Claim Portal</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Proving & Live Transaction Banners */}
      <div className="max-w-7xl mx-auto px-6 space-y-4">
        {(isProving || addAllocAction.isProcessing || closeAction.isProcessing) && (
          <div className="p-4 rounded bg-sky-500/10 border border-sky-500/30 flex items-center gap-3 text-xs sm:text-sm">
            <Loader2 size={18} className="animate-spin text-sky-400 shrink-0" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text">Midnight On-Chain Transaction in Progress</span>
                <span className="font-mono text-sky-400 text-xs font-semibold">
                  ({addAllocAction.elapsedSeconds || closeAction.elapsedSeconds || provingElapsedSeconds}s)
                </span>
              </div>
              <p className="text-muted text-xs">{provingStep || 'Processing on Midnight network...'}</p>
            </div>
          </div>
        )}

        {lastTxHash && (
          <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                <Check size={16} />
                <span>Midnight Preprod Transaction Broadcast</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-text break-all">
                  0x{lastTxHash.replace(/^0x/, '')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`0x${lastTxHash.replace(/^0x/, '')}`);
                    toast.info('Transaction hash copied to clipboard!');
                  }}
                  className="p-1 px-2.5 rounded hover:bg-surface text-muted hover:text-text cursor-pointer transition-colors inline-flex items-center gap-1.5 text-xs min-h-[44px]"
                  title="Copy transaction hash"
                  aria-label="Copy broadcast transaction hash"
                >
                  <Copy size={13} aria-hidden="true" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
            {lastTxExplorerUrl && (
              <a
                href={lastTxExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-pill-sky text-xs py-2 px-3.5 inline-flex items-center gap-1.5 shrink-0 no-underline font-bold min-h-[44px]"
                aria-label="View transaction on Midnight explorer"
              >
                <span>View on explorer</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. STATS & PROGRESS */}
      <section className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stat 1 */}
          <div className="sharp-card p-6 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs uppercase font-bold text-muted tracking-wider flex items-center gap-1">
                <span>Total Vault Pool</span>
                <InfoTooltip term="vault" />
              </span>
              <span className="remaining-counter-badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Remaining: {Number(remainingVaultFunds).toLocaleString()} tDUST
              </span>
            </div>
            <div className="font-display text-3xl font-extrabold text-sky-400 font-mono flex items-center gap-1">
              <span>{Number(totalFunds).toLocaleString()}</span>
              <span className="text-xs font-sans text-muted inline-flex items-center gap-0.5">
                <span>tDUST</span>
                <InfoTooltip term="tDUST" />
              </span>
            </div>
            <p className="text-[11px] text-muted flex items-center justify-between">
              <span>Publicly locked on Midnight</span>
              <span className="font-mono text-muted text-[10px]">
                Allocated: {Number(currentAllocated).toLocaleString()} tDUST
              </span>
            </p>
          </div>

          {/* Stat 2 */}
          <div className="sharp-card p-6 space-y-2">
            <span className="text-xs uppercase font-bold text-muted tracking-wider flex items-center gap-1">
              <span>Registered Shares</span>
              <InfoTooltip term="commitment" />
            </span>
            <div className="font-display text-3xl font-extrabold text-text font-mono">
              0{allocationsCount}
            </div>
            <p className="text-[11px] text-muted flex items-center gap-1">
              <span>Opaque commitment leaves</span>
              <InfoTooltip term="commitment" />
            </p>
          </div>

          {/* Stat 3 */}
          <div className="sharp-card p-6 space-y-2">
            <span className="text-xs uppercase font-bold text-muted tracking-wider flex items-center gap-1">
              <span>Claims Settled</span>
              <InfoTooltip term="nullifier" />
            </span>
            <div className="font-display text-3xl font-extrabold text-emerald-400 font-mono">
              0{claimsCount}
            </div>
            <p className="text-[11px] text-muted flex items-center gap-1">
              <span>Un-linkable nullifiers spent</span>
              <InfoTooltip term="nullifier" />
            </p>
          </div>

          {/* Stat 4 */}
          <div className="sharp-card p-6 space-y-2">
            <span className="text-xs uppercase font-bold text-muted tracking-wider block">
              Settlement Rate
            </span>
            <div className="font-display text-3xl font-extrabold text-sky-400 font-mono">
              {claimedPercent}%
            </div>
            <p className="text-[11px] text-muted">Claim progress</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="sharp-card p-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text">
              Distribution Settlement Progress ({claimsCount} of {allocationsCount} claimed)
            </span>
            <span className="font-mono text-muted">{claimedPercent}% Completed</span>
          </div>

          <div className="w-full h-2.5 bg-surface-hover border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${claimedPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 3. ALLOCATIONS LIST & LEDGER */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-text">Registered Contributor Shares</h2>
            <p className="text-xs text-muted mt-1">
              Organizer view with preloaded test credentials. Individual amounts are shielded inside client circuits.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-surface border border-border text-muted">
            {vaultState?.allocations.length} records
          </span>
        </div>

        {/* Wallet check banner if not connected */}
        {!wallet.isConnected && (
          <div className="p-6 bg-surface border border-border rounded flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wallet size={24} className="text-sky-400 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-text">Connect Wallet for Live Admin Control</h3>
                <p className="text-xs text-muted">
                  Connect your Midnight Lace wallet to interact directly with the smart contract on Preprod.
                </p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await wallet.connectWallet(false);
                  toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                } catch (err) {
                  toast.error(err, { title: 'Wallet Connection Failed' });
                }
              }}
              className="btn-pill btn-pill-sky text-xs py-2 px-4 shrink-0 cursor-pointer min-h-[44px]"
            >
              Connect Midnight Lace
            </button>
          </div>
        )}

        {/* Allocation Cards */}
        <div className="space-y-3">
          {vaultState?.allocations.map((alloc) => (
            <div
              key={alloc.id}
              className="sharp-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400" aria-hidden="true">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-text">{alloc.role}</div>
                    <div className="text-xs font-mono text-muted">
                      Recipient Key: {alloc.recipientKey.slice(0, 10)}...{alloc.recipientKey.slice(-6)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-base text-sky-400 flex items-center justify-end gap-1">
                      <span>{Number(alloc.amount).toLocaleString()} tDUST</span>
                      <InfoTooltip term="tDUST" />
                    </div>
                    <div className="text-[10px] text-muted uppercase">Confidential Share</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {alloc.txHash && (
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={getExplorerTxUrl(alloc.txHash, wallet.network || 'preprod')}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:underline px-2.5 py-1 rounded bg-sky-500/10 border border-sky-500/20 min-h-[44px]"
                          title="View on explorer"
                          aria-label={`View transaction for ${alloc.role} on Midnight explorer`}
                        >
                          <span>tx: {alloc.txHash.slice(0, 8)}...</span>
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`0x${alloc.txHash!.replace(/^0x/, '')}`);
                            toast.info('Transaction hash copied to clipboard!');
                          }}
                          className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          title="Copy transaction hash"
                          aria-label={`Copy transaction hash for ${alloc.role}`}
                        >
                          <Copy size={13} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    {alloc.claimed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 min-h-[44px]">
                        <Check size={13} aria-hidden="true" />
                        <span>Claimed</span>
                      </span>
                    ) : (
                      <Link
                        to={`/claim?role=${encodeURIComponent(alloc.role)}`}
                        className="btn-pill btn-pill-sky text-xs py-2 px-3.5 flex items-center gap-1 min-h-[44px]"
                        aria-label={`Claim share for ${alloc.role}`}
                      >
                        <span>Claim Share</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Commitment Hash Row */}
              <div className="pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-muted gap-2">
                <span className="text-[11px] font-sans inline-flex items-center gap-1">
                  <span>On-Chain Commitment Leaf:</span>
                  <InfoTooltip term="commitment" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-text break-all text-[11px]">{alloc.commitment}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(alloc.commitment)}
                    className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    title="Copy commitment hash"
                    aria-label={`Copy commitment hash for ${alloc.role}`}
                  >
                    {copiedCommitment === alloc.commitment ? (
                      <Check size={14} className="text-emerald-400" aria-hidden="true" />
                    ) : (
                      <Copy size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. MODAL: ADD ALLOCATION */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-alloc-title"
        >
          <div className="bg-surface border border-border rounded max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 id="modal-add-alloc-title" className="font-display text-xl font-bold text-text">
                Register New Allocation
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-text text-sm cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Close register allocation modal"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddNewAllocation} className="space-y-4">
              <div>
                <label htmlFor="modal-alloc-role" className="editorial-label">Contributor Role or Description</label>
                <input
                  id="modal-alloc-role"
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Protocol Research Lead"
                  className={`editorial-input ${modalRoleError ? 'editorial-input-error' : ''}`}
                />
                <FieldError message={modalRoleError} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <label htmlFor="modal-alloc-amount" className="editorial-label inline-flex items-center gap-1 mb-0">
                    <span>Payment Amount (tDUST)</span>
                    <InfoTooltip term="tDUST" />
                  </label>
                  <span
                    className={`remaining-counter-badge ${
                      remainingAfterModal < 0n
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    Remaining: {remainingAfterModal < 0n ? `-${Number(-remainingAfterModal).toLocaleString()}` : Number(remainingAfterModal).toLocaleString()} tDUST
                  </span>
                </div>
                <input
                  id="modal-alloc-amount"
                  type="number"
                  min="1"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  className={`editorial-input editorial-input-mono font-bold text-sky-400 ${
                    modalAmountError ? 'editorial-input-error' : ''
                  }`}
                />
                <FieldError message={modalAmountError} />
              </div>

              <div>
                <label htmlFor="modal-alloc-seed" className="editorial-label inline-flex items-center gap-1">
                  <span>Secret Passphrase / Salt Seed</span>
                  <InfoTooltip term="salt" />
                </label>
                <input
                  id="modal-alloc-seed"
                  type="text"
                  value={newSeed}
                  onChange={(e) => setNewSeed(e.target.value)}
                  placeholder="e.g. contributor_secret_seed"
                  className="editorial-input editorial-input-mono text-xs"
                />
              </div>

              {/* Live Remaining Balance Summary */}
              <div className="p-3 rounded bg-surface-hover border border-border flex items-center justify-between text-xs">
                <span className="font-semibold text-muted">Vault Remaining Balance:</span>
                <span
                  className={`font-mono font-bold ${
                    remainingAfterModal < 0n ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  Remaining: {remainingAfterModal < 0n ? `-${Number(-remainingAfterModal).toLocaleString()}` : Number(remainingAfterModal).toLocaleString()} tDUST
                </span>
              </div>

              {addError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded space-y-2">
                  <div>{addError}</div>
                  {(addError.toLowerCase().includes('organizer') ||
                    addError.toLowerCase().includes('unauthorized')) && (
                    <button
                      type="button"
                      onClick={() => {
                        resetOrganizerSecret();
                        setAddError(null);
                        toast.info('Organizer credentials reset to contract defaults.', {
                          title: 'Credentials Reset',
                        });
                      }}
                      className="btn-pill btn-pill-sky text-xs py-2 px-3 font-semibold cursor-pointer min-h-[44px]"
                      aria-label="Reset organizer credentials to contract default"
                    >
                      Reset Organizer Credentials to Contract Default
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4 cursor-pointer min-h-[44px]"
                  aria-label="Cancel registration"
                >
                  Cancel
                </button>
                <ProofActionButton
                  type="submit"
                  isProcessing={addAllocAction.isProcessing || isProving}
                  elapsedSeconds={addAllocAction.elapsedSeconds || provingElapsedSeconds}
                  disabled={!isModalValid || addAllocAction.isProcessing || isProving}
                  className="btn-pill btn-pill-sky text-xs py-2 px-5 font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                >
                  <span className="inline-flex items-center gap-1">
                    <span>Register Commitment</span>
                    <InfoTooltip term="commitment" />
                  </span>
                </ProofActionButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
