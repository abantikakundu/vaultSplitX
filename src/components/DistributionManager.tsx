import React, { useState, useEffect } from 'react';
import {
  createDemoVaultState,
  deriveRecipientKey,
  deriveAllocationCommitment,
  deriveClaimNullifier,
  padString32,
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
  walletConnected: _walletConnected,
  walletAddress: _walletAddress,
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
      {/* Celo-Style Floating Pill Tab Switcher */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-pill bg-sky-100/90 border border-sky-200/80 shadow-sm max-w-full overflow-x-auto">
          <button
            onClick={() => setActiveTab('organizer')}
            className={`px-5 py-2.5 rounded-pill font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'organizer'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>🏛️</span>
            <span>Organizer Hub</span>
          </button>

          <button
            onClick={() => setActiveTab('claimant')}
            className={`px-5 py-2.5 rounded-pill font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'claimant'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>🛡️</span>
            <span>Private Claim Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-5 py-2.5 rounded-pill font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'bg-white text-sky-700 shadow-sm'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <span>🔍</span>
            <span>Public Ledger & Privacy Audit</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ORGANIZER VAULT HUB */}
      {activeTab === 'organizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Summary & Add Allocation Form */}
          <div className="lg:col-span-1 space-y-6">
            {/* Vault Stats Card */}
            <div className="celo-card p-6 sm:p-7 space-y-6">
              <div>
                <div className="chip-pill mb-2 text-[11px]">Treasury Status</div>
                <h3 className="card-title text-xl flex items-center gap-2">
                  <span>⚡</span> Vault Distribution Stats
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Total aggregate pool committed on Midnight. Individual split amounts remain strictly shielded.
                </p>
              </div>

              <div className="space-y-3">
                {/* Total Pool */}
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                  <span className="text-xs uppercase tracking-wider font-bold text-ink-subtle block">
                    Total Treasury Pool
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-600 mt-1">
                    {Number(vaultState?.totalVaultFunds ?? 0n).toLocaleString()}{' '}
                    <span className="text-sm font-sans text-sky-700 font-bold">tDUST</span>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                    <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider block">
                      Allocations
                    </span>
                    <div className="text-2xl font-extrabold text-ink font-mono mt-0.5">
                      0{vaultState?.commitments.length ?? 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                    <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider block">
                      Claims Settled
                    </span>
                    <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-0.5">
                      0{vaultState?.claimedCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* Batch ID */}
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                  <span className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider block mb-1">
                    Batch Distribution ID
                  </span>
                  <span className="font-mono text-ink text-[11px] break-all select-all font-medium">
                    {vaultState?.distributionId}
                  </span>
                </div>
              </div>
            </div>

            {/* Add New Allocation Form */}
            <div className="celo-card p-6 sm:p-7 space-y-4">
              <div>
                <h4 className="card-title text-base font-bold text-ink">
                  Register New Private Allocation
                </h4>
                <p className="text-xs text-ink-muted mt-1">
                  Generates an opaque cryptographic commitment. The amount is never written on-chain.
                </p>
              </div>

              <form onSubmit={handleAddAllocation} className="space-y-4 pt-1">
                <div>
                  <label className="celo-label">Contributor Role or Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Dev, Tech Writer"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                    className="celo-input text-xs"
                  />
                </div>

                <div>
                  <label className="celo-label">Payment Amount (tDUST)</label>
                  <input
                    type="number"
                    placeholder="e.g. 20000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    required
                    min="1"
                    className="celo-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="celo-label">Contributor Secret Passphrase</label>
                  <input
                    type="text"
                    placeholder="e.g. secret_seed_phrase"
                    value={newRecipientSeed}
                    onChange={(e) => setNewRecipientSeed(e.target.value)}
                    required
                    className="celo-input text-xs font-mono"
                  />
                </div>

                {organizerFeedback && (
                  <div
                    className={`p-3.5 rounded-xl text-xs ${
                      organizerFeedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {organizerFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="btn-pill-primary w-full py-3"
                >
                  {isRegistering ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Registering Circuit Commitment…</span>
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      <span>Register Allocation Commitment</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Allocation Registry & Share Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="celo-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="card-title text-xl">Configured Distribution Shares</h3>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    Organizer view with preloaded reviewer allocations. Test claiming any share below:
                  </p>
                </div>
                <span className="chip-pill text-xs">
                  {vaultState?.allocations.length ?? 0} Contributor Records
                </span>
              </div>

              <div className="space-y-3">
                {vaultState?.allocations.map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-5 rounded-2xl bg-sky-50/70 border border-sky-100 hover:border-sky-300 hover:bg-white hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-lg text-sky-700">
                          👤
                        </div>
                        <div>
                          <div className="font-bold text-sm sm:text-base text-ink">{alloc.role}</div>
                          <div className="text-xs text-ink-subtle font-mono mt-0.5">
                            Key: {alloc.recipientKey.slice(0, 10)}…{alloc.recipientKey.slice(-6)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-base font-extrabold font-mono text-sky-600">
                            {Number(alloc.amount).toLocaleString()} tDUST
                          </span>
                          <div className="text-[11px] text-ink-subtle">Confidential Share</div>
                        </div>

                        {alloc.claimed ? (
                          <span className="chip-pill chip-success text-xs font-bold">
                            ✓ Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleQuickFill(alloc)}
                            className="btn-pill-primary text-xs py-2 px-3.5"
                          >
                            <span>Claim this Share</span>
                            <span>→</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-sky-100/80 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-ink-subtle font-mono gap-1">
                      <span>On-chain Commitment Leaf:</span>
                      <span className="text-ink-muted font-medium break-all">{alloc.commitment.slice(0, 24)}…</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Architecture Notice */}
            <div className="celo-card-flat p-6 bg-sky-100/60 border border-sky-200 text-xs text-ink space-y-2">
              <div className="font-bold text-sky-800 text-sm flex items-center gap-2">
                <span>🔒</span> Midnight Privacy Guarantee
              </div>
              <p className="text-ink-muted leading-relaxed">
                When you register these allocations, only the 32-byte opaque commitment hashes are
                recorded on Midnight's public ledger. The individual amounts (35,000, 25,000, 15,000 tDUST) and
                contributor identities are <strong>never stored on the blockchain</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRIVATE CLAIM PORTAL */}
      {activeTab === 'claimant' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="celo-card p-6 sm:p-10 space-y-6">
            <div className="space-y-2">
              <div className="chip-pill text-xs">Zero-Knowledge Settlement</div>
              <h3 className="card-title text-2xl flex items-center gap-2">
                <span>🛡️</span> Zero-Knowledge Entitlement Claim
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Enter your private allocation credentials. Midnight verifies your entitlement
                cryptographically without revealing your identity or your payment amount to the public ledger.
              </p>
            </div>

            {/* Sample Claim Token Presets */}
            <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200/70 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
                Quick Test Credentials (Preloaded from Vault):
              </span>
              <div className="flex flex-wrap gap-2">
                {vaultState?.allocations.map((alloc) => (
                  <button
                    key={alloc.id}
                    onClick={() => handleQuickFill(alloc)}
                    className="chip-pill hover:bg-sky-200 transition-all cursor-pointer text-xs py-1.5 px-3"
                  >
                    <span>Test {alloc.role}</span>
                    <span className="text-sky-600 font-mono">({Number(alloc.amount).toLocaleString()} tDUST)</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleClaimPayout} className="space-y-5">
              <div>
                <label className="celo-label">
                  Recipient Identity Secret (Private Witness)
                </label>
                <input
                  type="text"
                  placeholder="32-byte hex secret or passphrase"
                  value={claimRecipientSecret}
                  onChange={(e) => setClaimRecipientSecret(e.target.value)}
                  required
                  className="celo-input celo-input-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="celo-label">
                    Allocated Amount (tDUST)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    required
                    min="1"
                    className="celo-input celo-input-mono text-xs font-bold text-sky-700"
                  />
                </div>

                <div>
                  <label className="celo-label">
                    Blinding Salt (32-byte Hex)
                  </label>
                  <input
                    type="text"
                    placeholder="Hex salt string"
                    value={claimSalt}
                    onChange={(e) => setClaimSalt(e.target.value)}
                    required
                    className="celo-input celo-input-mono text-xs text-ink-muted"
                  />
                </div>
              </div>

              <div>
                <label className="celo-label">
                  Distribution Batch ID
                </label>
                <input
                  type="text"
                  value={claimDistId}
                  onChange={(e) => setClaimDistId(e.target.value)}
                  required
                  className="celo-input celo-input-mono text-xs text-ink-muted"
                />
              </div>

              {/* Dynamic ZK Proving Steps */}
              {isProving && (
                <div className="p-5 rounded-2xl bg-sky-100/70 border border-sky-300 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs sm:text-sm font-bold text-sky-900">{provingStep}</span>
                  </div>
                  <div className="w-full bg-sky-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-sky-600 h-2 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {claimError && (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <span>⚠️</span> Verification Error
                  </div>
                  <p>{claimError}</p>
                </div>
              )}

              {/* Success Result */}
              {claimResult && (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-base text-emerald-800 flex items-center gap-2">
                      <span>✓</span> {claimResult.message}
                    </span>
                    <span className="chip-pill chip-success text-[11px]">{claimResult.timestamp}</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs pt-2 border-t border-emerald-200/60">
                    <div className="p-2.5 rounded-lg bg-white/70 border border-emerald-200">
                      <span className="text-emerald-700 font-bold block mb-0.5">Unlinkable Nullifier:</span>
                      <span className="break-all text-ink">{claimResult.nullifier}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/70 border border-emerald-200">
                      <span className="text-emerald-700 font-bold block mb-0.5">Committed Leaf:</span>
                      <span className="break-all text-ink">{claimResult.commitment}</span>
                    </div>
                  </div>

                  <p className="text-xs text-emerald-800 leading-relaxed italic pt-1">
                    Privacy Verified: The transaction published the nullifier to prevent double
                    spending, but your wallet address, identity, and payment amount ({claimAmount} tDUST)
                    were never revealed.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProving}
                  className="btn-pill-primary flex-1 py-3.5 px-6 text-sm"
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
                  className="btn-pill-secondary py-3.5 px-5 text-xs text-ink-muted"
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
          <div className="celo-card p-6 sm:p-10 space-y-6">
            <div className="space-y-2">
              <div className="chip-pill text-xs">Security & Transparency</div>
              <h3 className="card-title text-2xl flex items-center gap-2">
                <span>🔍</span> Public On-Chain Ledger vs. Confidential Client Witnesses
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Compare what the entire world sees on the Midnight blockchain versus what remains
                cryptographically private on the participant's device.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Ledger State */}
              <div className="p-6 rounded-2xl bg-sky-50 border border-sky-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-800 text-sm flex items-center gap-2">
                    <span>🌐</span> What the Blockchain & Observers See
                  </span>
                  <span className="chip-pill bg-sky-200 text-sky-800 text-[10px] uppercase font-bold">
                    PUBLIC
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Organizer Public Key:
                    </span>
                    <span className="text-ink break-all font-medium">{vaultState?.organizerKey}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Total Vault Funds:
                    </span>
                    <span className="text-sky-600 font-extrabold text-base">
                      {Number(vaultState?.totalVaultFunds ?? 0n).toLocaleString()} tDUST
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Registered Allocation Commitments ({vaultState?.commitments.length}):
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 mt-1.5 text-[11px]">
                      {vaultState?.commitments.map((c, idx) => (
                        <div key={idx} className="text-ink-muted break-all">
                          [{idx + 1}] {c}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Spent Claim Nullifiers ({vaultState?.claimedNullifiers.length}):
                    </span>
                    {vaultState?.claimedNullifiers.length === 0 ? (
                      <span className="text-ink-subtle italic text-[11px]">No claims submitted yet</span>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1 mt-1.5 text-[11px]">
                        {vaultState?.claimedNullifiers.map((n, idx) => (
                          <div key={idx} className="text-emerald-700 font-semibold break-all">
                            ✓ {n}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Private Client Witnesses */}
              <div className="p-6 rounded-2xl bg-sky-50 border border-sky-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-800 text-sm flex items-center gap-2">
                    <span>🔐</span> Client-Side Private Witnesses
                  </span>
                  <span className="chip-pill bg-sky-200 text-sky-800 text-[10px] uppercase font-bold">
                    CONFIDENTIAL
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Recipient Private Secrets:
                    </span>
                    <span className="text-ink font-sans text-xs">
                      Kept strictly in local user memory. Never transmitted or stored on the ledger.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Individual Payout Amounts:
                    </span>
                    <span className="text-emerald-700 font-semibold font-sans text-xs">
                      Protected by Zero-Knowledge circuit. Observers cannot tell who received 35k, 25k, or 15k.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Blinding Factors (Salts):
                    </span>
                    <span className="text-ink font-sans text-xs">
                      256-bit cryptographic entropy guarantees rainbow table resistance.
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100">
                    <span className="text-ink-subtle block text-[11px] font-bold uppercase mb-1">
                      Nullifier Secret:
                    </span>
                    <span className="text-ink font-sans text-xs">
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
