import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { X, ExternalLink, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { NETWORK_CONFIG } from '../../utils/config';
import logoImg from '../../../assets/logo.png';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const wallet = useWallet();

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

          {!wallet.isConnected && (
            <button
              onClick={() => {
                wallet.connectWallet(false);
                onClose();
              }}
              className="btn-pill btn-pill-sky w-full py-3 text-sm font-bold"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
