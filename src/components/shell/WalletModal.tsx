import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ExternalLink,
  X,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  LogOut,
  Info,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';
import { getNetworkConfig } from '../../midnight/config';
import {
  LACE_INSTALL_URL,
  shortenAddress,
} from '../../midnight/wallet';
import { InfoTooltip } from '../common/InfoTooltip';

export const WalletModal: React.FC = () => {
  const wallet = useWallet();
  const toast = useToast();
  const netConfig = getNetworkConfig(wallet.network || 'preprod');
  const [copied, setCopied] = useState(false);

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

  const handleCopyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.info('Wallet address copied to clipboard!');
    }
  };

  if (!wallet.showWalletModal) return null;

  const isLaceDetected =
    wallet.hasLaceExtension ||
    wallet.installedWallets.some(
      (w) =>
        w.name.toLowerCase().includes('lace') ||
        w.id.toLowerCase().includes('lace')
    );

  const isRejection =
    wallet.error &&
    (wallet.error.toLowerCase().includes('reject') ||
      wallet.error.toLowerCase().includes('declined') ||
      wallet.error.toLowerCase().includes('denied') ||
      wallet.error.toLowerCase().includes('cancel'));

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
                {wallet.isConnected ? 'Midnight Wallet' : 'Connect Midnight Lace'}
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
            className="p-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md hover:bg-surface-hover text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* 1. If Connected: Show shortened address (first 6 and last 4 characters), copy button, disconnect option */}
          {wallet.isConnected && wallet.address ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-display font-bold text-sm text-text">
                      {wallet.isSimulated
                        ? 'Demo Simulator Connected'
                        : wallet.walletName || 'Midnight Lace'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Connected
                  </span>
                </div>

                {/* Shortened Address (first 6 and last 4 characters) & Copy */}
                <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-border">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Account Address
                    </span>
                    <span className="font-mono text-xs font-bold text-text tracking-wider">
                      {shortenAddress(wallet.address)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAddress}
                    className="btn-pill btn-pill-outline min-h-[44px] py-1.5 px-3 text-xs inline-flex items-center gap-1.5 cursor-pointer hover:border-sky-400"
                    aria-label="Copy wallet address"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400" aria-hidden="true" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} aria-hidden="true" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Balance display */}
                <div className="flex items-center justify-between text-xs px-1 text-muted">
                  <span>Balance:</span>
                  <span className="font-mono font-bold text-text inline-flex items-center gap-1">
                    <span>{Number(wallet.balance).toLocaleString()} tDUST</span>
                    <InfoTooltip term="tDUST" />
                  </span>
                </div>
              </div>

              {/* Action Buttons: Disconnect & Close */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    wallet.disconnectWallet();
                    toast.info('Midnight wallet disconnected.', { title: 'Wallet Disconnected' });
                  }}
                  className="btn-pill min-h-[44px] py-2 px-4 text-xs font-bold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 inline-flex items-center justify-center gap-2 flex-1 cursor-pointer transition-colors"
                  aria-label="Disconnect wallet"
                >
                  <LogOut size={14} aria-hidden="true" />
                  <span>Disconnect</span>
                </button>

                <button
                  type="button"
                  onClick={wallet.closeWalletModal}
                  className="btn-pill btn-pill-outline min-h-[44px] py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 2. On rejection or failure: Show clear error with "Try again" button */}
              {wallet.error && (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
                      {isRejection ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-display font-bold text-rose-300 text-xs sm:text-sm">
                        {isRejection ? 'Connection Rejected' : 'Connection Failed'}
                      </h4>
                      <p className="text-xs text-rose-200/90 leading-relaxed">
                        {wallet.error}
                      </p>
                    </div>
                  </div>

                  {/* Note: Switch Lace to the Preprod network */}
                  <div className="text-[11px] text-muted flex items-center gap-1.5 pt-2 border-t border-rose-500/20">
                    <Info size={13} className="text-sky-400 shrink-0" />
                    <span>Note: <strong>Switch Lace to the Preprod network</strong></span>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await wallet.connectWallet(false);
                          toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                        } catch (err) {
                          toast.error(err, { title: 'Wallet Connection Failed' });
                        }
                      }}
                      disabled={wallet.isConnecting}
                      className="btn-pill btn-pill-rose min-h-[44px] text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold cursor-pointer transition-all"
                    >
                      <RefreshCw size={13} className={wallet.isConnecting ? 'animate-spin' : ''} aria-hidden="true" />
                      <span>{wallet.isConnecting ? 'Connecting...' : 'Try again'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => wallet.clearError()}
                      className="text-xs text-muted hover:text-text px-3 py-2 min-h-[44px] inline-flex items-center cursor-pointer"
                      aria-label="Dismiss error message"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Description text */}
              <p className="text-xs text-muted leading-relaxed">
                Connect your <strong>Midnight Lace</strong> wallet to execute zero-knowledge circuits, approve DUST fees, and submit confidential transactions on Midnight Preprod.
              </p>

              {/* 4. If Midnight Lace is NOT detected */}
              {!isLaceDetected ? (
                <div className="p-5 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
                    <AlertCircle size={24} aria-hidden="true" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-text text-sm">
                      Midnight Lace Not Detected
                    </h4>
                    <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                      Midnight Lace wallet extension was not detected in your browser. Install the official Lace extension to interact with confidential vaults on Midnight Preprod.
                    </p>
                  </div>

                  {/* Required note: "Switch Lace to the Preprod network" */}
                  <div className="p-3 rounded-md bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex items-center justify-center gap-2 text-center">
                    <Info size={14} className="text-sky-400 shrink-0" aria-hidden="true" />
                    <span>Switch Lace to the Preprod network</span>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <a
                      href={LACE_INSTALL_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill btn-pill-sky min-h-[44px] text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold no-underline w-full sm:w-auto justify-center"
                      aria-label="Install Midnight Lace (opens in new tab)"
                    >
                      <span>Install Midnight Lace</span>
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await wallet.connectWallet(false);
                          toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                        } catch (err) {
                          toast.error(err, { title: 'Wallet Connection Failed' });
                        }
                      }}
                      disabled={wallet.isConnecting}
                      className="btn-pill btn-pill-outline min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
                      aria-label="Refresh wallet detection"
                    >
                      <RefreshCw size={12} className={wallet.isConnecting ? 'animate-spin' : ''} aria-hidden="true" />
                      <span>{wallet.isConnecting ? 'Detecting...' : 'Refresh Detection'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 5. Midnight Lace detected */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">
                      Detected Extensions
                    </span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready to Connect
                    </span>
                  </div>

                  {wallet.installedWallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={async () => {
                        try {
                          await wallet.connectWallet(w.id);
                          toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                        } catch (err) {
                          toast.error(err, { title: 'Wallet Connection Failed' });
                        }
                      }}
                      disabled={wallet.isConnecting}
                      className="w-full min-h-[44px] p-4 rounded-md border border-border bg-surface-hover hover:border-sky-400 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
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
                      <div className="btn-pill btn-pill-sky min-h-[44px] text-xs py-1.5 px-3 shrink-0 flex items-center gap-1 group-hover:scale-105 transition-transform">
                        <span>{wallet.isConnecting ? 'Connecting...' : 'Connect'}</span>
                        <ArrowRight size={13} />
                      </div>
                    </button>
                  ))}

                  {/* Required note: "Switch Lace to the Preprod network" */}
                  <div className="p-3 rounded-md bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex items-center gap-2">
                    <Info size={14} className="text-sky-400 shrink-0" aria-hidden="true" />
                    <span>Switch Lace to the Preprod network</span>
                  </div>
                </div>
              )}

              {/* Simulator Demo Option */}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted">Want to preview without a wallet?</span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await wallet.connectWallet('demo');
                      toast.info('Switched to Demo Simulator mode.', { title: 'Demo Mode' });
                    } catch (err) {
                      toast.error(err, { title: 'Simulation Error' });
                    }
                  }}
                  className="text-xs font-bold text-sky-400 hover:underline min-h-[44px] inline-flex items-center cursor-pointer"
                  aria-label="Use simulated reviewer demo wallet"
                >
                  Use Demo Simulator
                </button>
              </div>
            </>
          )}
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
