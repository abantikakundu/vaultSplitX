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
  });

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

    // Auto-reconnect
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
            balance: savedWallet.dustBalance ?? (savedWallet.isDemo ? 250_000n : 100_000n),
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
    async (preferSimulationOrWalletId: boolean | string = false) => {
      setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        // Explicit simulation requested
        if (preferSimulationOrWalletId === true || preferSimulationOrWalletId === 'demo') {
          const demoWallet = createDemoWallet('preprod');
          saveConnectedWalletId(demoWallet.id);
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
          }));
          return;
        }

        // Check installed extensions
        await waitForMidnightExtensions(undefined, 1500);
        const installed = listInstalledWallets();

        let targetId: string | null = null;
        if (typeof preferSimulationOrWalletId === 'string' && preferSimulationOrWalletId !== '') {
          targetId = preferSimulationOrWalletId;
        } else if (installed.length > 0) {
          // Prefer 1AM wallet if present, otherwise first available
          const oneAm = installed.find((w) => w.id.includes('1am') || w.name.toLowerCase().includes('1am'));
          targetId = oneAm ? oneAm.id : installed[0].id;
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
          }));
          return;
        }

        // If no real extension is installed, inform and fallback to simulator demo
        const demoWallet = createDemoWallet('preprod');
        saveConnectedWalletId(demoWallet.id);
        setWalletState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          isSimulated: true,
          address: demoWallet.address,
          walletId: demoWallet.id,
          walletName: 'Midnight Demo Simulator',
          balance: 250_000n,
          connectedApi: null,
          error: null,
        }));
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
  };
}
