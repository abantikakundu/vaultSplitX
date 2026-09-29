import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { X, ExternalLink, ShieldCheck, Sun, Moon, Copy, Check, LogOut, Wallet } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { NETWORK_CONFIG } from '../../utils/config';
import { shortenAddress } from '../../midnight/wallet';
import logoImg from '../../../assets/logo.png';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const wallet = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden flex flex-col bg-bg/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5 no-underline">
          <img
            src={logoImg}
            alt="VaultSplitX Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="font-display font-bold text-lg text-text">
            VaultSplit<span className="text-sky-400">X</span>
          </span>
        </Link>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-surface text-text border border-border"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav Links */}
      <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
        <nav className="flex flex-col space-y-2" aria-label="Mobile Links">
          <NavLink
            to="/vault"
            onClick={onClose}
            className={({ isActive }) =>
              `p-3.5 rounded text-base font-semibold transition-colors flex items-center justify-between ${
                isActive ? 'bg-surface text-sky-400 border border-sky-400/40' : 'text-text hover:bg-surface'
              }`
            }
          >
            <span>Vault</span>
            <span className="text-xs text-muted font-normal font-mono">/vault</span>
          </NavLink>

          <NavLink
            to="/create"
            onClick={onClose}
            className={({ isActive }) =>
              `p-3.5 rounded text-base font-semibold transition-colors flex items-center justify-between ${
                isActive ? 'bg-surface text-sky-400 border border-sky-400/40' : 'text-text hover:bg-surface'
              }`
            }
          >
            <span>Create</span>
            <span className="text-xs text-muted font-normal font-mono">/create</span>
          </NavLink>

          <NavLink
            to="/claim"
            onClick={onClose}
            className={({ isActive }) =>
              `p-3.5 rounded text-base font-semibold transition-colors flex items-center justify-between ${
                isActive ? 'bg-surface text-sky-400 border border-sky-400/40' : 'text-text hover:bg-surface'
              }`
            }
          >
            <span>Claim</span>
            <span className="text-xs text-muted font-normal font-mono">/claim</span>
          </NavLink>

          <NavLink
            to="/verify"
            onClick={onClose}
            className={({ isActive }) =>
              `p-3.5 rounded text-base font-semibold transition-colors flex items-center justify-between ${
                isActive ? 'bg-surface text-sky-400 border border-sky-400/40' : 'text-text hover:bg-surface'
              }`
            }
          >
            <span>Verify</span>
            <span className="text-xs text-muted font-normal font-mono">/verify</span>
          </NavLink>
        </nav>

        {/* Footer info & Theme toggle */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted">Theme</span>
            <div className="theme-segmented-toggle">
              <button
                onClick={() => setTheme('light')}
                className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('midnight')}
                className={`theme-toggle-btn ${theme === 'midnight' ? 'active' : ''}`}
              >
                <Moon size={13} />
                <span>Midnight</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-surface border border-border rounded flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-semibold text-text">Midnight Preprod</span>
            </div>
            <a
              href={NETWORK_CONFIG.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sky-400 no-underline"
            >
              <span>Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {wallet.isConnected && wallet.address ? (
            <div className="p-3 bg-surface border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${wallet.isSimulated ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="text-xs font-bold text-text">
                    {wallet.isSimulated ? 'Demo Simulator' : wallet.walletName || 'Midnight Lace'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-bg border border-border">
                <span className="font-mono text-xs font-bold text-text tracking-wide">
                  {shortenAddress(wallet.address)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="btn-pill btn-pill-outline py-1 px-2.5 text-xs inline-flex items-center gap-1 cursor-pointer"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => {
                  wallet.disconnectWallet();
                  onClose();
                }}
                className="w-full btn-pill py-2 text-xs font-bold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                aria-label="Disconnect wallet"
              >
                <LogOut size={13} />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                wallet.connectWallet(false).catch(() => {});
                onClose();
              }}
              className="btn-pill btn-pill-sky w-full py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet size={16} />
              <span>Connect Midnight Lace</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
