import React, { useEffect } from 'react';
import { Wallet, ExternalLink, X, ShieldCheck, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { getNetworkConfig } from '../../midnight/config';
import { InfoTooltip } from '../common/InfoTooltip';

export const WalletModal: React.FC = () => {
  const wallet = useWallet();
  const netConfig = getNetworkConfig(wallet.network || 'preprod');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && wallet.showWalletModal) {
        wallet.closeWalletModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wallet.showWalletModal, wallet.closeWalletModal]);

  if (!wallet.showWalletModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) wallet.closeWalletModal();
      }}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-bg-elev">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Wallet size={20} />
            </div>
            <div>
              <h3 id="wallet-modal-title" className="font-display text-base font-bold text-text">
                Connect Midnight Wallet
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>Target:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Preprod Network
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={wallet.closeWalletModal}
            className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-muted leading-relaxed">
            Connect your <strong>1AM Wallet</strong> to execute zero-knowledge circuits, approve DUST fees, and submit verifiable on-chain transactions to the Midnight Preprod blockchain.
          </p>

          {/* Installed Wallets List */}
          {wallet.installedWallets.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
                Detected Extensions
              </span>
              {wallet.installedWallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => wallet.connectWallet(w.id)}
                  disabled={wallet.isConnecting}
                  className="w-full p-4 rounded-md border border-border bg-surface-hover hover:border-sky-400 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-text text-sm group-hover:text-sky-400 transition-colors">
                        {w.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Detected
                      </span>
                    </div>
                    <span className="text-[11px] text-muted font-mono block">
                      v{w.apiVersion} • Midnight DApp Standard
                    </span>
                  </div>
                  <div className="btn-pill btn-pill-sky text-xs py-1.5 px-3 shrink-0 flex items-center gap-1 group-hover:scale-105 transition-transform">
                    <span>Connect</span>
                    <ArrowRight size={13} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-md border border-amber-500/30 bg-amber-500/10 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-text text-sm">
                  1AM Wallet Not Detected
                </h4>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  To sign real zero-knowledge proofs and deploy distribution vaults <InfoTooltip term="vault" /> on Midnight Preprod, please install or unlock the 1AM Wallet extension.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                <a
                  href="https://1am.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill btn-pill-sky text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold no-underline w-full sm:w-auto justify-center"
                >
                  <span>Install 1AM Wallet</span>
                  <ExternalLink size={13} />
                </a>

                <button
                  type="button"
                  onClick={() => wallet.connectWallet(false)}
                  disabled={wallet.isConnecting}
                  className="btn-pill btn-pill-outline text-xs py-2 px-3 inline-flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  <RefreshCw size={12} className={wallet.isConnecting ? 'animate-spin' : ''} />
                  <span>Refresh Detection</span>
                </button>
              </div>
            </div>
          )}

          {/* Simulator Demo Option */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted">Want to preview without a wallet?</span>
            <button
              type="button"
              onClick={() => wallet.connectWallet('demo')}
              className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
            >
              Use Demo Simulator
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-bg-elev border-t border-border flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            <span className="text-[11px]">Private keys stay on device</span>
          </div>

          <div className="inline-flex items-center gap-1">
            <a
              href={netConfig.faucetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline font-mono"
            >
              <span>Get Preprod tDUST</span>
              <ExternalLink size={11} />
            </a>
            <InfoTooltip term="tDUST" />
          </div>
        </div>
      </div>
    </div>
  );
};
