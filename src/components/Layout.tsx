import React from 'react';
import { WalletConnect } from './WalletConnect';
import { useMidnight } from '../hooks/useMidnight';

interface LayoutProps {
  children: React.ReactNode;
  wallet: ReturnType<typeof useMidnight>;
}

export const Layout: React.FC<LayoutProps> = ({ children, wallet }) => {
  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#07090e]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-cyan-500/20">
              Vx
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
                  VaultSplitX
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Preprod
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Confidential Payment Distribution on Midnight Network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <WalletConnect wallet={wallet} />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-slate-900/40 via-transparent to-transparent py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Midnight Builder Challenge • Level 4
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto">
            Distribute Shared Funds{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              Without Exposing Individual Salaries
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Zero-Knowledge proofs verify that payouts follow agreed rules and total treasury funds
            are accounted for, while individual compensation amounts and identities remain 100%
            confidential.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400">VaultSplitX</span>
            <span>•</span>
            <span>Built with Compact Smart Contracts on Midnight</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://midnight.network"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Midnight Docs
            </a>
            <a
              href="https://midnightexplorer.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors"
            >
              Preprod Explorer
            </a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Zero-Knowledge Financial Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
