import React, { useState } from 'react';
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
import { getExplorerContractUrl, getExplorerTxUrl } from '../utils/config';

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
    lastTxHash,
    lastTxExplorerUrl,
  } = useVault();
  const wallet = useWallet();

  // New allocation modal/form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newSeed, setNewSeed] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Close distribution confirmation
  const [isClosing, setIsClosing] = useState(false);
  const [copiedCommitment, setCopiedCommitment] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommitment(text);
    setTimeout(() => setCopiedCommitment(null), 2000);
  };

  const handleAddNewAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || BigInt(newAmount) <= 0n) {
      setAddError('Amount must be greater than zero.');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        const connected = await wallet.connectWallet(false);
        activeApi = connected?.connectedApi ?? null;
      }
      await registerAllocation(newRole || 'Contributor', BigInt(newAmount), newSeed, activeApi);
      setNewRole('');
      setNewAmount('');
      setNewSeed('');
      setShowAddModal(false);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to register allocation.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to permanently close this distribution batch? No further claims will be accepted.')) {
      return;
    }
    setIsClosing(true);
    try {
      let activeApi = wallet.connectedApi;
      if (!activeApi || wallet.isSimulated) {
        const connected = await wallet.connectWallet(false);
        activeApi = connected?.connectedApi ?? null;
      }
      await closeDistribution(activeApi);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to close distribution.');
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoadingVault) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center space-y-4">
        <Loader2 size={32} className="animate-spin text-sky-400 mx-auto" />
        <p className="text-sm text-muted font-mono">Loading Midnight vault state...</p>
      </div>
    );
  }

  const totalFunds = vaultState?.totalVaultFunds ?? 0n;
  const allocationsCount = vaultState?.allocations.length ?? 0;
  const claimsCount = vaultState?.claimedCount ?? 0;
  const isClosed = vaultState?.isClosed ?? false;
  const claimedPercent = allocationsCount > 0 ? Math.round((claimsCount / allocationsCount) * 100) : 0;

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
              onClick={() => refreshVaultState()}
              disabled={isSyncing}
              className="btn-pill btn-pill-outline text-xs py-2 px-3 flex items-center gap-1.5"
              title="Refresh live state from Midnight indexer"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-400' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Indexer'}</span>
            </button>

            {!isClosed && (
              <>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-pill btn-pill-sky text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Register Allocation</span>
                </button>

                <button
                  onClick={handleClose}
                  disabled={isClosing || isProving}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4 flex items-center gap-1.5 text-rose-400 hover:border-rose-400"
                >
                  <Lock size={14} />
                  <span>{isClosing ? 'Closing...' : 'Close Distribution'}</span>
                </button>
              </>
            )}

            <Link
              to="/claim"
              className="btn-pill btn-pill-dark text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Test Claim Portal</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Proving & Live Transaction Banners */}
      <div className="max-w-7xl mx-auto px-6 space-y-4">
        {isProving && (
          <div className="p-4 rounded bg-sky-500/10 border border-sky-500/30 flex items-center gap-3 text-xs sm:text-sm">
            <Loader2 size={18} className="animate-spin text-sky-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold text-text">Midnight On-Chain Transaction in Progress</span>
              <p className="text-muted text-xs">{provingStep}</p>
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
              <span className="font-mono text-xs text-text break-all">
                0x{lastTxHash.replace(/^0x/, '')}
              </span>
            </div>
            {lastTxExplorerUrl && (
              <a
                href={lastTxExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 inline-flex items-center gap-1.5 shrink-0 no-underline font-bold"
              >
                <span>Verify on 1AM Explorer</span>
                <ExternalLink size={13} />
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
            <span className="text-xs uppercase font-bold text-muted tracking-wider block">
              Total Vault Pool
            </span>
            <div className="font-display text-3xl font-extrabold text-sky-400 font-mono">
              {Number(totalFunds).toLocaleString()}{' '}
              <span className="text-xs font-sans text-muted">tDUST</span>
            </div>
            <p className="text-[11px] text-muted">Publicly locked on Midnight</p>
          </div>

          {/* Stat 2 */}
          <div className="sharp-card p-6 space-y-2">
            <span className="text-xs uppercase font-bold text-muted tracking-wider block">
              Registered Shares
            </span>
            <div className="font-display text-3xl font-extrabold text-text font-mono">
              0{allocationsCount}
            </div>
            <p className="text-[11px] text-muted">Opaque commitment leaves</p>
          </div>

          {/* Stat 3 */}
          <div className="sharp-card p-6 space-y-2">
            <span className="text-xs uppercase font-bold text-muted tracking-wider block">
              Claims Settled
            </span>
            <div className="font-display text-3xl font-extrabold text-emerald-400 font-mono">
              0{claimsCount}
            </div>
            <p className="text-[11px] text-muted">Un-linkable nullifiers spent</p>
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
              onClick={() => wallet.connectWallet(false)}
              className="btn-pill btn-pill-sky text-xs py-2 px-4 shrink-0"
            >
              Connect Wallet
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
                  <div className="w-9 h-9 rounded bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
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
                    <div className="font-mono font-extrabold text-base text-sky-400">
                      {Number(alloc.amount).toLocaleString()} tDUST
                    </div>
                    <div className="text-[10px] text-muted uppercase">Confidential Share</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {alloc.txHash && (
                      <a
                        href={getExplorerTxUrl(alloc.txHash, wallet.network || 'preprod')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-sky-400 hover:underline px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20"
                        title="View registration transaction in 1AM explorer"
                      >
                        <span>tx: {alloc.txHash.slice(0, 8)}...</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {alloc.claimed ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check size={13} />
                        <span>Claimed</span>
                      </span>
                    ) : (
                      <Link
                        to={`/claim?role=${encodeURIComponent(alloc.role)}`}
                        className="btn-pill btn-pill-sky text-xs py-1.5 px-3.5 flex items-center gap-1"
                      >
                        <span>Claim Share</span>
                        <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Commitment Hash Row */}
              <div className="pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-muted gap-2">
                <span className="text-[11px] font-sans">On-Chain Commitment Leaf:</span>
                <div className="flex items-center gap-2">
                  <span className="text-text break-all text-[11px]">{alloc.commitment}</span>
                  <button
                    onClick={() => handleCopy(alloc.commitment)}
                    className="p-1 rounded hover:bg-surface-hover text-muted hover:text-text cursor-pointer"
                    title="Copy commitment hash"
                  >
                    {copiedCommitment === alloc.commitment ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
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
        >
          <div className="bg-surface border border-border rounded max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-xl font-bold text-text">
                Register New Allocation
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-text text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddNewAllocation} className="space-y-4">
              <div>
                <label className="editorial-label">Contributor Role or Description</label>
                <input
                  type="text"
                  required
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Protocol Research Lead"
                  className="editorial-input"
                />
              </div>

              <div>
                <label className="editorial-label">Payment Amount (tDUST)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 20000"
                  className="editorial-input editorial-input-mono font-bold text-sky-400"
                />
              </div>

              <div>
                <label className="editorial-label">Secret Passphrase / Seed</label>
                <input
                  type="text"
                  value={newSeed}
                  onChange={(e) => setNewSeed(e.target.value)}
                  placeholder="e.g. contributor_secret_seed"
                  className="editorial-input editorial-input-mono text-xs"
                />
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
                      }}
                      className="btn-pill btn-pill-sky text-xs py-1 px-3 font-semibold cursor-pointer"
                    >
                      Reset Organizer Credentials to Contract Default
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-pill btn-pill-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="btn-pill btn-pill-sky text-xs py-2 px-5 font-bold flex items-center gap-1.5"
                >
                  {isAdding ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Registering Commitment...</span>
                    </>
                  ) : (
                    <span>Register Commitment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
