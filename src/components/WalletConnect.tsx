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
      <div className="flex items-center gap-2 flex-wrap">
        {/* Network & Balance Chip */}
        <div className="chip-pill chip-success">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
          <span className="uppercase text-[11px] font-bold tracking-wider">{wallet.network}</span>
          <span className="text-emerald-300">|</span>
          <span className="font-mono font-medium text-[11px]">
            {Number(wallet.balance).toLocaleString()} tDUST
          </span>
        </div>

        {/* Address Pill */}
        <button
          onClick={() => handleCopy(wallet.address!)}
          className="chip-pill hover:bg-sky-200/60 transition-all cursor-pointer font-mono text-[11px]"
          title="Click to copy address"
          aria-label="Copy wallet address"
        >
          <span>{shorten(wallet.address)}</span>
          <span className="text-sky-600 ml-1 font-sans">{copied ? '✓' : '⎘'}</span>
        </button>

        {wallet.isSimulated && (
          <span className="chip-pill chip-warning text-[10px]">
            Demo Mode
          </span>
        )}

        {/* Disconnect Button */}
        <button
          onClick={wallet.disconnectWallet}
          className="px-3 py-1.5 rounded-pill bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallet.error && (
        <span className="text-xs text-rose-600 max-w-xs truncate" title={wallet.error}>
          {wallet.error}
        </span>
      )}

      <button
        onClick={() => wallet.connectWallet(false)}
        disabled={wallet.isConnecting}
        className="btn-pill-primary text-xs py-2 px-4 shadow-sm"
        aria-label="Connect Midnight Wallet"
      >
        {wallet.isConnecting ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            <span>Connecting…</span>
          </>
        ) : (
          <>
            <span>⚡</span>
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      {!wallet.hasLaceExtension && (
        <button
          onClick={() => wallet.connectWallet(true)}
          className="btn-pill-secondary text-xs py-2 px-3.5"
          title="Connect simulated reviewer demo wallet without browser extension"
          aria-label="Launch Demo Mode"
        >
          Demo Mode
        </button>
      )}
    </div>
  );
};
