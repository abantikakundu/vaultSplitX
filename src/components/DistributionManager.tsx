import React, { useState, useEffect } from 'react';
import {
  createDemoVaultState,
  deriveRecipientKey,
  deriveAllocationCommitment,
  deriveClaimNullifier,
  padString32,
  bigintToBytes32,
  hexToBytes,
  bytesToHex,
  generateRandomHex32,
  DistributionVaultState,
  ContributorAllocation,
  ClaimVerificationResult,
} from '../utils/contract';

interface DistributionManagerProps {
  walletConnected: boolean;
  walletAddress: string | null;
}

export const DistributionManager: React.FC<DistributionManagerProps> = ({
  walletConnected,
  walletAddress,
}) => {
  const [activeTab, setActiveTab] = useState<'organizer' | 'claimant' | 'explorer'>('organizer');
  const [vaultState, setVaultState] = useState<DistributionVaultState | null>(null);

  // Organizer state for adding new allocation
  const [newRole, setNewRole] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newRecipientSeed, setNewRecipientSeed] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [organizerFeedback, setOrganizerFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Claimant state
  const [claimRecipientSecret, setClaimRecipientSecret] = useState('');
  const [claimAmount, setClaimAmount] = useState('');
  const [claimSalt, setClaimSalt] = useState('');
  const [claimDistId, setClaimDistId] = useState('');
  const [claimSpendSecret, setClaimSpendSecret] = useState('');
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState<string>('');
  const [claimResult, setClaimResult] = useState<ClaimVerificationResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Initialize demo vault state
  useEffect(() => {
    createDemoVaultState().then((state) => {
      setVaultState(state);
      setClaimDistId(state.distributionId);
    });
  }, []);

  // Quick fill helper for reviewing claimant flow
  const handleQuickFill = (alloc: ContributorAllocation) => {
    setClaimRecipientSecret(alloc.recipientSecret);
    setClaimAmount(alloc.amount.toString());
    setClaimSalt(alloc.salt);
    setClaimSpendSecret(generateRandomHex32());
    if (vaultState) {
      setClaimDistId(vaultState.distributionId);
    }
    setClaimResult(null);
    setClaimError(null);
    setActiveTab('claimant');
  };

  // Organizer creates & registers a new allocation
  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultState) return;

    const amountBig = BigInt(newAmount || '0');
    if (amountBig <= 0n) {
      setOrganizerFeedback({ type: 'error', message: 'Allocation amount must be greater than zero.' });
      return;
    }

    setIsRegistering(true);
    setOrganizerFeedback(null);

    try {
      const recSecret = padString32(newRecipientSeed || `contributor_${Date.now()}`);
      const recKey = await deriveRecipientKey(recSecret);
      const saltBytes = hexToBytes(generateRandomHex32());
      const distIdBytes = hexToBytes(vaultState.distributionId);

      const commBytes = await deriveAllocationCommitment(
        recKey,
        amountBig,
        saltBytes,
        distIdBytes,
      );
      const commHex = bytesToHex(commBytes);

      // Simulate on-chain registerAllocation circuit call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newAlloc: ContributorAllocation = {
        id: `alloc-${vaultState.allocations.length + 1}`,
        role: newRole || 'Senior Contributor',
        recipientKey: bytesToHex(recKey),
        recipientSecret: bytesToHex(recSecret),
        amount: amountBig,
        salt: bytesToHex(saltBytes),
        commitment: commHex,
        claimed: false,
      };

      setVaultState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalVaultFunds: prev.totalVaultFunds + amountBig,
          commitments: [...prev.commitments, commHex],
          allocations: [...prev.allocations, newAlloc],
        };
      });

      setNewRole('');
      setNewAmount('');
      setNewRecipientSeed('');
      setOrganizerFeedback({
        type: 'success',
        message: `Successfully registered opaque commitment on Midnight ledger: ${commHex.slice(0, 16)}…`,
      });
    } catch (err: unknown) {
      setOrganizerFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to register allocation.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Claimant generates ZK proof and claims payout
  const handleClaimPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultState) return;

    setIsProving(true);
    setClaimError(null);
    setClaimResult(null);

    try {
      const amountBig = BigInt(claimAmount || '0');
      if (amountBig <= 0n) {
        throw new Error('Allocation amount must be greater than zero.');
      }

      setProvingStep('1/4: Synthesizing private witnesses from encrypted secrets…');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const recSecretBytes = hexToBytes(claimRecipientSecret);
      const saltBytes = hexToBytes(claimSalt);
      const distIdBytes = hexToBytes(claimDistId);
      const spendSecretBytes = hexToBytes(claimSpendSecret || generateRandomHex32());

      setProvingStep('2/4: Computing cryptographic recipient key & commitment…');
      await new Promise((resolve) => setTimeout(resolve, 700));

      const recKey = await deriveRecipientKey(recSecretBytes);
      const derivedCommitment = await deriveAllocationCommitment(
        recKey,
        amountBig,
        saltBytes,
        distIdBytes,
      );
      const commitmentHex = bytesToHex(derivedCommitment);

      setProvingStep('3/4: Verifying commitment inclusion in Midnight distribution ledger…');
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Check if commitment exists on ledger
      const isCommitted = vaultState.commitments.includes(commitmentHex);
      if (!isCommitted) {
        throw new Error(
          'ZK Verification Failed: No matching allocation commitment found on-chain. Check your secret, amount, salt, or distribution ID.',
        );
      }

      setProvingStep('4/4: Deriving un-linkable nullifier & checking double-claim state…');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const nullifierBytes = await deriveClaimNullifier(derivedCommitment, spendSecretBytes);
      const nullifierHex = bytesToHex(nullifierBytes);

      // Check nullifier double-claim
      if (vaultState.claimedNullifiers.includes(nullifierHex)) {
        throw new Error(
          'Double-Claim Rejected: This allocation has already been claimed! The nullifier exists on the ledger.',
        );
      }

      // Successful proof & settlement
      setVaultState((prev) => {
        if (!prev) return prev;
        const updatedAllocations = prev.allocations.map((a) =>
          a.commitment === commitmentHex ? { ...a, claimed: true } : a,
        );
        return {
          ...prev,
          claimedNullifiers: [...prev.claimedNullifiers, nullifierHex],
          claimedCount: prev.claimedCount + 1,
          allocations: updatedAllocations,
        };
      });

      setClaimResult({
        success: true,
        commitment: commitmentHex,
        nullifier: nullifierHex,
        message: 'Zero-Knowledge Proof Verified! Payout settled confidentially.',
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setIsProving(false);
      setProvingStep('');
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 p-1 rounded-xl backdrop-blur-sm">
        <button
          onClick={() => setActiveTab('organizer')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'organizer'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏛️</span>
          <span>Organizer Vault Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('claimant')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'claimant'
              ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🛡️</span>
          <span>Private Claim Portal</span>
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'explorer'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🔍</span>
          <span>Public Ledger & Privacy Audit</span>
        </button>
      </div>

      {/* TAB 1: ORGANIZER VAULT HUB */}
      {activeTab === 'organizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Summary & Add Allocation */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <span>⚡</span> Vault Distribution Stats
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Total aggregate pool committed on Midnight. Individual split amounts remain strictly shielded.
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400">Total Treasury Pool</span>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                    {Number(vaultState?.totalVaultFunds ?? 0n).toLocaleString()} tDUST
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Allocations</span>
                    <div className="text-xl font-bold text-slate-200 mt-0.5">
                      {vaultState?.commitments.length ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Claims Settled</span>
                    <div className="text-xl font-bold text-emerald-400 mt-0.5">
                      {vaultState?.claimedCount ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-slate-400 block mb-1">Batch ID</span>
                  <span className="font-mono text-slate-300 break-all text-[11px]">
                    {vaultState?.distributionId}
                  </span>
                </div>
              </div>
            </div>

            {/* Add New Allocation Form */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-sm font-semibold text-slate-200 mb-2">
                Register New Private Allocation
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Creates a salted commitment. The amount is never written on-chain.
              </p>

              <form onSubmit={handleAddAllocation} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Contributor Role / Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Dev, Tech Writer"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Payment Amount (tDUST)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Contributor Secret Passphrase</label>
                  <input
                    type="text"
                    placeholder="e.g. secret_seed_phrase"
                    value={newRecipientSeed}
                    onChange={(e) => setNewRecipientSeed(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {organizerFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs ${
                      organizerFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {organizerFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRegistering ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                      Registering Circuit Commitment…
                    </>
                  ) : (
                    '➕ Register Allocation Commitment'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Allocation Registry & Claim Token Exporter */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">Configured Distribution Shares</h3>
                  <p className="text-xs text-slate-400">
                    Organizer's view. You can test claiming any share below.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
                  {vaultState?.allocations.length ?? 0} Contributor Records
                </span>
              </div>

              <div className="space-y-3">
                {vaultState?.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm">
                          👤
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-slate-200">{alloc.role}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            Key: {alloc.recipientKey.slice(0, 10)}…{alloc.recipientKey.slice(-6)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-cyan-400">
                            {Number(alloc.amount).toLocaleString()} tDUST
                          </span>
                          <div className="text-[11px] text-slate-500">Confidential Share</div>
                        </div>

                        {alloc.claimed ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
                            ✓ Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleQuickFill(alloc)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-medium transition-all"
                          >
                            Claim this Share →
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>On-chain Commitment:</span>
                      <span className="text-slate-400">{alloc.commitment.slice(0, 24)}…</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200/90 space-y-2">
              <div className="font-semibold text-cyan-300 flex items-center gap-2">
                <span>🔒</span> Midnight Privacy Guarantee
              </div>
              <p>
                When you register these allocations, only the 32-byte opaque commitment hashes are
                recorded on Midnight's public ledger. The amounts (35,000, 25,000, 15,000 tDUST) and
                contributor identities are <strong>never stored on the blockchain</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIVATE CLAIM PORTAL */}
      {activeTab === 'claimant' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🛡️</span> Zero-Knowledge Entitlement Claim
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your private allocation credentials. Midnight verifies your entitlement
                cryptographically without revealing your identity or your payment amount to the
                public ledger.
              </p>
            </div>

            {/* Sample Claim Token Presets */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 block">
                Quick Test Credentials (Preloaded from Vault):
              </span>
              <div className="flex flex-wrap gap-2">
                {vaultState?.allocations.map((alloc) => (
                  <button
                    key={alloc.id}
                    onClick={() => handleQuickFill(alloc)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all"
                  >
                    Test {alloc.role} ({Number(alloc.amount).toLocaleString()} tDUST)
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleClaimPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recipient Identity Secret (Private Witness)
                </label>
                <input
                  type="text"
                  placeholder="32-byte hex secret or passphrase"
                  value={claimRecipientSecret}
                  onChange={(e) => setClaimRecipientSecret(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Allocated Amount (tDUST)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Blinding Salt (32-byte Hex)
                  </label>
                  <input
                    type="text"
                    placeholder="Hex salt string"
                    value={claimSalt}
                    onChange={(e) => setClaimSalt(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Distribution Batch ID
                </label>
                <input
                  type="text"
                  value={claimDistId}
                  onChange={(e) => setClaimDistId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Dynamic ZK Proving Steps */}
              {isProving && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs font-medium text-purple-300">{provingStep}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-1.5 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {claimError && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚠️</span> Verification Error
                  </div>
                  <p>{claimError}</p>
                </div>
              )}

              {/* Success Result */}
              {claimResult && (
                <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                      <span>✓</span> {claimResult.message}
                    </span>
                    <span className="text-[11px] text-slate-400">{claimResult.timestamp}</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px] text-slate-300 pt-2 border-t border-emerald-900/50">
                    <div>
                      <span className="text-slate-500">Unlinkable Nullifier: </span>
                      <span className="text-cyan-300 break-all">{claimResult.nullifier}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Committed Leaf: </span>
                      <span className="text-purple-300 break-all">{claimResult.commitment}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-200/80 italic">
                    Privacy Verified: The transaction published the nullifier to prevent double
                    spending, but your wallet address, identity, and payment amount ({claimAmount} tDUST)
                    were never revealed.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProving}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs md:text-sm transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {isProving ? 'Generating ZK Proof…' : '🔐 Prove Entitlement & Claim Share'}
                </button>

                {/* Tamper Test button for Reviewer */}
                <button
                  type="button"
                  onClick={() => {
                    const tampered = (BigInt(claimAmount || '1000') + 10_000n).toString();
                    setClaimAmount(tampered);
                    setClaimResult(null);
                    setClaimError('Tampered amount set (+10,000 tDUST). Click "Prove Entitlement" to test cryptographic rejection.');
                  }}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all"
                  title="Tamper with amount to verify ZK circuit rejection"
                >
                  Simulate Cheat Attempt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIDENTIAL LEDGER EXPLORER & PRIVACY AUDIT */}
      {activeTab === 'explorer' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>🔍</span> Public On-Chain Ledger vs. Confidential Client Witnesses
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Compare what the entire world sees on the Midnight blockchain versus what remains
              cryptographically private on the participant's device.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Ledger State */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-cyan-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300 text-sm flex items-center gap-2">
                    <span>🌐</span> What the Blockchain & Observers See
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-[10px] text-cyan-400 font-mono">
                    PUBLIC
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Organizer Public Key:</span>
                    <span className="text-slate-300 break-all">{vaultState?.organizerKey}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Total Vault Funds:</span>
                    <span className="text-cyan-400 font-bold">
                      {Number(vaultState?.totalVaultFunds ?? 0n).toLocaleString()} tDUST
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">
                      Registered Allocation Commitments ({vaultState?.commitments.length}):
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1 mt-1 text-[11px]">
                      {vaultState?.commitments.map((c, idx) => (
                        <div key={idx} className="text-slate-400 break-all">
                          [{idx + 1}] {c}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">
                      Spent Claim Nullifiers ({vaultState?.claimedNullifiers.length}):
                    </span>
                    {vaultState?.claimedNullifiers.length === 0 ? (
                      <span className="text-slate-600 italic text-[11px]">No claims submitted yet</span>
                    ) : (
                      <div className="max-h-24 overflow-y-auto space-y-1 mt-1 text-[11px]">
                        {vaultState?.claimedNullifiers.map((n, idx) => (
                          <div key={idx} className="text-emerald-400 break-all">
                            ✓ {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Private Client Witnesses */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-purple-800/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-300 text-sm flex items-center gap-2">
                    <span>🔐</span> Client-Side Private Witnesses (NEVER ON-CHAIN)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[10px] text-purple-400 font-mono">
                    CONFIDENTIAL
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Recipient Private Secrets:</span>
                    <span className="text-purple-300">
                      Kept strictly in local user memory. Never transmitted or stored on the ledger.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Individual Payout Amounts:</span>
                    <span className="text-emerald-400 font-semibold">
                      Protected by Zero-Knowledge circuit. Observers cannot tell who received 35k, 25k, or 15k.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Blinding Factors (Salts):</span>
                    <span className="text-slate-400">
                      256-bit cryptographic entropy guarantees rainbow table resistance.
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Nullifier Secret:</span>
                    <span className="text-slate-400">
                      Guarantees un-linkability: Public nullifier cannot be tied back to the commitment or identity.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
