import { useState, useEffect, useCallback } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { MidnightNetwork } from '../midnight/config';
import {
  type WalletOption,
  type ConnectedWallet,
  listInstalledWallets,
  connectMidnightWallet,
  createDemoWallet,
  autoReconnectMidnightWallet,
  saveConnectedWalletId,
  clearSavedWalletId,
  waitForMidnightExtensions,
  isLaceWallet,
  isLaceInstalled,
} from '../midnight/wallet';

export interface MidnightWalletState {
  isConnected: boolean;
  isConnecting: boolean;
  isSimulated: boolean;
  address: string | null;
  network: MidnightNetwork;
  balance: bigint;
  error: string | null;
  hasLaceExtension: boolean;
  walletId: string | null;
  walletName: string | null;
  installedWallets: WalletOption[];
  connectedApi: ConnectedAPI | null;
  showWalletModal: boolean;
}

export function useMidnight() {
  const [walletState, setWalletState] = useState<MidnightWalletState>({
    isConnected: false,
    isConnecting: false,
    isSimulated: false,
    address: null,
    network: 'preprod',
    balance: 0n,
    error: null,
    hasLaceExtension: false,
    walletId: null,
    walletName: null,
    installedWallets: [],
    connectedApi: null,
    showWalletModal: false,
  });

  const openWalletModal = useCallback(() => {
    setWalletState((prev) => ({ ...prev, showWalletModal: true }));
  }, []);

  const closeWalletModal = useCallback(() => {
    setWalletState((prev) => ({ ...prev, showWalletModal: false }));
  }, []);

  // Scan installed wallets
  const updateInstalledWallets = useCallback(() => {
    const list = listInstalledWallets();
    const laceDetected = isLaceInstalled();
    setWalletState((prev) => ({
      ...prev,
      installedWallets: list,
      hasLaceExtension: laceDetected,
    }));
  }, []);

  const clearError = useCallback(() => {
    setWalletState((prev) => ({ ...prev, error: null }));
  }, []);

  // Detect wallets on mount and attempt auto-reconnect
  useEffect(() => {
    updateInstalledWallets();

    // Re-check after brief delay in case extension injected asynchronously
    waitForMidnightExtensions(undefined, 2000).then(() => {
      updateInstalledWallets();
    });

    // Auto-reconnect real wallets only
    autoReconnectMidnightWallet('preprod')
      .then((savedWallet) => {
        if (savedWallet) {
          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            isSimulated: savedWallet.isDemo,
            address: savedWallet.address,
            walletId: savedWallet.id,
            walletName: savedWallet.name,
            balance: savedWallet.dustBalance ?? 100_000n,
            connectedApi: savedWallet.connectedApi ?? null,
            error: null,
          }));
        }
      })
      .catch((err) => {
        console.warn('Auto-reconnect error:', err);
      });
  }, [updateInstalledWallets]);

  const connectWallet = useCallback(
    async (preferSimulationOrWalletId: boolean | string = false): Promise<ConnectedWallet | null> => {
      setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        // Explicit simulation requested by user
        if (preferSimulationOrWalletId === true || preferSimulationOrWalletId === 'demo') {
          const demoWallet = createDemoWallet('preprod');
          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            isSimulated: true,
            address: demoWallet.address,
            walletId: demoWallet.id,
            walletName: demoWallet.name,
            balance: 250_000n,
            connectedApi: null,
            error: null,
            showWalletModal: false,
          }));
          return demoWallet;
        }

        // Wait up to 2500ms for Midnight wallet extension to inject into window.midnight
        await waitForMidnightExtensions(undefined, 2500);
        const installed = listInstalledWallets();

        let targetId: string | null = null;
        if (typeof preferSimulationOrWalletId === 'string' && preferSimulationOrWalletId !== '' && preferSimulationOrWalletId !== 'demo') {
          targetId = preferSimulationOrWalletId;
        } else if (installed.length > 0) {
          // Prioritize Midnight Lace if present
          const lace = installed.find((w) => isLaceWallet(w.id, w.name));
          targetId = lace ? lace.id : installed[0].id;
        } else if (typeof window !== 'undefined' && window.midnight) {
          const keys = Object.keys(window.midnight);
          if (keys.length > 0) {
            const laceKey = keys.find((k) => isLaceWallet(k));
            targetId = laceKey || keys[0];
          }
        }

        if (targetId && window.midnight?.[targetId]) {
          const connected: ConnectedWallet = await connectMidnightWallet(targetId, 'preprod');
          saveConnectedWalletId(connected.id);

          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            isSimulated: false,
            address: connected.address,
            walletId: connected.id,
            walletName: connected.name,
            balance: connected.dustBalance ?? 100_000n,
            connectedApi: connected.connectedApi ?? null,
            error: null,
            showWalletModal: false,
          }));
          return connected;
        }

        // If Midnight Lace is not detected, surface error with prompt requirements and open modal
        const errMsg = "Midnight Lace wallet is not detected. Please install Midnight Lace. Switch Lace to the Preprod network.";
        setWalletState((prev) => ({
          ...prev,
          isConnecting: false,
          error: errMsg,
          showWalletModal: true,
        }));
        throw new Error(errMsg);
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : 'Failed to connect Midnight Lace';
        let formattedMsg = rawMsg;
        if (
          rawMsg.toLowerCase().includes('reject') ||
          rawMsg.toLowerCase().includes('declined') ||
          rawMsg.toLowerCase().includes('cancel') ||
          rawMsg.toLowerCase().includes('denied')
        ) {
          formattedMsg = 'Connection request was rejected by Midnight Lace.';
        }
        setWalletState((prev) => ({
          ...prev,
          isConnecting: false,
          error: formattedMsg,
          showWalletModal: true,
        }));
        throw err;
      }
    },
    [],
  );

  const disconnectWallet = useCallback(() => {
    clearSavedWalletId();
    setWalletState((prev) => ({
      ...prev,
      isConnected: false,
      isSimulated: false,
      address: null,
      balance: 0n,
      walletId: null,
      walletName: null,
      connectedApi: null,
      error: null,
      showWalletModal: false,
    }));
  }, []);

  const refreshBalance = useCallback(async () => {
    if (walletState.connectedApi && typeof (walletState.connectedApi as any).getDustBalance === 'function') {
      try {
        const dustInfo = await (walletState.connectedApi as any).getDustBalance();
        if (dustInfo?.dustBalance !== undefined) {
          setWalletState((prev) => ({ ...prev, balance: dustInfo.dustBalance }));
        }
      } catch {}
    }
  }, [walletState.connectedApi]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    openWalletModal,
    closeWalletModal,
    clearError,
  };
}
