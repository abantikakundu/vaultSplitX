import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sun, Moon, Wallet, Menu, X, ChevronDown, LogOut, Copy, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import logoImg from '../../../assets/logo.png';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  mobileMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, mobileMenuOpen }) => {
  const { theme, setTheme } = useTheme();
  const wallet = useWallet();
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close wallet dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setWalletMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncatedAddress = wallet.address
    ? `${wallet.address.slice(0, 7)}...${wallet.address.slice(-5)}`
    : '';

  return (
    <header className="editorial-navbar" role="banner">
      <div className="navbar-inner">
        {/* Left: Brand & Wordmark */}
        <Link to="/" className="brand-link" aria-label="VaultSplitX Home">
          <img
            src={logoImg}
            alt="VaultSplitX Logo"
            className="w-8 h-8 object-contain"
            style={{ width: '32px', height: '32px' }}
          />
          <div className="flex items-center gap-2">
            <span className="font-display font-bold tracking-tight text-text">
              VaultSplit<span className="text-sky-400">X</span>
            </span>
            <span className="brand-tag">
              Midnight
            </span>
          </div>
        </Link>

        {/* Center: Exactly Four Links */}
        <nav className="nav-links hidden md:flex" aria-label="Main Navigation">
          <NavLink
            to="/vault"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Vault
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Create
          </NavLink>
          <NavLink
            to="/claim"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Claim
          </NavLink>
          <NavLink
            to="/verify"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Verify
          </NavLink>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Segmented Toggle */}
          <div className="theme-segmented-toggle" role="group" aria-label="Theme Switcher">
            <button
              onClick={() => setTheme('light')}
              className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
              title="Light Theme"
              aria-pressed={theme === 'light'}
            >
              <Sun size={13} />
              <span className="hidden lg:inline">Light</span>
            </button>
            <button
              onClick={() => setTheme('midnight')}
              className={`theme-toggle-btn ${theme === 'midnight' ? 'active' : ''}`}
              title="Midnight Theme"
              aria-pressed={theme === 'midnight'}
            >
              <Moon size={13} />
              <span className="hidden lg:inline">Midnight</span>
            </button>
          </div>

          {/* Network Chip */}
          <div className="network-chip hidden sm:flex">
            <span className="live-dot" aria-hidden="true" />
            <span>Preprod</span>
          </div>

          {/* Wallet Connect */}
          {wallet.isConnected && wallet.address ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                className="btn-pill btn-pill-outline py-1.5 px-3.5 text-xs font-mono flex items-center gap-2"
                aria-expanded={walletMenuOpen}
                aria-haspopup="true"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{truncatedAddress}</span>
                <ChevronDown size={14} className="text-muted" />
              </button>

              {walletMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded shadow-lg p-2 z-50">
                  <div className="px-3 py-2 border-b border-border text-xs">
                    <span className="text-muted block text-[10px] uppercase font-bold">Network Balance</span>
                    <span className="font-mono font-bold text-text text-sm">
                      {Number(wallet.balance).toLocaleString()} tDUST
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleCopyAddress}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-hover rounded text-text transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Copy size={13} />
                        <span>Copy Address</span>
                      </span>
                      {copied && <Check size={13} className="text-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        wallet.disconnectWallet();
                        setWalletMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-500/10 text-rose-400 rounded transition-colors"
                    >
                      <LogOut size={13} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => wallet.connectWallet(false)}
                disabled={wallet.isConnecting}
                className="btn-pill btn-pill-dark py-1.5 px-4 text-xs flex items-center gap-2"
                aria-label="Connect Wallet"
              >
                <Wallet size={14} />
                <span>{wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>

              {!wallet.hasLaceExtension && (
                <button
                  onClick={() => wallet.connectWallet(true)}
                  className="btn-pill btn-pill-outline py-1.5 px-3 text-xs hidden lg:flex"
                  title="Connect simulated reviewer demo wallet"
                  aria-label="Demo Wallet"
                >
                  Demo
                </button>
              )}
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded hover:bg-surface text-text transition-colors cursor-pointer border border-border"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};
