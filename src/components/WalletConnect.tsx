import React, { useState } from 'react';
import { useMidnight } from '../hooks/useMidnight';

interface WalletConnectProps {
  wallet: ReturnType<typeof useMidnight>;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ wallet }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shorten = (addr: string) => `${addr.slice(0, 10)}…${addr.slice(-8)}`;

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px]">
            {wallet.network}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-200">
            {Number(wallet.balance).toLocaleString()} tDUST
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/60 text-xs">
          <span className="font-mono text-cyan-300" title={wallet.address}>
            {shorten(wallet.address)}
          </span>
          <button
            onClick={() => handleCopy(wallet.address!)}
            className="text-slate-400 hover:text-cyan-300 transition-colors"
            title="Copy address"
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>

        {wallet.isSimulated && (
          <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            Reviewer Demo Mode
          </span>
        )}

        <button
          onClick={wallet.disconnectWallet}
          className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallet.error && (
        <span className="text-xs text-rose-400 mr-2 max-w-xs truncate" title={wallet.error}>
          {wallet.error}
        </span>
      )}
      <button
        onClick={() => wallet.connectWallet(false)}
        disabled={wallet.isConnecting}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
      >
        {wallet.isConnecting ? (
          <>
            <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            Connecting…
          </>
        ) : (
          <>
            <span>⚡</span> Connect Midnight Wallet
          </>
        )}
      </button>

      {!wallet.hasLaceExtension && (
        <button
          onClick={() => wallet.connectWallet(true)}
          className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
          title="Connect in browser-based demo mode without Lace extension"
        >
          Demo Mode
        </button>
      )}
    </div>
  );
};
