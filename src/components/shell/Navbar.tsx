import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Sun, Moon, Wallet, Menu, X, ChevronDown, LogOut, Copy, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';
import logoImg from '../../../assets/logo.png';
import { InfoTooltip } from '../common/InfoTooltip';
import { shortenAddress } from '../../midnight/wallet';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  mobileMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMobileMenu, mobileMenuOpen }) => {
  const { theme, setTheme } = useTheme();
  const wallet = useWallet();
  const toast = useToast();
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
      toast.info('Wallet address copied to clipboard!');
    }
  };

  const shortenedAddress = shortenAddress(wallet.address);

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
              aria-label="Switch to light theme"
              aria-pressed={theme === 'light'}
            >
              <Sun size={13} aria-hidden="true" />
              <span className="hidden lg:inline">Light</span>
            </button>
            <button
              onClick={() => setTheme('midnight')}
              className={`theme-toggle-btn ${theme === 'midnight' ? 'active' : ''}`}
              title="Midnight Theme"
              aria-label="Switch to midnight theme"
              aria-pressed={theme === 'midnight'}
            >
              <Moon size={13} aria-hidden="true" />
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
            <div className="flex items-center gap-1.5" ref={menuRef}>
              <div className="relative flex items-center bg-surface border border-border rounded-full p-1 pl-3 shadow-sm hover:border-sky-400/50 transition-colors">
                <button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="flex items-center gap-1.5 min-h-[44px] text-xs font-mono font-bold text-text hover:text-sky-400 transition-colors cursor-pointer pr-1"
                  aria-expanded={walletMenuOpen}
                  aria-haspopup="true"
                  title="View wallet details"
                  aria-label="View wallet details"
                >
                  <span className={`w-2 h-2 rounded-full ${wallet.isSimulated ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span>{shortenedAddress}</span>
                  {wallet.isSimulated && <span className="text-[10px] text-amber-400 font-sans font-bold">[Sim]</span>}
                  <ChevronDown size={13} className="text-muted" aria-hidden="true" />
                </button>

                {/* Direct Copy Button */}
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full hover:bg-surface-hover text-muted hover:text-text transition-colors cursor-pointer"
                  title={copied ? 'Copied!' : 'Copy address'}
                  aria-label="Copy address"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>

                {/* Direct Disconnect Option */}
                <button
                  onClick={wallet.disconnectWallet}
                  className="p-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full hover:bg-rose-500/15 text-muted hover:text-rose-400 transition-colors cursor-pointer ml-0.5"
                  title="Disconnect"
                  aria-label="Disconnect wallet"
                >
                  <LogOut size={13} />
                </button>

                {/* Dropdown Menu */}
                {walletMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted text-[10px] uppercase font-bold">
                          {wallet.isSimulated ? 'Demo Simulator' : wallet.walletName || 'Midnight Lace'}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${wallet.isSimulated ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {wallet.isSimulated ? 'Simulated' : 'Connected'}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-text mb-1 tracking-wider">
                        {shortenedAddress}
                      </div>
                      <span className="font-mono font-bold text-text text-sm inline-flex items-center gap-1">
                        <span>{Number(wallet.balance).toLocaleString()} tDUST</span>
                        <InfoTooltip term="tDUST" />
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleCopyAddress}
                        className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-hover rounded text-text transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Copy size={13} />
                          <span>Copy Address</span>
                        </span>
                        {copied && <Check size={13} className="text-emerald-400" />}
                      </button>

                      <a
                        href={`https://explorer.1am.xyz/contract/${wallet.address}?network=preprod`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-surface-hover rounded text-text transition-colors no-underline"
                      >
                        <Wallet size={13} className="text-sky-400" />
                        <span>View in Explorer</span>
                      </a>

                      <button
                        onClick={() => {
                          wallet.disconnectWallet();
                          setWalletMenuOpen(false);
                          toast.info('Midnight wallet disconnected.', { title: 'Wallet Disconnected' });
                        }}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-500/10 text-rose-400 rounded transition-colors cursor-pointer"
                      >
                        <LogOut size={13} />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={async () => {
                  try {
                    await wallet.connectWallet(false);
                    toast.success('Connected to Midnight Lace wallet.', { title: 'Wallet Connected' });
                  } catch (err) {
                    toast.error(err, { title: 'Wallet Connection Failed' });
                  }
                }}
                disabled={wallet.isConnecting}
                className="btn-pill btn-pill-dark min-h-[44px] py-1.5 px-3 sm:px-4 text-xs flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
                aria-label="Connect Midnight Lace Wallet"
              >
                <Wallet size={14} aria-hidden="true" />
                <span className="whitespace-nowrap">
                  {wallet.isConnecting
                    ? 'Connecting...'
                    : wallet.hasLaceExtension
                    ? 'Connect Lace'
                    : 'Connect Lace'}
                </span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await wallet.connectWallet('demo');
                    toast.info('Switched to Demo Simulator mode.', { title: 'Demo Mode' });
                  } catch (err) {
                    toast.error(err, { title: 'Simulation Error' });
                  }
                }}
                className="btn-pill btn-pill-outline min-h-[44px] py-1.5 px-3 text-xs hidden lg:flex cursor-pointer"
                title="Connect simulated reviewer demo wallet"
                aria-label="Connect Demo Simulator Wallet"
              >
                Demo
              </button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded hover:bg-surface text-text transition-colors cursor-pointer border border-border"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
};
