import React, { createContext, useContext } from 'react';
import { useMidnight, MidnightWalletState } from '../hooks/useMidnight';

import { ConnectedWallet } from '../midnight/wallet';

export interface WalletContextValue extends MidnightWalletState {
  connectWallet: (preferSimulationOrWalletId?: boolean | string) => Promise<ConnectedWallet | null>;
  disconnectWallet: () => void;
  refreshBalance: () => Promise<void>;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wallet = useMidnight();

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
