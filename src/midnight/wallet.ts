import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { MidnightNetwork } from './config';

export type WalletOption = {
  readonly id: string;
  readonly name: string;
  readonly apiVersion: string;
  readonly icon?: string;
};

export type ConnectedWallet = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly network: MidnightNetwork;
  readonly isDemo: boolean;
  readonly dustBalance?: bigint;
  /** Live dapp-connector API object for real wallet connections; absent for demo wallets */
  readonly connectedApi?: ConnectedAPI;
};

declare global {
  interface Window {
    midnight?: Record<string, import('@midnight-ntwrk/dapp-connector-api').InitialAPI>;
  }
}

export const listInstalledWallets = (): WalletOption[] => {
  if (typeof window === 'undefined') return [];
  return Object.entries(window.midnight ?? {}).map(([id, wallet]) => ({
    id,
    name: wallet.name || id,
    apiVersion: wallet.apiVersion || '1.0.0',
    icon: wallet.icon,
  }));
};

export const connectMidnightWallet = async (
  walletId: string,
  network: MidnightNetwork = 'preprod',
): Promise<ConnectedWallet> => {
  const wallet = window.midnight?.[walletId];

  if (!wallet) {
    throw new Error(`Midnight wallet extension '${walletId}' is not installed or unavailable in window.midnight.`);
  }

  const connected = await wallet.connect(network);
  const status = await connected.getConnectionStatus();

  if (status.status !== 'connected') {
    throw new Error('Connection request was rejected by the Midnight wallet.');
  }

  const { unshieldedAddress } = await connected.getUnshieldedAddress();

  let dustBalance: bigint | undefined;
  try {
    if (typeof (connected as any).getDustBalance === 'function') {
      const dustInfo = await (connected as any).getDustBalance();
      dustBalance = dustInfo?.dustBalance;
    }
  } catch {
    // Optional
  }

  return {
    id: walletId,
    name: wallet.name || walletId,
    address: unshieldedAddress,
    network,
    isDemo: false,
    dustBalance,
    connectedApi: connected,
  };
};

export const createDemoWallet = (network: MidnightNetwork = 'preprod'): ConnectedWallet => {
  const storageKey = `vaultsplitx_demo_wallet_${network}`;
  let address = localStorage.getItem(storageKey);
  if (!address) {
    const prefix = network === 'preprod' ? 'mn_addr_preprod' : 'mn_addr_preview';
    const randPart =
      Math.random().toString(36).substring(2, 12) +
      Math.random().toString(36).substring(2, 12);
    address = `${prefix}1${randPart}`;
    localStorage.setItem(storageKey, address);
  }

  return {
    id: `demo-${network}`,
    name: 'Midnight Demo Simulator',
    address,
    network,
    isDemo: true,
    dustBalance: 250_000n,
  };
};

export const STORAGE_KEY_CONNECTED_WALLET = 'vaultsplitx_connected_wallet_id';

export const getSavedWalletId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_CONNECTED_WALLET);
  } catch {
    return null;
  }
};

export const saveConnectedWalletId = (walletId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONNECTED_WALLET, walletId);
  } catch {}
};

export const clearSavedWalletId = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_CONNECTED_WALLET);
  } catch {}
};

/**
 * Waits up to timeoutMs for the Midnight wallet extension (such as 1am wallet) to inject into window.midnight.
 */
export const waitForMidnightExtensions = async (
  targetWalletId?: string,
  timeoutMs = 2500,
): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const midnightObj = window.midnight;
    if (midnightObj && Object.keys(midnightObj).length > 0) {
      if (!targetWalletId || midnightObj[targetWalletId]) {
        return true;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return Boolean(
    window.midnight &&
      Object.keys(window.midnight).length > 0 &&
      (!targetWalletId || window.midnight[targetWalletId]),
  );
};

export const autoReconnectMidnightWallet = async (
  network: MidnightNetwork = 'preprod',
): Promise<ConnectedWallet | null> => {
  const savedId = getSavedWalletId();
  if (!savedId) return null;

  if (savedId.startsWith('demo-')) {
    return createDemoWallet(network);
  }

  // Wait for extension to inject
  const detected = await waitForMidnightExtensions(savedId, 2500);
  if (!detected || !window.midnight?.[savedId]) {
    console.info(`[VaultSplitX] Saved wallet '${savedId}' not detected on page load.`);
    return null;
  }

  try {
    return await connectMidnightWallet(savedId, network);
  } catch (err) {
    console.warn('[VaultSplitX] Auto-reconnection to Midnight wallet failed:', err);
    return null;
  }
};
