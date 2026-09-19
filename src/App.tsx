import React from 'react';
import { Layout } from './components/Layout';
import { DistributionManager } from './components/DistributionManager';
import { useMidnight } from './hooks/useMidnight';

export const App: React.FC = () => {
  const wallet = useMidnight();

  return (
    <Layout wallet={wallet}>
      <DistributionManager
        walletConnected={wallet.isConnected}
        walletAddress={wallet.address}
      />
    </Layout>
  );
};

export default App;
