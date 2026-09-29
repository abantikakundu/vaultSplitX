import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowRight,
  Lock,
  ChevronDown,
  EyeOff,
  ShieldCheck,
  Sigma,
  Fingerprint,
  Coins,
  Percent,
  Users,
  Vault,
  FileCheck,
  CheckCircle2,
  KeyRound,
  Globe,
} from 'lucide-react';
import { TiltedCard } from '../components/common/TiltedCard';
import { InfoTooltip } from '../components/common/InfoTooltip';

export const HomePage: React.FC = () => {
  const scrollToPrivacy = () => {
    const el = document.getElementById('privacy-model');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full space-y-20 pb-20">
      {/* 1. HERO COLOR BLOCK */}
      <section className="hero-color-block" aria-labelledby="hero-heading">
        <div className="hero-content-grid">
          {/* Left Text Block */}
          <div>
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" aria-hidden="true" />
              <span>VaultSplitX on Midnight</span>
            </div>

            <h1 id="hero-heading" className="hero-headline">
              Split in secret.
              <span className="hero-headline-italic">Verified in the open.</span>
            </h1>

            <p className="hero-desc">
              Privacy-preserving payment distribution protocol built on Midnight.
              Distribute shared funds without publicly exposing individual payment amounts, recipient identities, or compensation splits.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <Link to="/create" className="btn-hero-solid">
                <span>Create a distribution</span>
                <ArrowUpRight size={16} />
              </Link>

              <button
                onClick={scrollToPrivacy}
                className="btn-hero-outline cursor-pointer"
                aria-label="Scroll to how privacy works"
              >
                <Lock size={15} />
                <span>How privacy works</span>
                <ChevronDown size={15} />
              </button>
            </div>
          </div>

          {/* Right: Cluster of 4 Overlapping Tilted Cards */}
          <div className="hero-cards-cluster" aria-label="Privacy Guarantees Showcase">
            <TiltedCard
              label="Allocation"
              value="Hidden"
              bgClass="card-bg-pink"
              Icon={EyeOff}
              className="cluster-card-1"
              subtext="Confidential amounts"
            />
            <TiltedCard
              label="Proof"
              value="Verified"
              bgClass="card-bg-indigo"
              Icon={ShieldCheck}
              className="cluster-card-2"
              subtext="ZK-circuit validated"
            />
            <TiltedCard
              label="Total"
              value="Accounted"
              bgClass="card-bg-mint"
              Icon={Sigma}
              className="cluster-card-3"
              subtext="Public aggregate pool"
            />
            <TiltedCard
              label="Claim"
              value="Unlinkable"
              bgClass="card-bg-white"
              Icon={Fingerprint}
              className="cluster-card-4"
              subtext="One-way nullifiers"
            />
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS: 3 STEPS WITH ICONS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="how-it-works-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Protocol Workflow
            </div>
            <h2 id="how-it-works-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              How It Works
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Three deterministic stages separating organizer treasury funding from confidential client-side zero-knowledge entitlement claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 01 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-3xl text-sky-400">01</span>
                <div className="w-10 h-10 rounded bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Vault size={20} />
                </div>
              </div>
              <h3 className="font-bold text-lg text-text">
                Organizer deposits funds and sets private allocations
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                The organizer deposits aggregate funds into the smart contract vault <InfoTooltip term="vault" /> and registers opaque 32-byte cryptographic commitments <InfoTooltip term="commitment" /> for each recipient. Individual payment amounts and recipient identities are never stored on the public ledger.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted flex items-center justify-between">
              <span>registerAllocation()</span>
              <span className="text-sky-400">totalVaultFunds</span>
            </div>
          </div>

          {/* Step 02 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-3xl text-pink-400">02</span>
                <div className="w-10 h-10 rounded bg-pink-400/10 border border-pink-400/30 flex items-center justify-center text-pink-400">
                  <KeyRound size={20} />
                </div>
              </div>
              <h3 className="font-bold text-lg text-text">
                Recipients get a private claim key
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Each recipient securely receives their private entitlement secret and unique claim key off-chain. A 256-bit cryptographic blinding salt <InfoTooltip term="salt" /> protects against dictionary attacks and guarantees that only the authorized recipient can construct a valid claim.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted flex items-center justify-between">
              <span>recipientSecret</span>
              <span className="text-pink-400">claimSecret</span>
            </div>
          </div>

          {/* Step 03 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-display font-extrabold text-3xl text-emerald-400">03</span>
                <div className="w-10 h-10 rounded bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <h3 className="font-bold text-lg text-text">
                Recipients claim with a zero-knowledge proof
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                Recipients synthesize a zero-knowledge proof directly in their browser. The Midnight contract verifies entitlement and burns an un-linkable nullifier <InfoTooltip term="nullifier" />, releasing payout funds without disclosing who claimed or what amount was disbursed.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted flex items-center justify-between">
              <span>claimPayout()</span>
              <span className="text-emerald-400">claimedNullifiers</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TWO-COLUMN "PUBLIC VS PRIVATE" CARD BASED ON README PRIVACY MODEL */}
      <section id="privacy-model" className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="privacy-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Cryptographic Boundary
            </div>
            <h2 id="privacy-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              Public vs Private Privacy Model
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Directly enforced by <span className="font-mono text-text">contracts/vaultSplitX.compact</span> on the Midnight Preprod blockchain.
          </p>
        </div>

        {/* Two-Column Card */}
        <div className="sharp-card overflow-hidden">
          {/* Card Top Header */}
          <div className="p-6 md:p-8 bg-surface-hover/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                Midnight Dual-State Ledger Architecture
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-text">
                Public Transparency vs. Private Zero-Knowledge Witness
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-sky-400/10 text-sky-400 border border-sky-400/30">
                Dual-State Compact
              </span>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Column 1: What is PUBLIC */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h4 className="font-display text-xl font-bold text-text">What is PUBLIC</h4>
                    <span className="text-xs text-sky-400 font-mono">On-chain, anyone can see</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-400/10 text-sky-400 border border-sky-400/30 font-mono">
                  On-Chain
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Immutable ledger parameters recorded on the Midnight blockchain, visible to every observer and block explorer:
              </p>

              <ul className="space-y-3.5 text-xs text-muted list-none p-0">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The organizer's public verification key (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">organizer</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The unique distribution batch identifier (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">distributionId</code>) <InfoTooltip term="distribution ID" />
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The total aggregate funds deposited into the vault (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">totalVaultFunds</code>) <InfoTooltip term="vault" />
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The set of 32-byte opaque allocation commitments (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">allocationCommitments</code>) <InfoTooltip term="commitment" />
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The set of spent claim nullifiers used to prevent replay attacks (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">claimedNullifiers</code>) <InfoTooltip term="nullifier" />
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The public counter of successfully settled claims (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">claimedCount</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 mt-0.5 shrink-0" />
                  <span>
                    The open/closed lifecycle status flag (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">isClosed</code>)
                  </span>
                </li>
              </ul>
            </div>

            {/* Column 2: What is PRIVATE */}
            <div className="p-6 md:p-8 space-y-6 border-t md:border-t-0 md:border-l border-border bg-surface/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-pink-400/10 border border-pink-400/30 flex items-center justify-center text-pink-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="font-display text-xl font-bold text-text">What is PRIVATE</h4>
                    <span className="text-xs text-pink-400 font-mono">Private witness, never on-chain</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-pink-400/10 text-pink-400 border border-pink-400/30 font-mono">
                  Off-Chain
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Client-side secrets and witness inputs that are never published to the ledger or revealed to external observers:
              </p>

              <ul className="space-y-3.5 text-xs text-muted list-none p-0">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 mt-0.5 shrink-0" />
                  <span>
                    The recipient's private identity secret (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">recipientSecret</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 mt-0.5 shrink-0" />
                  <span>
                    The individual payment or compensation amount (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">allocatedAmount</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 mt-0.5 shrink-0" />
                  <span>
                    The 256-bit cryptographic blinding salt preventing dictionary and rainbow table attacks (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">allocationSalt</code>) <InfoTooltip term="salt" />
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 mt-0.5 shrink-0" />
                  <span>
                    The participant's private spending key used to construct the nullifier (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">claimSecret</code>)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-pink-400 mt-0.5 shrink-0" />
                  <span>
                    The organizer's administrative signing key (<code className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-border">organizerSecret</code>)
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Card Footer: What the user proves without revealing */}
          <div className="p-6 md:p-8 bg-surface-hover/20 border-t border-border space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck size={16} />
              <span>What the user PROVES without revealing (Zero-Knowledge Proof)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted leading-relaxed">
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    The claimant proves knowledge of a valid <code className="font-mono text-text bg-surface px-1 py-0.5 rounded border border-border">(recipientSecret, allocatedAmount, allocationSalt)</code> tuple whose derived commitment exists in the on-chain <code className="font-mono text-text bg-surface px-1 py-0.5 rounded border border-border">allocationCommitments</code> set.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    The claimant proves that their requested payout matches the exact amount allocated by the organizer.
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    The claimant proves that their generated nullifier is correctly derived and has not already been recorded in <code className="font-mono text-text bg-surface px-1 py-0.5 rounded border border-border">claimedNullifiers</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    Observers learn only that an authorized participant claimed their valid share; no observer can determine who claimed, what amount they received, or link their wallet to any individual allocation commitment.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ALLOCATION RULES (WITH ROADMAP LABELS) */}
      <section className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="allocation-rules-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Distribution Rules
            </div>
            <h2 id="allocation-rules-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              Allocation Models
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Client-side calculation models mapped to opaque on-chain commitments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Rule 1: Fixed Shares */}
          <div className="sharp-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <Coins size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live & Active
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-text">Fixed Shares</h3>
            <p className="text-xs text-muted leading-relaxed">
              Define exact payout quantities in tDUST <InfoTooltip term="tDUST" /> per contributor. Each recipient receives a private blinding salt <InfoTooltip term="salt" /> and derives their opaque commitment <InfoTooltip term="commitment" /> leaf.
            </p>
          </div>

          {/* Rule 2: Percentages */}
          <div className="sharp-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded bg-surface-hover border border-border flex items-center justify-center text-muted">
                <Percent size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-hover text-muted border border-border">
                Roadmap
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-text">Percentage Splits</h3>
            <p className="text-xs text-muted leading-relaxed">
              Proportional distribution of total vault <InfoTooltip term="vault" /> funds based on percentage allocation rules calculated at batch creation time.
            </p>
          </div>

          {/* Rule 3: Contribution-based */}
          <div className="sharp-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded bg-surface-hover border border-border flex items-center justify-center text-muted">
                <Users size={20} />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-surface-hover text-muted border border-border">
                Roadmap
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-text">Contribution Weights</h3>
            <p className="text-xs text-muted leading-relaxed">
              Dynamic compensation weighted by task complexity, hours logged, or governance points, committed privately into Midnight circuits.
            </p>
          </div>
        </div>
      </section>

      {/* 5. USE CASES */}
      <section className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="use-cases-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Applications
            </div>
            <h2 id="use-cases-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              Designed For Real Teams
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Eliminating payroll transparency leaks and wage poaching in decentralized organizations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="sharp-card p-6 space-y-3">
            <Users size={24} className="text-sky-400" />
            <h3 className="font-bold text-base text-text">Contributor Payments</h3>
            <p className="text-xs text-muted leading-relaxed">
              Pay engineers and researchers without exposing individual rates or creating team salary friction.
            </p>
          </div>

          <div className="sharp-card p-6 space-y-3">
            <Vault size={24} className="text-sky-400" />
            <h3 className="font-bold text-base text-text">DAO Treasury Splits</h3>
            <p className="text-xs text-muted leading-relaxed">
              Distribute governance treasury dividends and rewards while preserving participant financial privacy.
            </p>
          </div>

          <div className="sharp-card p-6 space-y-3">
            <FileCheck size={24} className="text-sky-400" />
            <h3 className="font-bold text-base text-text">Freelance Settlements</h3>
            <p className="text-xs text-muted leading-relaxed">
              Settle multi-contractor milestone deliverables without publishing vendor client invoices.
            </p>
          </div>

          <div className="sharp-card p-6 space-y-3">
            <Coins size={24} className="text-sky-400" />
            <h3 className="font-bold text-base text-text">Research Grants</h3>
            <p className="text-xs text-muted leading-relaxed">
              Disburse competitive research funding privately with aggregate public accounting verification.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CLOSING CTA BLOCK IN SKY-400 */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="bg-sky-400 text-ink p-10 sm:p-14 border border-ink shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="text-xs uppercase tracking-widest font-extrabold text-ink">
              Ready to Distribute?
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              Start your confidential payment distribution.
            </h2>
            <p className="text-sm font-medium text-ink/80 leading-relaxed">
              Deploy a new distribution batch or privately claim your share with client-side zero-knowledge proofs.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <Link to="/create" className="btn-hero-solid">
              <span>Create Distribution</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/claim" className="btn-hero-outline">
              <Lock size={15} />
              <span>Claim Payout</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
