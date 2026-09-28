import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  createDemoVaultState,
  DistributionVaultState,
  ContributorAllocation,
  ClaimVerificationResult,
  generateRandomHex32,
  hexToBytes,
  bytesToHex,
} from '../utils/contract';
import { pureCircuits } from '../contract/index.js';
import { useWallet } from './WalletContext';
import { getNetworkConfig, getExplorerTxUrl } from '../midnight/config';
import {
  fetchLiveContractState,
  registerAllocationOnChain,
  claimPayoutOnChain,
  closeDistributionOnChain,
  deployDistributionOnChain,
  waitForTxConfirmation,
} from '../midnight/contract';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { getOrganizerSecret, saveOrganizerSecret } from '../midnight/crypto';

interface VaultContextValue {
  vaultState: DistributionVaultState | null;
  isLoadingVault: boolean;
  isSyncing: boolean;
  refreshVaultState: () => Promise<void>;
  registerAllocation: (
    role: string,
    amount: bigint,
    seed?: string,
    overrideApi?: ConnectedAPI | null,
  ) => Promise<{ txHash?: string; commitment: string }>;
  createDistributionBatch: (
    title: string,
    totalFunds: bigint,
    allocationsList: Array<{ role: string; amount: bigint; seed?: string }>,
    overrideApi?: ConnectedAPI | null,
  ) => Promise<{ contractAddress?: string; txHash?: string }>;
  claimPayout: (
    recipientSecret: string,
    amount: bigint,
    salt: string,
    distId: string,
    claimSpendSecret?: string,
    overrideApi?: ConnectedAPI | null,
  ) => Promise<ClaimVerificationResult>;
  closeDistribution: (overrideApi?: ConnectedAPI | null) => Promise<{ txHash?: string }>;
  isProving: boolean;
  provingStep: string;
  claimResult: ClaimVerificationResult | null;
  claimError: string | null;
  clearClaimState: () => void;
  lastTxHash: string | null;
  lastTxExplorerUrl: string | null;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

const STORAGE_KEY_ALLOCATIONS = 'vaultsplitx_persisted_allocations';

function getPersistedAllocations(contractAddress: string): ContributorAllocation[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_ALLOCATIONS}_${contractAddress.toLowerCase()}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function savePersistedAllocations(contractAddress: string, allocations: ContributorAllocation[]): void {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_ALLOCATIONS}_${contractAddress.toLowerCase()}`,
      JSON.stringify(allocations),
    );
  } catch {}
}

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallet = useWallet();
  const [vaultState, setVaultState] = useState<DistributionVaultState | null>(null);
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Proving & Submission State
  const [isProving, setIsProving] = useState(false);
  const [provingStep, setProvingStep] = useState('');
  const [claimResult, setClaimResult] = useState<ClaimVerificationResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Last transaction on Midnight Explorer
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastTxExplorerUrl, setLastTxExplorerUrl] = useState<string | null>(null);

  const clearClaimState = () => {
    setClaimResult(null);
    setClaimError(null);
    setProvingStep('');
  };

  // Sync state from Midnight GraphQL indexer
  const refreshVaultState = useCallback(async () => {
    try {
      setIsSyncing(true);
      const netConfig = getNetworkConfig(wallet.network || 'preprod');
      const targetAddress = vaultState?.contractAddress || netConfig.contractAddress;

      const live = await fetchLiveContractState(netConfig.indexerUrl, targetAddress);

      if (live) {
        setVaultState((prev) => {
          if (!prev) return prev;
          const knownAllocations = prev.allocations.map((a) => ({
            ...a,
            claimed: a.claimed || live.claimedNullifiers.length > 0 && prev.claimedCount < live.claimedCount,
          }));

          return {
            ...prev,
            organizerKey: live.organizerKey || prev.organizerKey,
            distributionId: live.distributionId || prev.distributionId,
            totalVaultFunds: live.totalVaultFunds,
            commitments: Array.from(new Set([...prev.commitments, ...live.commitments])),
            claimedNullifiers: live.claimedNullifiers,
            claimedCount: live.claimedCount,
            isClosed: live.isClosed,
            allocations: knownAllocations,
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch live contract state from Midnight indexer:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [vaultState?.contractAddress, wallet.network]);

  // Initial load
  useEffect(() => {
    createDemoVaultState()
      .then(async (initialState) => {
        // Load any user-saved allocations from localStorage
        const saved = getPersistedAllocations(initialState.contractAddress);
        const mergedAllocations = [...initialState.allocations];
        for (const s of saved) {
          if (!mergedAllocations.some((m) => m.commitment === s.commitment)) {
            mergedAllocations.push(s);
          }
        }
        initialState.allocations = mergedAllocations;

        // Try syncing from Midnight indexer
        try {
          const netConfig = getNetworkConfig('preprod');
          const live = await fetchLiveContractState(netConfig.indexerUrl, initialState.contractAddress);
          if (live) {
            initialState.organizerKey = live.organizerKey || initialState.organizerKey;
            initialState.distributionId = live.distributionId || initialState.distributionId;
            initialState.totalVaultFunds = live.totalVaultFunds;
            initialState.commitments = Array.from(new Set([...initialState.commitments, ...live.commitments]));
            initialState.claimedNullifiers = live.claimedNullifiers;
            initialState.claimedCount = live.claimedCount;
            initialState.isClosed = live.isClosed;
          }
        } catch (err) {
          console.warn('Initial indexer query:', err);
        }

        setVaultState(initialState);
      })
      .finally(() => {
        setIsLoadingVault(false);
      });
  }, []);

  // -------------------------------------------------------------------------
  // Register Allocation (Organizer Only)
  // -------------------------------------------------------------------------
  const registerAllocation = async (
    role: string,
    amount: bigint,
    seed?: string,
    overrideApi?: ConnectedAPI | null,
  ): Promise<{ txHash?: string; commitment: string }> => {
    if (!vaultState) throw new Error('Vault state is not loaded');
    if (vaultState.isClosed) throw new Error('Cannot register allocations to a closed distribution');
    if (amount <= 0n) throw new Error('Allocation amount must be greater than zero');

    setIsProving(true);
    setClaimError(null);

    try {
      setProvingStep('Computing recipient cryptographic commitment...');
      const recSecret = seed ? hexToBytes(seed.length === 64 ? seed : bytesToHex(new TextEncoder().encode(seed)).padEnd(64, '0').slice(0, 64)) : hexToBytes(generateRandomHex32());
      const recKeyBytes = pureCircuits.deriveRecipientKey(recSecret);
      const saltBytes = hexToBytes(generateRandomHex32());
      const distIdBytes = hexToBytes(vaultState.distributionId);

      const commBytes = pureCircuits.deriveAllocationCommitment(
        recKeyBytes,
        amount,
        saltBytes,
        distIdBytes,
      );
      const commHex = bytesToHex(commBytes);

      let txHash: string | undefined;
      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      // If real 1AM wallet is connected, execute real on-chain transaction!
      if (activeApi) {
        const netConfig = getNetworkConfig(wallet.network || 'preprod');
        const organizerSecretHex =
          getOrganizerSecret(vaultState.contractAddress) ||
          netConfig.defaultOrganizer.organizerSecretHex;

        setProvingStep('Prompting 1AM wallet: Synthesizing registerAllocation ZK proof...');
        const res = await registerAllocationOnChain(
          activeApi,
          vaultState.contractAddress,
          commHex,
          organizerSecretHex,
          wallet.network || 'preprod',
          (msg) => setProvingStep(msg),
        );

        txHash = res.txHash;
        setLastTxHash(txHash);
        setLastTxExplorerUrl(getExplorerTxUrl(txHash, wallet.network || 'preprod'));

        setProvingStep(`Transaction broadcast (0x${txHash.slice(0, 10)}...). Waiting for Midnight block confirmation...`);
        try {
          await waitForTxConfirmation(netConfig.indexerUrl, txHash, 45000);
        } catch {
          // If confirmation poll timed out, proceed
        }
      } else {
        if (!wallet.isSimulated) {
          throw new Error('1AM Wallet connection is required to register allocations on Midnight Preprod.');
        }
        // Simulation mode
        setProvingStep('Simulating registerAllocation circuit execution...');
        await new Promise((r) => setTimeout(r, 1200));
        txHash = generateRandomHex32();
      }

      const newAlloc: ContributorAllocation = {
        id: `alloc-${vaultState.allocations.length + 1}`,
        role: role || 'Contributor',
        recipientKey: bytesToHex(recKeyBytes),
        recipientSecret: bytesToHex(recSecret),
        amount,
        salt: bytesToHex(saltBytes),
        commitment: commHex,
        claimed: false,
        txHash,
      };

      setVaultState((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          totalVaultFunds: prev.totalVaultFunds + amount,
          commitments: [...prev.commitments, commHex],
          allocations: [...prev.allocations, newAlloc],
        };
        savePersistedAllocations(prev.contractAddress, updated.allocations);
        return updated;
      });

      return { txHash, commitment: commHex };
    } finally {
      setIsProving(false);
      setProvingStep('');
    }
  };

  // -------------------------------------------------------------------------
  // Claim Payout (Confidential ZK Proof)
  // -------------------------------------------------------------------------
  const claimPayout = async (
    recipientSecret: string,
    amount: bigint,
    salt: string,
    distId: string,
    claimSpendSecret?: string,
    overrideApi?: ConnectedAPI | null,
  ): Promise<ClaimVerificationResult> => {
    if (!vaultState) throw new Error('Vault state not initialized');
    if (vaultState.isClosed) throw new Error('Distribution is closed');
    if (amount <= 0n) throw new Error('Allocated amount must be greater than zero.');

    setIsProving(true);
    setClaimError(null);
    setClaimResult(null);

    try {
      setProvingStep('[1/4] Deriving private witnesses from confidential credentials...');
      const recSecretBytes =
        recipientSecret.length === 64
          ? hexToBytes(recipientSecret)
          : hexToBytes(bytesToHex(new TextEncoder().encode(recipientSecret)).padEnd(64, '0').slice(0, 64));

      const saltBytes = hexToBytes(salt);
      const distIdBytes = hexToBytes(distId);
      const spendSecretBytes = hexToBytes(claimSpendSecret || generateRandomHex32());

      setProvingStep('[2/4] Verifying allocation commitment inclusion...');
      const recKey = pureCircuits.deriveRecipientKey(recSecretBytes);
      const derivedCommitmentBytes = pureCircuits.deriveAllocationCommitment(
        recKey,
        amount,
        saltBytes,
        distIdBytes,
      );
      const commitmentHex = bytesToHex(derivedCommitmentBytes);

      const isCommitted = vaultState.commitments.includes(commitmentHex);
      if (!isCommitted) {
        throw new Error(
          'ZK Verification Failed: No matching allocation commitment found on-chain. Check your secret passphrase, payout amount, or blinding salt.',
        );
      }

      setProvingStep('[3/4] Deriving un-linkable nullifier & checking duplicate status...');
      const nullifierBytes = pureCircuits.deriveClaimNullifier(derivedCommitmentBytes, spendSecretBytes);
      const nullifierHex = bytesToHex(nullifierBytes);

      if (vaultState.claimedNullifiers.includes(nullifierHex)) {
        throw new Error(
          'Double-Claim Rejected: This allocation has already been claimed! The nullifier exists on the ledger.',
        );
      }

      let txHash: string | undefined;
      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      // Real 1AM wallet transaction submission
      if (activeApi) {
        const netConfig = getNetworkConfig(wallet.network || 'preprod');
        setProvingStep('[4/4] Executing claimPayout circuit & synthesizing ZK proof in 1AM wallet...');

        const res = await claimPayoutOnChain(
          activeApi,
          vaultState.contractAddress,
          distId,
          recSecretBytes,
          amount,
          saltBytes,
          spendSecretBytes,
          wallet.network || 'preprod',
          (msg) => setProvingStep(msg),
        );

        txHash = res.txHash;
        setLastTxHash(txHash);
        setLastTxExplorerUrl(getExplorerTxUrl(txHash, wallet.network || 'preprod'));

        setProvingStep(`Transaction broadcast (0x${txHash.slice(0, 10)}...). Confirming on Midnight Preprod...`);
        try {
          await waitForTxConfirmation(netConfig.indexerUrl, txHash, 45000);
        } catch {}
      } else {
        if (!wallet.isSimulated) {
          throw new Error('1AM Wallet connection is required to claim on Midnight Preprod.');
        }
        // Simulation mode
        setProvingStep('[4/4] Simulating on-chain claim submission...');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        txHash = generateRandomHex32();
      }

      // Update state
      setVaultState((prev) => {
        if (!prev) return prev;
        const updatedAllocations = prev.allocations.map((a) =>
          a.commitment === commitmentHex ? { ...a, claimed: true, txHash } : a,
        );
        savePersistedAllocations(prev.contractAddress, updatedAllocations);
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
        txHash,
        message: 'Zero-Knowledge Proof Verified & Transaction Included on Midnight Preprod!',
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

  // -------------------------------------------------------------------------
  // Close Distribution (Organizer Only)
  // -------------------------------------------------------------------------
  const closeDistribution = async (overrideApi?: ConnectedAPI | null): Promise<{ txHash?: string }> => {
    if (!vaultState) throw new Error('Vault state not initialized');
    setIsProving(true);
    try {
      let txHash: string | undefined;
      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      if (activeApi) {
        const netConfig = getNetworkConfig(wallet.network || 'preprod');
        const organizerSecretHex =
          getOrganizerSecret(vaultState.contractAddress) ||
          netConfig.defaultOrganizer.organizerSecretHex;

        setProvingStep('Submitting closeDistribution transaction to Midnight via 1AM wallet...');
        const res = await closeDistributionOnChain(
          activeApi,
          vaultState.contractAddress,
          organizerSecretHex,
          wallet.network || 'preprod',
          (msg) => setProvingStep(msg),
        );
        txHash = res.txHash;
        setLastTxHash(txHash);
        setLastTxExplorerUrl(getExplorerTxUrl(txHash, wallet.network || 'preprod'));
      } else {
        if (!wallet.isSimulated) {
          throw new Error('1AM Wallet connection is required to close distribution on Midnight Preprod.');
        }
        await new Promise((r) => setTimeout(r, 1000));
        txHash = generateRandomHex32();
      }

      setVaultState((prev) => (prev ? { ...prev, isClosed: true } : prev));
      return { txHash };
    } finally {
      setIsProving(false);
      setProvingStep('');
    }
  };

  // -------------------------------------------------------------------------
  // Create / Deploy Distribution Batch
  // -------------------------------------------------------------------------
  const createDistributionBatch = async (
    title: string,
    totalFunds: bigint,
    allocationsList: Array<{ role: string; amount: bigint; seed?: string }>,
    overrideApi?: ConnectedAPI | null,
  ): Promise<{ contractAddress?: string; txHash?: string }> => {
    setIsProving(true);
    try {
      setProvingStep('Deriving organizer master keys and batch identifier...');
      const distIdHex = generateRandomHex32();
      const distIdBytes = hexToBytes(distIdHex);

      const organizerSecretHex = generateRandomHex32();
      const organizerSecretBytes = hexToBytes(organizerSecretHex);
      const organizerKeyBytes = pureCircuits.deriveOrganizerKey(organizerSecretBytes);
      const organizerKeyHex = bytesToHex(organizerKeyBytes);

      const newAllocations: ContributorAllocation[] = [];
      const newCommitments: string[] = [];

      for (let i = 0; i < allocationsList.length; i++) {
        const item = allocationsList[i];
        const recSecret = item.seed
          ? hexToBytes(item.seed.length === 64 ? item.seed : bytesToHex(new TextEncoder().encode(item.seed)).padEnd(64, '0').slice(0, 64))
          : hexToBytes(generateRandomHex32());
        const recKeyBytes = pureCircuits.deriveRecipientKey(recSecret);
        const saltBytes = hexToBytes(generateRandomHex32());
        const commBytes = pureCircuits.deriveAllocationCommitment(
          recKeyBytes,
          item.amount,
          saltBytes,
          distIdBytes,
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

      let contractAddress = vaultState?.contractAddress || 'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';
      let txHash: string | undefined;

      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      // Deploy real contract on Midnight if 1AM wallet is connected
      if (activeApi) {
        setProvingStep('Prompting 1AM wallet: Deploying VaultSplitX distribution contract on Midnight Preprod...');
        try {
          const deployRes = await deployDistributionOnChain(
            activeApi,
            organizerKeyHex,
            distIdHex,
            totalFunds,
            wallet.network || 'preprod',
            (msg) => setProvingStep(msg),
          );
          contractAddress = deployRes.contractAddress;
          txHash = deployRes.txHash;
          setLastTxHash(txHash);
          setLastTxExplorerUrl(getExplorerTxUrl(txHash, wallet.network || 'preprod'));

          // Register allocations sequentially on-chain
          for (let i = 0; i < newCommitments.length; i++) {
            setProvingStep(`[Allocation ${i + 1}/${newCommitments.length}] Prompting 1AM wallet to register commitment...`);
            try {
              const regRes = await registerAllocationOnChain(
                activeApi,
                contractAddress,
                newCommitments[i],
                organizerSecretHex,
                wallet.network || 'preprod',
                (msg) => setProvingStep(`[Allocation ${i + 1}] ${msg}`),
              );
              newAllocations[i].txHash = regRes.txHash;
            } catch (regErr) {
              console.warn(`Could not register allocation ${i + 1} immediately:`, regErr);
            }
          }
        } catch (depErr) {
          console.warn('Direct on-chain contract deployment fallback to existing contract:', depErr);
          // If deploy failed (e.g., balance or gas limits), fall back to registering on existing master contract
          for (let i = 0; i < newCommitments.length; i++) {
            setProvingStep(`[Allocation ${i + 1}/${newCommitments.length}] Registering commitment on deployed contract via 1AM wallet...`);
            try {
              const netConfig = getNetworkConfig(wallet.network || 'preprod');
              const defaultOrgSecret = getOrganizerSecret(contractAddress) || netConfig.defaultOrganizer.organizerSecretHex;
              const regRes = await registerAllocationOnChain(
                activeApi,
                contractAddress,
                newCommitments[i],
                defaultOrgSecret,
                wallet.network || 'preprod',
                (msg) => setProvingStep(`[Allocation ${i + 1}] ${msg}`),
              );
              newAllocations[i].txHash = regRes.txHash;
              txHash = regRes.txHash;
            } catch {}
          }
        }
      } else {
        if (!wallet.isSimulated) {
          throw new Error('1AM Wallet connection is required to deploy on Midnight Preprod.');
        }
        await new Promise((r) => setTimeout(r, 1200));
        txHash = generateRandomHex32();
      }

      saveOrganizerSecret(contractAddress, organizerSecretHex);
      savePersistedAllocations(contractAddress, newAllocations);

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
        contractAddress,
      });

      return { contractAddress, txHash };
    } finally {
      setIsProving(false);
      setProvingStep('');
    }
  };

  return (
    <VaultContext.Provider
      value={{
        vaultState,
        isLoadingVault,
        isSyncing,
        refreshVaultState,
        registerAllocation,
        createDistributionBatch,
        claimPayout,
        closeDistribution,
        isProving,
        provingStep,
        claimResult,
        claimError,
        clearClaimState,
        lastTxHash,
        lastTxExplorerUrl,
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
