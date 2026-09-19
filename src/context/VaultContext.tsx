import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface VaultContextValue {
  vaultState: DistributionVaultState | null;
  isLoadingVault: boolean;
  registerAllocation: (role: string, amount: bigint, seed?: string) => Promise<string>;
  createDistributionBatch: (
    title: string,
    totalFunds: bigint,
    allocationsList: Array<{ role: string; amount: bigint; seed?: string }>
  ) => Promise<void>;
  claimPayout: (
    recipientSecret: string,
    amount: bigint,
    salt: string,
    distId: string,
    claimSpendSecret?: string
  ) => Promise<ClaimVerificationResult>;
  closeDistribution: () => Promise<void>;
  isProving: boolean;
  provingStep: string;
  claimResult: ClaimVerificationResult | null;
  claimError: string | null;
  clearClaimState: () => void;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vaultState, setVaultState] = useState<DistributionVaultState | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState(true);

  // Claimant proving state
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState('');
  const [claimResult, setClaimResult] = useState<ClaimVerificationResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    createDemoVaultState()
      .then((state) => {
        setVaultState(state);
      })
      .finally(() => {
        setIsLoadingVault(false);
      });
  }, []);

  const clearClaimState = () => {
    setClaimResult(null);
    setClaimError(null);
    setProvingStep('');
  };

  // Register single allocation to active distribution
  const registerAllocation = async (role: string, amount: bigint, seed?: string): Promise<string> => {
    if (!vaultState) throw new Error('Vault state is not loaded');
    if (vaultState.isClosed) throw new Error('Cannot register allocations to a closed distribution');
    if (amount <= 0n) throw new Error('Allocation amount must be greater than zero');

    const recSecret = padString32(seed || `contributor_${Date.now()}`);
    const recKey = await deriveRecipientKey(recSecret);
    const saltBytes = hexToBytes(generateRandomHex32());
    const distIdBytes = hexToBytes(vaultState.distributionId);

    const commBytes = await deriveAllocationCommitment(
      recKey,
      amount,
      saltBytes,
      distIdBytes
    );
    const commHex = bytesToHex(commBytes);

    // Simulate on-chain registerAllocation circuit call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newAlloc: ContributorAllocation = {
      id: `alloc-${vaultState.allocations.length + 1}`,
      role: role || 'Contributor',
      recipientKey: bytesToHex(recKey),
      recipientSecret: bytesToHex(recSecret),
      amount,
      salt: bytesToHex(saltBytes),
      commitment: commHex,
      claimed: false,
    };

    setVaultState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalVaultFunds: prev.totalVaultFunds + amount,
        commitments: [...prev.commitments, commHex],
        allocations: [...prev.allocations, newAlloc],
      };
    });

    return commHex;
  };

  // Create a brand-new distribution batch
  const createDistributionBatch = async (
    title: string,
    totalFunds: bigint,
    allocationsList: Array<{ role: string; amount: bigint; seed?: string }>
  ): Promise<void> => {
    const distIdBytes = padString32(`VaultSplitX:${Date.now()}`);
    const distIdHex = bytesToHex(distIdBytes);

    const organizerSecret = padString32(`organizer_${Date.now()}`);
    const organizerKeyBytes = await deriveRecipientKey(organizerSecret);
    const organizerKeyHex = bytesToHex(organizerKeyBytes);

    const newAllocations: ContributorAllocation[] = [];
    const newCommitments: string[] = [];

    for (let i = 0; i < allocationsList.length; i++) {
      const item = allocationsList[i];
      const recSecret = padString32(item.seed || `contributor_${i}_${Date.now()}`);
      const recKeyBytes = await deriveRecipientKey(recSecret);
      const saltBytes = hexToBytes(generateRandomHex32());
      const commBytes = await deriveAllocationCommitment(
        recKeyBytes,
        item.amount,
        saltBytes,
        distIdBytes
      );
      const commHex = bytesToHex(commBytes);

      newCommitments.push(commHex);
      newAllocations.push({
        id: `alloc-${i + 1}`,
        role: item.role,
        recipientKey: bytesToHex(recKeyBytes),
        recipientSecret: bytesToHex(recSecret),
        amount: item.amount,
        salt: bytesToHex(saltBytes),
        commitment: commHex,
        claimed: false,
      });
    }

    setVaultState({
      organizerKey: organizerKeyHex,
      distributionId: distIdHex,
      title: title || 'Confidential Distribution Batch',
      totalVaultFunds: totalFunds,
      commitments: newCommitments,
      claimedNullifiers: [],
      claimedCount: 0,
      isClosed: false,
      allocations: newAllocations,
    });
  };

  // Claimant generates ZK proof and claims payout
  const claimPayout = async (
    recipientSecret: string,
    amount: bigint,
    salt: string,
    distId: string,
    claimSpendSecret?: string
  ): Promise<ClaimVerificationResult> => {
    if (!vaultState) throw new Error('Vault state not initialized');
    if (vaultState.isClosed) throw new Error('Distribution is closed');
    if (amount <= 0n) throw new Error('Allocated amount must be greater than zero.');

    setIsProving(true);
    setClaimError(null);
    setClaimResult(null);

    try {
      setProvingStep('1/4: Synthesizing private witnesses from encrypted secrets...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      const recSecretBytes = recipientSecret.length === 64
        ? hexToBytes(recipientSecret)
        : padString32(recipientSecret);
      const saltBytes = hexToBytes(salt);
      const distIdBytes = hexToBytes(distId);
      const spendSecretBytes = hexToBytes(claimSpendSecret || generateRandomHex32());

      setProvingStep('2/4: Computing cryptographic recipient key & commitment...');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const recKey = await deriveRecipientKey(recSecretBytes);
      const derivedCommitment = await deriveAllocationCommitment(
        recKey,
        amount,
        saltBytes,
        distIdBytes
      );
      const commitmentHex = bytesToHex(derivedCommitment);

      setProvingStep('3/4: Verifying commitment inclusion in Midnight distribution ledger...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      const isCommitted = vaultState.commitments.includes(commitmentHex);
      if (!isCommitted) {
        throw new Error(
          'ZK Verification Failed: No matching allocation commitment found on-chain. Check your secret, amount, salt, or distribution ID.'
        );
      }

      setProvingStep('4/4: Deriving un-linkable nullifier & checking double-claim state...');
      await new Promise((resolve) => setTimeout(resolve, 600));

      const nullifierBytes = await deriveClaimNullifier(derivedCommitment, spendSecretBytes);
      const nullifierHex = bytesToHex(nullifierBytes);

      if (vaultState.claimedNullifiers.includes(nullifierHex)) {
        throw new Error(
          'Double-Claim Rejected: This allocation has already been claimed! The nullifier exists on the ledger.'
        );
      }

      // Successful proof & settlement
      setVaultState((prev) => {
        if (!prev) return prev;
        const updatedAllocations = prev.allocations.map((a) =>
          a.commitment === commitmentHex ? { ...a, claimed: true } : a
        );
        return {
          ...prev,
          claimedNullifiers: [...prev.claimedNullifiers, nullifierHex],
          claimedCount: prev.claimedCount + 1,
          allocations: updatedAllocations,
        };
      });

      const res: ClaimVerificationResult = {
        success: true,
        commitment: commitmentHex,
        nullifier: nullifierHex,
        message: 'Zero-Knowledge Proof Verified! Payout settled confidentially.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setClaimResult(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed.';
      setClaimError(msg);
      throw err;
    } finally {
      setIsProving(false);
      setProvingStep('');
    }
  };

  // Close distribution (organizer action)
  const closeDistribution = async (): Promise<void> => {
    if (!vaultState) return;
    await new Promise((resolve) => setTimeout(resolve, 600));
    setVaultState((prev) => (prev ? { ...prev, isClosed: true } : prev));
  };

  return (
    <VaultContext.Provider
      value={{
        vaultState,
        isLoadingVault,
        registerAllocation,
        createDistributionBatch,
        claimPayout,
        closeDistribution,
        isProving,
        provingStep,
        claimResult,
        claimError,
        clearClaimState,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = (): VaultContextValue => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
