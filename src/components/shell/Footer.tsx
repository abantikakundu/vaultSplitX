import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { NETWORK_CONFIG } from '../../utils/config';
import logoImg from '../../../assets/logo.png';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface border-t border-border mt-auto pt-14 pb-10 text-text" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <img
                src={logoImg}
                alt="VaultSplitX Logo"
                className="w-9 h-9 object-contain"
                style={{ width: '36px', height: '36px' }}
              />
              <span className="font-display font-bold text-2xl tracking-tight text-text">
                VaultSplit<span className="text-sky-400">X</span>
              </span>
            </Link>
            <p className="text-sm text-muted max-w-sm leading-relaxed">
              Confidential payment distribution protocol built on Midnight.
              Split compensation, contributor bounties, and grants privately with verifiable zero-knowledge proofs.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-hover border border-border text-muted">
                <ShieldCheck size={13} className="text-sky-400" />
                <span>Midnight Preprod</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-surface-hover border border-border text-muted">
                Compact v0.23
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-text">Product</h4>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <Link to="/vault" className="text-muted hover:text-sky-400 transition-colors no-underline">
                  Vault Dashboard
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-muted hover:text-sky-400 transition-colors no-underline">
                  Create Distribution
                </Link>
              </li>
              <li>
                <Link to="/claim" className="text-muted hover:text-sky-400 transition-colors no-underline">
                  Private Claim
                </Link>
              </li>
              <li>
                <Link to="/verify" className="text-muted hover:text-sky-400 transition-colors no-underline">
                  Public Ledger Audit
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-text">Resources</h4>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a
                  href={NETWORK_CONFIG.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>Documentation</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href={NETWORK_CONFIG.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>GitHub Repository</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href={NETWORK_CONFIG.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>Preprod Explorer</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Network */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-text">Network</h4>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a
                  href="https://midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>Midnight Network</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.midnight.network"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>Compact Language</span>
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href={NETWORK_CONFIG.faucetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-muted hover:text-sky-400 transition-colors no-underline"
                >
                  <span>Preprod Faucet</span>
                  <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            &copy; 2026 VaultSplitX. Built for Midnight Network.
          </div>
          <div className="font-mono text-[11px] text-muted text-center sm:text-right break-all">
            Contract: {NETWORK_CONFIG.contractAddress}
          </div>
        </div>
      </div>
    </footer>
  );
};
