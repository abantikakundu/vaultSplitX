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
import { NETWORK_CONFIG, getExplorerTxUrl, getExplorerContractUrl } from '../utils/config';
import { useWallet } from '../context/WalletContext';
import { ContributorAllocation, generateRandomHex32 } from '../utils/contract';

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

        {/* Quick-Test Presets from Vault */}
        <div className="p-5 bg-surface border border-border rounded-lg space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted block">
              Preloaded Contributor Test Credentials (Click to Auto-Fill):
            </span>
            <span className="text-[11px] text-muted">
              Select an allocation to test confidential entitlement proof
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {vaultState?.allocations.map((alloc) => {
              const isSelected = selectedAllocId === alloc.id;
              return (
                <button
                  key={alloc.id}
                  type="button"
                  onClick={() => handleQuickFill(alloc)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-sm'
                      : 'bg-surface-hover hover:bg-surface border-border hover:border-emerald-400/60 text-text'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-emerald-400" />}
                  <span>{alloc.role}</span>
                  <span className="font-mono text-sky-400">
                    ({Number(alloc.amount).toLocaleString()} tDUST)
                  </span>
                  {alloc.claimed && (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-500/20 px-1.5 py-0.5 rounded">
                      Claimed
                    </span>
                  )}
                </button>
              );
            })}
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
    </div>
  );
};
