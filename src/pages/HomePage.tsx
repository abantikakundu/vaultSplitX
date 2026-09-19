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
} from 'lucide-react';
import { TiltedCard } from '../components/common/TiltedCard';

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

      {/* 2. HOW IT WORKS: 4 NUMBERED STEPS */}
      <section className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="how-it-works-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Protocol Workflow
            </div>
            <h2 id="how-it-works-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              How VaultSplitX Operates
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Four deterministic stages separating organizer treasury funding from client-side zero-knowledge entitlement claims.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 01 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="font-display font-extrabold text-3xl text-sky-400">01</span>
              <h3 className="font-bold text-lg text-text">Create Distribution</h3>
              <p className="text-sm text-muted leading-relaxed">
                The organizer registers opaque 32-byte cryptographic commitments for each recipient on the Midnight ledger.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted">
              registerAllocation()
            </div>
          </div>

          {/* Step 02 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="font-display font-extrabold text-3xl text-sky-400">02</span>
              <h3 className="font-bold text-lg text-text">Fund the Vault</h3>
              <p className="text-sm text-muted leading-relaxed">
                Aggregate distribution funds are locked in the smart contract vault. Only the total pool balance is visible on-chain.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted">
              totalVaultFunds: Uint64
            </div>
          </div>

          {/* Step 03 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="font-display font-extrabold text-3xl text-sky-400">03</span>
              <h3 className="font-bold text-lg text-text">Recipients Claim Privately</h3>
              <p className="text-sm text-muted leading-relaxed">
                Each participant synthesizes a ZK proof in their browser, proving entitlement without disclosing their identity or amount.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted">
              claimPayout(distId)
            </div>
          </div>

          {/* Step 04 */}
          <div className="sharp-card p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="font-display font-extrabold text-3xl text-sky-400">04</span>
              <h3 className="font-bold text-lg text-text">Anyone Verifies</h3>
              <p className="text-sm text-muted leading-relaxed">
                Observers verify the proof validity and spent nullifier to ensure accounting consistency and prevent double claims.
              </p>
            </div>
            <div className="pt-4 border-t border-border text-xs font-mono text-muted">
              claimedNullifiers.member()
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIVACY MODEL (3 SHARP CARDS) */}
      <section id="privacy-model" className="max-w-7xl mx-auto px-6 space-y-12" aria-labelledby="privacy-heading">
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest font-bold text-sky-400 mb-2">
              Cryptographic Boundary
            </div>
            <h2 id="privacy-heading" className="font-display text-3xl sm:text-4xl font-extrabold text-text tracking-tight">
              Dual-State Privacy Model
            </h2>
          </div>
          <p className="text-muted text-sm max-w-md">
            Directly enforced by <span className="font-mono text-text">contracts/vaultSplitX.compact</span> on the Midnight Preprod blockchain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Public on-chain */}
          <div className="sharp-card p-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">01 / Public</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-400/10 text-sky-400 border border-sky-400/30">
                On-Chain Ledger
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-text">Public On-Chain</h3>
              <p className="text-xs text-muted mt-1">
                Visible to every observer and block explorer:
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-muted list-none p-0">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Organizer public verification key (<code className="font-mono text-text">organizer</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Unique distribution batch ID (<code className="font-mono text-text">distributionId</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Total aggregate funds locked in the vault (<code className="font-mono text-text">totalVaultFunds</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Set of 32-byte opaque allocation commitments (<code className="font-mono text-text">allocationCommitments</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Set of spent claim nullifiers (<code className="font-mono text-text">claimedNullifiers</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Settled claim counter & distribution lifecycle status</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Private Witness */}
          <div className="sharp-card p-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 font-mono">02 / Private</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-pink-400/10 text-pink-400 border border-pink-400/30">
                Client Witness
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-text">Private Witness</h3>
              <p className="text-xs text-muted mt-1">
                Client-side secrets never written to the ledger:
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-muted list-none p-0">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Participant private entitlement key (<code className="font-mono text-text">recipientSecret</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Individual payment amount (<code className="font-mono text-text">allocatedAmount</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>256-bit cryptographic blinding salt (<code className="font-mono text-text">allocationSalt</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Claimant private spending key (<code className="font-mono text-text">claimSecret</code>)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Organizer administrative signing key (<code className="font-mono text-text">organizerSecret</code>)</span>
              </li>
            </ul>
          </div>

          {/* Card 3: What You Prove */}
          <div className="sharp-card p-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">03 / Proof</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                Zero-Knowledge
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-text">What You Prove</h3>
              <p className="text-xs text-muted mt-1">
                Zero information revealed to the network:
              </p>
            </div>

            <ul className="space-y-2.5 text-xs text-muted list-none p-0">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>Knowledge of valid tuple whose commitment exists in <code className="font-mono text-text">allocationCommitments</code></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>Derived nullifier is correct for the commitment and unspent</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>Double-claiming is cryptographically impossible</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <span>No observer can identify which recipient claimed or what amount was disbursed</span>
              </li>
            </ul>
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
              Define exact payout quantities in tDUST per contributor. Each recipient receives a private blinding salt and derives their opaque commitment leaf.
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
              Proportional distribution of total vault funds based on percentage allocation rules calculated at batch creation time.
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
