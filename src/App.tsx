import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { WalletProvider } from './context/WalletContext';
import { VaultProvider } from './context/VaultContext';
import { AppShell } from './components/shell/AppShell';
import { PageSkeleton } from './components/common/PageSkeleton';

// Lazy-load routes for optimized bundle chunking
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const VaultPage = lazy(() => import('./pages/VaultPage').then((m) => ({ default: m.VaultPage })));
const CreatePage = lazy(() => import('./pages/CreatePage').then((m) => ({ default: m.CreatePage })));
const ClaimPage = lazy(() => import('./pages/ClaimPage').then((m) => ({ default: m.ClaimPage })));
const VerifyPage = lazy(() => import('./pages/VerifyPage').then((m) => ({ default: m.VerifyPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <WalletProvider>
        <VaultProvider>
          <BrowserRouter>
            <AppShell>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/vault" element={<VaultPage />} />
                  <Route path="/create" element={<CreatePage />} />
                  <Route path="/claim" element={<ClaimPage />} />
                  <Route path="/verify" element={<VerifyPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppShell>
          </BrowserRouter>
        </VaultProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

export default App;
