import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { NETWORK_CONFIG } from '../../utils/config';

export const ProtocolStatusStrip: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const address = NETWORK_CONFIG.contractAddress;
  const truncatedAddress = `${address.slice(0, 10)}...${address.slice(-8)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="protocol-status-strip" aria-label="Protocol Status">
      <div className="status-strip-inner">
        {/* Left: Status & Network */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="status-live-badge">
            <span className="live-dot" aria-hidden="true" />
            <span className="font-bold text-xs">Midnight Preprod</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live
            </span>
          </div>

          <span className="text-muted hidden sm:inline" aria-hidden="true">|</span>

          {/* Truncated Contract with Copy */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted text-[11px] font-sans">Contract:</span>
            <span className="text-text font-medium">{truncatedAddress}</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-surface text-muted hover:text-text transition-colors cursor-pointer border border-transparent hover:border-border"
              title="Copy full contract address"
              aria-label="Copy contract address"
            >
              {copied ? (
                <Check size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>

        {/* Right: External Explorer & Faucet Links */}
        <div className="flex items-center gap-3 text-xs">
          <a
            href={NETWORK_CONFIG.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors font-medium no-underline"
          >
            <span>Contract</span>
            <ExternalLink size={12} />
          </a>

          <span className="text-muted" aria-hidden="true">•</span>

          <a
            href={NETWORK_CONFIG.faucetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors font-medium no-underline"
          >
            <span>Test tokens</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};
