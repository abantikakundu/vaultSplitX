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
    setWalletState((prev) => ({
      ...prev,
      installedWallets: list,
      hasLaceExtension: list.length > 0,
    }));
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
          // Prefer 1AM wallet if present, otherwise first available
          const oneAm = installed.find((w) =>
            w.id.toLowerCase().includes('1am') ||
            w.id.toLowerCase().includes('oneam') ||
            w.name.toLowerCase().includes('1am') ||
            w.name.toLowerCase().includes('oneam')
          );
          targetId = oneAm ? oneAm.id : installed[0].id;
        } else if (typeof window !== 'undefined' && window.midnight) {
          const keys = Object.keys(window.midnight);
          if (keys.length > 0) {
            const oneAmKey = keys.find((k) => k.toLowerCase().includes('1am') || k.toLowerCase().includes('oneam'));
            targetId = oneAmKey || keys[0];
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

        // If no real extension is installed, inform and open wallet modal
        const errMsg = '1AM Wallet extension not detected. Please ensure 1AM Wallet is installed in Chrome/Brave and unlocked.';
        setWalletState((prev) => ({
          ...prev,
          isConnecting: false,
          error: errMsg,
          showWalletModal: true,
        }));
        throw new Error(errMsg);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to connect Midnight wallet';
        setWalletState((prev) => ({
          ...prev,
          isConnecting: false,
          error: msg,
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
  };
}
