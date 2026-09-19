import React, { useState, useEffect, useRef } from 'react';
import { WalletConnect } from './WalletConnect';
import { useMidnight } from '../hooks/useMidnight';
import logoImg from '../../assets/logo.png';

interface LayoutProps {
  children: React.ReactNode;
  wallet: ReturnType<typeof useMidnight>;
}

// Lightweight count-up hook for animated statistics
function useCountUp(end: number, duration: number = 1400) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTimestamp: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [end, duration]);

  return count;
}

export const Layout: React.FC<LayoutProps> = ({ children, wallet }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Animated numbers
  const totalFundsCount = useCountUp(75000);
  const allocationsCount = useCountUp(3);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.85;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50 text-ink antialiased">
      {/* 1. FLOATING PILL NAVBAR */}
      <div className="w-full px-4 sm:px-6 pt-4 sm:pt-6">
        <header className="pill-navbar flex items-center justify-between">
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-3 text-ink no-underline group">
            <img
              src={logoImg}
              alt="VaultSplitX Logo"
              style={{ width: '36px', height: '36px', minWidth: '36px' }}
              className="w-9 h-9 object-contain drop-shadow-sm group-hover:scale-105 transition-transform flex-shrink-0"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-extrabold text-xl tracking-tight text-ink font-sans">
                VaultSplit<span className="text-sky-600">X</span>
              </span>
              <span className="chip-pill text-[10px] uppercase font-bold py-0.5 px-2 bg-sky-100 text-sky-700 border-sky-200">
                Preprod
              </span>
            </div>
          </a>

          {/* Desktop Center Links */}
          <nav className="hidden xl:flex items-center gap-1" aria-label="Main Navigation">
            <a href="#how-it-works" className="btn-pill-ghost">
              How It Works
            </a>
            <a href="#privacy-model" className="btn-pill-ghost">
              Privacy Model
            </a>
            <a href="#components" className="btn-pill-ghost">
              Core Components
            </a>
            <a href="#app-workspace" className="btn-pill-ghost">
              App
            </a>
            <a
              href="https://github.com/abantikakundu/vaultSplitX#readme"
              target="_blank"
              rel="noreferrer"
              className="btn-pill-ghost"
            >
              Docs ↗
            </a>
            <a
              href="https://github.com/abantikakundu/vaultSplitX"
              target="_blank"
              rel="noreferrer"
              className="btn-pill-ghost"
            >
              GitHub ↗
            </a>
          </nav>

          {/* Right: Wallet Connect & Mobile Hamburger */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:block">
              <WalletConnect wallet={wallet} />
            </div>

            {/* Mobile / Tablet Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-pill hover:bg-sky-100 text-ink transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile / Tablet Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden mt-2 p-4 bg-white/95 backdrop-blur-md rounded-card border border-sky-100 shadow-navbar space-y-3">
            <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-sky-50 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#privacy-model"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-sky-50 transition-colors"
              >
                Privacy Model
              </a>
              <a
                href="#components"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-sky-50 transition-colors"
              >
                Core Components
              </a>
              <a
                href="#app-workspace"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-sky-50 transition-colors"
              >
                Launch App
              </a>
              <a
                href="https://github.com/abantikakundu/vaultSplitX#readme"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl text-sm font-semibold text-sky-600 hover:bg-sky-50 transition-colors"
              >
                Documentation ↗
              </a>
              <a
                href="https://github.com/abantikakundu/vaultSplitX"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl text-sm font-semibold text-sky-600 hover:bg-sky-50 transition-colors"
              >
                GitHub Repository ↗
              </a>
            </nav>
            <div className="pt-2 border-t border-sky-100 sm:hidden">
              <WalletConnect wallet={wallet} />
            </div>
          </div>
        )}
      </div>

      {/* 2. HERO SECTION (Full-bleed Sky-400 to Sky-300 gradient) */}
      <section className="hero-gradient mt-4 sm:mt-6 py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 border-b border-sky-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Block */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-white/60 backdrop-blur-sm border border-white/80 text-ink font-semibold text-xs tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-600"></span>
              <span>Midnight Network • Zero-Knowledge Financial Privacy</span>
            </div>

            <h1 className="hero-title">
              Private payouts for shared funds.{' '}
              <span className="celo-emphasis font-normal">Nobody</span> sees who got what.
            </h1>

            <p className="text-base sm:text-lg text-ink font-normal max-w-2xl leading-relaxed">
              Disburse treasury pools and split compensation on Midnight with zero-knowledge proofs—keeping
              individual salaries, contractor rates, and identities strictly confidential.
            </p>

            <div className="flex items-center gap-4 flex-wrap pt-2">
              <a href="#app-workspace" className="btn-pill-primary" style={{ backgroundColor: '#0B1F33', color: '#FFFFFF' }}>
                <span>Launch App</span>
                <span>→</span>
              </a>
              <a
                href="https://github.com/abantikakundu/vaultSplitX#readme"
                target="_blank"
                rel="noreferrer"
                className="btn-pill-secondary"
              >
                <span>Read the Docs</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          {/* Right Visual Graphic (Custom Tasteful CSS/SVG Illustration) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-md aspect-square rounded-[36px] bg-white/40 backdrop-blur-md p-8 border border-white/60 shadow-card flex items-center justify-center">
              {/* Floating Orbit Rings */}
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-sky-500/30 animate-spin" style={{ animationDuration: '45s' }}></div>
              <div className="absolute inset-12 rounded-full border border-sky-400/40"></div>

              {/* Central Vault Graphic */}
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="w-28 h-28 rounded-full bg-white shadow-card flex items-center justify-center p-4 border border-sky-100 hover:scale-105 transition-transform">
                  <img src={logoImg} alt="Vault Icon" style={{ width: '72px', height: '72px', objectFit: 'contain' }} className="w-20 h-20 object-contain" />
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-pill px-4 py-2 shadow-sm border border-sky-100 flex items-center gap-2 text-xs font-semibold text-ink">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Shielded Vault State • Active</span>
                </div>
              </div>

              {/* Floating Feature Tags */}
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-pill text-xs font-bold text-ink shadow-sm border border-sky-100">
                🔒 ZK-SNARK Witness
              </div>
              <div className="absolute bottom-8 right-6 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-pill text-xs font-bold text-sky-700 shadow-sm border border-sky-100">
                ✨ Unlinkable Nullifiers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BIG-NUMBER STAT BAND (Celo-style oversized figures with small captions) */}
      <section className="py-12 sm:py-16 bg-white border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
            {/* Stat 1 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink font-mono tracking-tight">
                {totalFundsCount.toLocaleString()}<span className="text-sky-500 text-2xl sm:text-3xl ml-1">tDUST</span>
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-ink-subtle">
                Total Vault Treasury Committed
              </div>
            </div>

            {/* Stat 2 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink font-mono tracking-tight">
                0{allocationsCount}
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-ink-subtle">
                Opaque Allocation Commitments
              </div>
            </div>

            {/* Stat 3 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-sky-600 font-sans tracking-tight">
                100%
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-ink-subtle">
                Zero-Knowledge Privacy Shield
              </div>
            </div>

            {/* Stat 4 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink font-sans tracking-tight">
                Preprod
              </div>
              <div className="text-xs uppercase tracking-wider font-bold text-ink-subtle">
                Live Midnight Network Testnet
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE COMPONENTS CARDS */}
      <section id="components" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-sky-50 border-b border-sky-100">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="section-title">
              Engineered for <span className="celo-emphasis">confidential</span> treasury distributions
            </h2>
            <p className="text-base text-ink-muted">
              Built using Midnight’s dual-state Compact smart contract architecture to separate public proof
              verification from private client witnesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="celo-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl">
                  📜
                </div>
                <h3 className="card-title">Compact Contract</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Dual-state smart contract written in Compact v0.23, enforcing mathematical integrity on Midnight.
                </p>
              </div>
              <div className="chip-pill text-[11px] self-start">
                vaultSplitX.compact
              </div>
            </div>

            {/* Card 2 */}
            <div className="celo-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl">
                  🔐
                </div>
                <h3 className="card-title">Zero-Knowledge Proofs</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Recipients synthesize private witnesses locally in their browser. Secrets never touch the network.
                </p>
              </div>
              <div className="chip-pill text-[11px] self-start">
                Client-Side WASM
              </div>
            </div>

            {/* Card 3 */}
            <div className="celo-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl">
                  🛡️
                </div>
                <h3 className="card-title">Cryptographic Nullifiers</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Deterministic un-linkable nullifiers prevent double claims without exposing who performed the settlement.
                </p>
              </div>
              <div className="chip-pill text-[11px] self-start">
                Anti-Replay Security
              </div>
            </div>

            {/* Card 4 */}
            <div className="celo-card p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-2xl">
                  🌐
                </div>
                <h3 className="card-title">Midnight Network</h3>
                <p className="text-sm text-ink-muted leading-relaxed">
                  Next-generation data protection blockchain providing native privacy for Web3 financial workflows.
                </p>
              </div>
              <div className="chip-pill text-[11px] self-start">
                Preprod Active
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TECH-STACK MARQUEE */}
      <section className="py-8 bg-white border-b border-sky-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-3 text-center">
          <span className="text-xs uppercase tracking-widest font-bold text-ink-subtle">
            Powered by modern cryptography & web technologies
          </span>
        </div>

        <div className="marquee-container py-2" aria-hidden="true">
          <div className="marquee-content">
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚡ Midnight Network
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              💼 Lace Wallet
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚛️ React 19
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              📘 TypeScript 5.9
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚡ Vite 8
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🧪 Vitest 4
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🔒 Compact Runtime
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🛡️ ZKIR Prover Keys
            </span>
          </div>

          {/* Duplicate row for continuous loop */}
          <div className="marquee-content">
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚡ Midnight Network
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              💼 Lace Wallet
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚛️ React 19
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              📘 TypeScript 5.9
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              ⚡ Vite 8
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🧪 Vitest 4
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🔒 Compact Runtime
            </span>
            <span className="chip-pill text-sm font-semibold py-2 px-5 bg-sky-50 text-ink border-sky-200">
              🛡️ ZKIR Prover Keys
            </span>
          </div>
        </div>
      </section>

      {/* 6. "HOW VAULTSPLITX IS DIFFERENT" CAROUSEL */}
      <section id="privacy-model" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-sky-50 border-b border-sky-100 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="chip-pill text-xs">Privacy Architecture</div>
              <h2 className="section-title">
                How VaultSplitX is <span className="celo-emphasis">different</span>
              </h2>
              <p className="text-base text-ink-muted">
                Transparent blockchains expose every salary and rate. VaultSplitX mathematically divides public on-chain
                commitments from private client secrets.
              </p>
            </div>

            {/* Carousel Arrow Controls */}
            <div className="flex items-center gap-2 self-start md:self-end">
              <button
                onClick={() => scrollCarousel('left')}
                className="w-11 h-11 rounded-full bg-white border border-sky-200 shadow-sm flex items-center justify-center text-ink hover:bg-sky-100 hover:border-sky-300 transition-all cursor-pointer"
                aria-label="Scroll Carousel Left"
              >
                ←
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="w-11 h-11 rounded-full bg-white border border-sky-200 shadow-sm flex items-center justify-center text-ink hover:bg-sky-100 hover:border-sky-300 transition-all cursor-pointer"
                aria-label="Scroll Carousel Right"
              >
                →
              </button>
            </div>
          </div>

          {/* Carousel Track with 3 Detailed Cards from README */}
          <div ref={carouselRef} className="carousel-track">
            {/* Carousel Card 1: PUBLIC ON-CHAIN */}
            <div className="carousel-item">
              <div className="celo-card p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🌐</span>
                    <span className="chip-pill bg-sky-100 text-sky-800 text-[11px] font-bold uppercase">
                      Public On-Chain
                    </span>
                  </div>
                  <h3 className="card-title text-xl">What Observers See</h3>
                  <p className="text-sm text-ink-muted">
                    Visible to everyone on Midnight Preprod via block explorers:
                  </p>
                  <ul className="space-y-2 text-xs text-ink-muted list-disc list-inside">
                    <li>Organizer public verification key (`organizer`)</li>
                    <li>Distribution batch identifier (`distributionId`)</li>
                    <li>Total aggregate funds deposited into the vault</li>
                    <li>32-byte opaque allocation commitment hashes</li>
                    <li>Spent nullifiers preventing double-claims</li>
                    <li>Public counter of settled claims</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-sky-100 text-xs text-sky-600 font-semibold">
                  Zero identity or individual compensation leaks
                </div>
              </div>
            </div>

            {/* Carousel Card 2: PRIVATE CLIENT WITNESS */}
            <div className="carousel-item">
              <div className="celo-card p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">🔐</span>
                    <span className="chip-pill bg-sky-100 text-sky-800 text-[11px] font-bold uppercase">
                      Private Witness
                    </span>
                  </div>
                  <h3 className="card-title text-xl">What Remains Shielded</h3>
                  <p className="text-sm text-ink-muted">
                    Stored strictly in local memory on the user’s device:
                  </p>
                  <ul className="space-y-2 text-xs text-ink-muted list-disc list-inside">
                    <li>Recipient private secret passphrases (`recipientSecret`)</li>
                    <li>Individual payment or compensation amounts</li>
                    <li>256-bit cryptographic blinding salts (`allocationSalt`)</li>
                    <li>Private spending keys used for nullifier creation</li>
                    <li>Organizer administrative signing keys</li>
                    <li>Rainbow table and dictionary attack immunity</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-sky-100 text-xs text-sky-600 font-semibold">
                  Never transmitted over network or blockchain
                </div>
              </div>
            </div>

            {/* Carousel Card 3: WHAT YOU PROVE */}
            <div className="carousel-item">
              <div className="celo-card p-6 sm:p-8 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">⚡</span>
                    <span className="chip-pill bg-sky-100 text-sky-800 text-[11px] font-bold uppercase">
                      What You Prove
                    </span>
                  </div>
                  <h3 className="card-title text-xl">Mathematical Proofs</h3>
                  <p className="text-sm text-ink-muted">
                    What Midnight’s ZK-verifier guarantees cryptographically:
                  </p>
                  <ul className="space-y-2 text-xs text-ink-muted list-disc list-inside">
                    <li>Knowledge of a valid tuple in registered commitments</li>
                    <li>Claimant requested payout strictly matches their allocation</li>
                    <li>Nullifier is correctly derived and unspent</li>
                    <li>Double-claim attempts are automatically rejected</li>
                    <li>Zero information revealed about recipient identity</li>
                    <li>Zero information revealed about payment amount</li>
                  </ul>
                </div>
                <div className="pt-4 border-t border-sky-100 text-xs text-sky-600 font-semibold">
                  Full cryptographic verification with zero trust
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. THE ACTUAL DAPP APPLICATION WORKSPACE */}
      <main id="app-workspace" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8 text-center space-y-3">
          <div className="chip-pill text-xs">dApp Workspace</div>
          <h2 className="section-title">
            Treasury management & <span className="celo-emphasis">private</span> claims
          </h2>
          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto">
            Switch between the Organizer Vault Hub to register opaque commitments, the Private Claim Portal to generate
            zero-knowledge proofs, and the Ledger Explorer to audit public vs private states.
          </p>
        </div>

        {children}
      </main>

      {/* 8. FINTECH FOOTER (Multi-column links, explorer, copyright) */}
      <footer className="bg-white border-t border-sky-100 pt-16 pb-12 px-4 sm:px-6 lg:px-8 text-ink">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Col 1: Brand & Summary */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src={logoImg} alt="VaultSplitX Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} className="w-10 h-10 object-contain" />
                <span className="font-extrabold text-2xl tracking-tight text-ink font-sans">
                  VaultSplit<span className="text-sky-600">X</span>
                </span>
              </div>
              <p className="text-sm text-ink-muted max-w-sm leading-relaxed">
                Confidential payment distribution dApp built on Midnight Network using Compact smart contracts and
                client-side zero-knowledge proof synthesis.
              </p>
              <div className="flex items-center gap-2">
                <span className="chip-pill chip-success text-[11px]">
                  Midnight Preprod Live
                </span>
                <span className="chip-pill text-[11px]">
                  Compact v0.23
                </span>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-ink">Product</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li><a href="#app-workspace" className="hover:text-sky-600 transition-colors">Organizer Vault</a></li>
                <li><a href="#app-workspace" className="hover:text-sky-600 transition-colors">Private Claim Portal</a></li>
                <li><a href="#privacy-model" className="hover:text-sky-600 transition-colors">Ledger Audit</a></li>
                <li><a href="#components" className="hover:text-sky-600 transition-colors">Core Components</a></li>
              </ul>
            </div>

            {/* Col 3: Technology */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-ink">Technology</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <a href="https://midnight.network" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    Midnight Network ↗
                  </a>
                </li>
                <li>
                  <a href="https://docs.midnight.network" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    Compact Language ↗
                  </a>
                </li>
                <li>
                  <a href="https://lace.io" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    Lace Midnight Wallet ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://explorer.1am.xyz/contract/ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e?network=preprod"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sky-600 transition-colors"
                  >
                    1AM Preprod Explorer ↗
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Resources */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-ink">Resources</h4>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li>
                  <a href="https://github.com/abantikakundu/vaultSplitX#readme" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    Documentation & Usage ↗
                  </a>
                </li>
                <li>
                  <a href="https://github.com/abantikakundu/vaultSplitX" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    GitHub Source Code ↗
                  </a>
                </li>
                <li>
                  <a href="https://github.com/abantikakundu/vaultSplitX/blob/main/PROPOSAL.md" target="_blank" rel="noreferrer" className="hover:text-sky-600 transition-colors">
                    Midnight Challenge Proposal ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-subtle">
            <div>
              © 2026 VaultSplitX. Built for Midnight Network Builder Challenge.
            </div>
            <div className="flex items-center gap-4 max-w-full">
              <span className="font-mono text-[11px] text-ink-muted break-all text-center sm:text-right">
                Contract: ff4cc6a13213da9997653947d593b1ef3df0a8b7cb4b795457fa38dab610161e
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
