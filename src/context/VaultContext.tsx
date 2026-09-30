import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  waitForTxConfirmation,
} from '../midnight/contract';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  getOrganizerSecret,
  saveOrganizerSecret,
  removeOrganizerSecret,
  validateOrganizerSecret,
} from '../midnight/crypto';

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
    customSalt?: string,
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
  resetOrganizerSecret: (customSecret?: string) => void;
  isProving: boolean;
  provingStep: string;
  provingElapsedSeconds: number;
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
  const [provingElapsedSeconds, setProvingElapsedSeconds] = useState(0);
  const isProvingRef = useRef(false);
  const [claimResult, setClaimResult] = useState<ClaimVerificationResult | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Synchronize elapsed seconds timer whenever isProving is active
  useEffect(() => {
    if (!isProving) {
      setProvingElapsedSeconds(0);
      return;
    }

    setProvingElapsedSeconds(0);
    const start = Date.now();
    const interval = setInterval(() => {
      setProvingElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProving]);

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
            commitments: live.commitments,
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
        // Load any user-saved allocations from localStorage (real on-chain registrations take precedence)
        const saved = getPersistedAllocations(initialState.contractAddress);
        if (saved && saved.length > 0) {
          const merged = [...saved];
          for (const demo of initialState.allocations) {
            if (!merged.some((m) => m.commitment === demo.commitment || m.role.toLowerCase() === demo.role.toLowerCase())) {
              merged.push(demo);
            }
          }
          initialState.allocations = merged;
        }

        // Try syncing from Midnight indexer
        try {
          const netConfig = getNetworkConfig('preprod');
          const live = await fetchLiveContractState(netConfig.indexerUrl, initialState.contractAddress);
          if (live) {
            initialState.organizerKey = live.organizerKey || initialState.organizerKey;
            initialState.distributionId = live.distributionId || initialState.distributionId;
            initialState.totalVaultFunds = live.totalVaultFunds;
            initialState.commitments = live.commitments;
            initialState.claimedNullifiers = live.claimedNullifiers;
            initialState.claimedCount = live.claimedCount;
            initialState.isClosed = live.isClosed;
          }
        } catch (err) {
          console.warn('Initial indexer query:', err);
        }

        // Ensure valid organizer secret is in localStorage for this contract
        try {
          const netConfig = getNetworkConfig('preprod');
          const expectedKey = initialState.organizerKey || netConfig.defaultOrganizer.organizerKey;
          const currentStoredSecret = getOrganizerSecret(initialState.contractAddress, expectedKey);
          if (!currentStoredSecret && netConfig.defaultOrganizer.organizerSecretHex) {
            saveOrganizerSecret(initialState.contractAddress, netConfig.defaultOrganizer.organizerSecretHex);
          }
        } catch {}

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
    customSalt?: string,
  ): Promise<{ txHash?: string; commitment: string }> => {
    if (isProvingRef.current) throw new Error('A zero-knowledge proof or transaction is already in progress.');
    if (!vaultState) throw new Error('Vault state is not loaded');
    if (vaultState.isClosed) throw new Error('Cannot register allocations to a closed distribution');
    if (amount <= 0n) throw new Error('Allocation amount must be greater than zero');

    isProvingRef.current = true;
    setIsProving(true);
    setClaimError(null);

    try {
      setProvingStep('Computing recipient cryptographic commitment...');
      const recSecret = seed ? hexToBytes(seed.length === 64 ? seed : bytesToHex(new TextEncoder().encode(seed)).padEnd(64, '0').slice(0, 64)) : hexToBytes(generateRandomHex32());
      const recKeyBytes = pureCircuits.deriveRecipientKey(recSecret);
      const saltBytes = customSalt ? hexToBytes(customSalt) : hexToBytes(generateRandomHex32());
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
        const expectedOrganizerKey =
          vaultState.organizerKey ||
          netConfig.defaultOrganizer.organizerKey;
        const organizerSecretHex =
          getOrganizerSecret(vaultState.contractAddress, expectedOrganizerKey) ||
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
        const filtered = prev.allocations.filter((a) => a.commitment !== commHex);
        const updated = {
          ...prev,
          totalVaultFunds: prev.totalVaultFunds + amount,
          commitments: Array.from(new Set([...prev.commitments, commHex])),
          allocations: [newAlloc, ...filtered],
        };
        savePersistedAllocations(prev.contractAddress, updated.allocations);
        return updated;
      });

      return { txHash, commitment: commHex };
    } finally {
      isProvingRef.current = false;
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
    if (isProvingRef.current) throw new Error('A zero-knowledge proof or transaction is already in progress.');
    if (!vaultState) throw new Error('Vault state not initialized');
    if (vaultState.isClosed) throw new Error('Distribution is closed');
    if (amount <= 0n) throw new Error('Allocated amount must be greater than zero.');

    isProvingRef.current = true;
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
      isProvingRef.current = false;
      setIsProving(false);
      setProvingStep('');
    }
  };

  // -------------------------------------------------------------------------
  // Close Distribution (Organizer Only)
  // -------------------------------------------------------------------------
  const closeDistribution = async (overrideApi?: ConnectedAPI | null): Promise<{ txHash?: string }> => {
    if (isProvingRef.current) throw new Error('A zero-knowledge proof or transaction is already in progress.');
    if (!vaultState) throw new Error('Vault state not initialized');
    isProvingRef.current = true;
    setIsProving(true);
    try {
      let txHash: string | undefined;
      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      if (activeApi) {
        const netConfig = getNetworkConfig(wallet.network || 'preprod');
        const expectedOrganizerKey =
          vaultState.organizerKey ||
          netConfig.defaultOrganizer.organizerKey;
        const organizerSecretHex =
          getOrganizerSecret(vaultState.contractAddress, expectedOrganizerKey) ||
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
      isProvingRef.current = false;
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
    if (isProvingRef.current) throw new Error('A zero-knowledge proof or transaction is already in progress.');
    isProvingRef.current = true;
    setIsProving(true);
    try {
      const netConfig = getNetworkConfig(wallet.network || 'preprod');
      const targetContract =
        vaultState?.contractAddress ||
        netConfig.contractAddress ||
        'ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e';

      setProvingStep(`Targeting smart contract: 0x${targetContract.slice(0, 8)}...`);
      const distIdHex =
        vaultState?.distributionId ||
        netConfig.defaultOrganizer.distributionId ||
        'a22378798d24fc24cf961b51ffe2d4046f7581e5e1434a8e6fc0519df4fd374a';
      const distIdBytes = hexToBytes(distIdHex);

      const expectedOrganizerKey =
        vaultState?.organizerKey ||
        netConfig.defaultOrganizer.organizerKey;

      const organizerSecretHex =
        getOrganizerSecret(targetContract, expectedOrganizerKey) ||
        netConfig.defaultOrganizer.organizerSecretHex;

      const organizerKeyHex = expectedOrganizerKey;

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
          id: `alloc-${(vaultState?.allocations?.length || 0) + i + 1}`,
          role: item.role,
          recipientKey: bytesToHex(recKeyBytes),
          recipientSecret: bytesToHex(recSecret),
          amount: item.amount,
          salt: bytesToHex(saltBytes),
          commitment: commHex,
          claimed: false,
        });
      }

      let txHash: string | undefined;
      const activeApi = overrideApi ?? (wallet.isSimulated ? null : wallet.connectedApi);

      if (activeApi) {
        // CALL THE CONTRACT FUNCTION registerAllocation ON ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e
        for (let i = 0; i < newCommitments.length; i++) {
          setProvingStep(`[Allocation ${i + 1}/${newCommitments.length}] Prompting 1AM wallet: Calling registerAllocation on smart contract ff4cc6a1...`);
          const regRes = await registerAllocationOnChain(
            activeApi,
            targetContract,
            newCommitments[i],
            organizerSecretHex,
            wallet.network || 'preprod',
            (msg) => setProvingStep(`[Allocation ${i + 1}/${newCommitments.length}] ${msg}`),
          );
          newAllocations[i].txHash = regRes.txHash;
          txHash = regRes.txHash;
          setLastTxHash(txHash);
          setLastTxExplorerUrl(getExplorerTxUrl(txHash, wallet.network || 'preprod'));

          // If multiple allocations, wait for confirmation of each block
          if (i < newCommitments.length - 1) {
            setProvingStep(`Waiting for Midnight block confirmation before registering allocation ${i + 2}...`);
            try {
              await waitForTxConfirmation(netConfig.indexerUrl, regRes.txHash, 45000);
            } catch {}
          }
        }
      } else {
        if (!wallet.isSimulated) {
          throw new Error('1AM Wallet connection is required to call contract on Midnight Preprod.');
        }
        await new Promise((r) => setTimeout(r, 1200));
        txHash = generateRandomHex32();
      }

      saveOrganizerSecret(targetContract, organizerSecretHex);

      setVaultState((prev) => {
        const mergedAllocations = [...(prev?.allocations || []), ...newAllocations];
        const mergedCommitments = Array.from(new Set([...(prev?.commitments || []), ...newCommitments]));
        const updated = {
          organizerKey: organizerKeyHex,
          distributionId: distIdHex,
          title: title || prev?.title || 'Confidential Distribution Vault',
          totalVaultFunds: (prev?.totalVaultFunds || 0n) + totalFunds,
          commitments: mergedCommitments,
          claimedNullifiers: prev?.claimedNullifiers || [],
          claimedCount: prev?.claimedCount || 0,
          isClosed: prev?.isClosed || false,
          allocations: mergedAllocations,
          contractAddress: targetContract,
        };
        savePersistedAllocations(targetContract, updated.allocations);
        return updated;
      });

      return { contractAddress: targetContract, txHash };
    } finally {
      isProvingRef.current = false;
      setIsProving(false);
      setProvingStep('');
    }
  };

  const resetOrganizerSecret = useCallback(
    (customSecret?: string) => {
      const netConfig = getNetworkConfig(wallet.network || 'preprod');
      const targetAddress = vaultState?.contractAddress || netConfig.contractAddress;
      if (customSecret) {
        saveOrganizerSecret(targetAddress, customSecret);
      } else {
        removeOrganizerSecret(targetAddress);
        removeOrganizerSecret();
        if (netConfig.defaultOrganizer.organizerSecretHex) {
          saveOrganizerSecret(targetAddress, netConfig.defaultOrganizer.organizerSecretHex);
        }
      }
    },
    [vaultState?.contractAddress, wallet.network],
  );

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
        resetOrganizerSecret,
        isProving,
        provingStep,
        provingElapsedSeconds,
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
