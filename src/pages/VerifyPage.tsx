import React, { useState } from 'react';
import {
  Check,
  Lock,
  Copy,
  ExternalLink,
  ShieldCheck,
  EyeOff,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { NETWORK_CONFIG } from '../utils/config';

export const VerifyPage: React.FC = () => {
  const { vaultState } = useVault();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const organizerKey = vaultState?.organizerKey || '';
  const distId = vaultState?.distributionId || '';
  const totalFunds = vaultState?.totalVaultFunds ?? 0n;
  const commitments = vaultState?.commitments || [];
  const nullifiers = vaultState?.claimedNullifiers || [];
  const claimedCount = vaultState?.claimedCount || 0;
  const isClosed = vaultState?.isClosed || false;

  return (
    <div className="w-full pb-24 space-y-12">
      {/* 1. HEADER BLOCK */}
      <section className="bg-bg-elev border-b border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="text-xs uppercase font-extrabold tracking-widest text-sky-400">
              Public Verification & Audit
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight">
              Independent on-chain verification.
            </h1>

            <p className="text-sm text-muted max-w-lg leading-relaxed">
              Anyone can independently verify that total locked vault funds match settled claims and that zero duplicate payouts occur—all without accessing private recipient records.
            </p>
          </div>

          {/* Quick Explorer Link Chip */}
          <div className="flex items-center gap-3">
            <a
              href={NETWORK_CONFIG.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-pill-outline text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <span>Explore Preprod Contract</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </section>

      {/* 2. PUBLIC LEDGER STATE TABLE */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-2xl font-bold text-text">On-Chain Ledger Parameters</h2>
          <p className="text-xs text-muted mt-1">
            Real parameters exposed by the Midnight dual-state smart contract. Observers see these exact values.
          </p>
        </div>

        <div className="sharp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-hover border-b border-border text-muted uppercase tracking-wider font-sans text-[11px]">
                <tr>
                  <th className="py-3 px-5">State Variable</th>
                  <th className="py-3 px-5">Compact Type</th>
                  <th className="py-3 px-5">Current Ledger Value</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* 1. Organizer Key */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Organizer Key</td>
                  <td className="py-3.5 px-5 text-muted">Bytes&lt;32&gt;</td>
                  <td className="py-3.5 px-5 text-text break-all max-w-xs">{organizerKey}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleCopy(organizerKey, 'organizer')}
                      className="p-1.5 rounded hover:bg-surface text-muted hover:text-text cursor-pointer border border-border"
                      title="Copy organizer key"
                    >
                      {copiedKey === 'organizer' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </td>
                </tr>

                {/* 2. Distribution ID */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Distribution ID</td>
                  <td className="py-3.5 px-5 text-muted">Bytes&lt;32&gt;</td>
                  <td className="py-3.5 px-5 text-text break-all max-w-xs">{distId}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleCopy(distId, 'distId')}
                      className="p-1.5 rounded hover:bg-surface text-muted hover:text-text cursor-pointer border border-border"
                      title="Copy distribution ID"
                    >
                      {copiedKey === 'distId' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </td>
                </tr>

                {/* 3. Total Vault Funds */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Total Vault Funds</td>
                  <td className="py-3.5 px-5 text-muted">Uint&lt;64&gt;</td>
                  <td className="py-3.5 px-5 font-bold text-sky-400 text-sm font-mono">
                    {Number(totalFunds).toLocaleString()} tDUST
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleCopy(totalFunds.toString(), 'funds')}
                      className="p-1.5 rounded hover:bg-surface text-muted hover:text-text cursor-pointer border border-border"
                    >
                      {copiedKey === 'funds' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </td>
                </tr>

                {/* 4. Commitments Count */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Commitments Count</td>
                  <td className="py-3.5 px-5 text-muted">Set&lt;Bytes&lt;32&gt;&gt;.size</td>
                  <td className="py-3.5 px-5 text-text">{commitments.length} allocation leaves</td>
                  <td className="py-3.5 px-5 text-right font-sans text-[11px] text-muted">Read-only</td>
                </tr>

                {/* 5. Claimed Count */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Claimed Counter</td>
                  <td className="py-3.5 px-5 text-muted">Counter</td>
                  <td className="py-3.5 px-5 font-bold text-emerald-400">{claimedCount} settled</td>
                  <td className="py-3.5 px-5 text-right font-sans text-[11px] text-muted">Read-only</td>
                </tr>

                {/* 6. Lifecycle Status */}
                <tr className="hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3.5 px-5 font-bold font-sans text-text">Distribution Lifecycle</td>
                  <td className="py-3.5 px-5 text-muted">Boolean</td>
                  <td className="py-3.5 px-5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-sans border ${
                        isClosed
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isClosed ? 'Closed' : 'Active / Open'}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans text-[11px] text-muted">Read-only</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. DUAL COMPARISON: WHAT IS VERIFIABLE VS WHAT STAYS PRIVATE */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="font-display text-2xl font-bold text-text">Auditor Privacy Verification</h2>
          <p className="text-xs text-muted mt-1">
            Compare public cryptographic proofs against confidential client witnesses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Col 1: What Anyone Can Verify */}
          <div className="sharp-card p-7 space-y-4">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>What Anyone Can Independently Verify</span>
            </div>

            <ul className="space-y-3 text-xs text-muted list-none p-0">
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>The aggregate vault deposit equals the sum of authorized distribution amounts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Every claim transaction provides a mathematically valid ZK-SNARK proof.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>Each spent nullifier is unique, strictly preventing double-claiming or replay.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check size={14} className="text-sky-400 mt-0.5 shrink-0" />
                <span>The organizer cannot tamper with, redirect, or claw back registered shares after deployment.</span>
              </li>
            </ul>
          </div>

          {/* Col 2: What Stays Private */}
          <div className="sharp-card p-7 space-y-4">
            <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
              <Lock size={18} />
              <span>What Remains Cryptographically Secret</span>
            </div>

            <ul className="space-y-3 text-xs text-muted list-none p-0">
              <li className="flex items-start gap-2.5">
                <EyeOff size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Individual payment and compensation amounts paid to each recipient.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <EyeOff size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>The link between a participant's wallet address and their allocation commitment.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <EyeOff size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Recipient private seed passphrases and 256-bit blinding salts.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <EyeOff size={14} className="text-pink-400 mt-0.5 shrink-0" />
                <span>Which commitment was settled by which public nullifier transaction.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. ON-CHAIN COMMITMENT LEAF & NULLIFIER LISTS */}
      <section className="max-w-7xl mx-auto px-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Commitments List */}
          <div className="sharp-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-text">Registered Commitments Set</h3>
                <span className="text-[11px] text-muted">Opaque 32-byte cryptographic hashes</span>
              </div>
              <span className="font-mono text-xs text-sky-400 font-bold">
                {commitments.length} total
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {commitments.map((comm, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-surface-hover border border-border rounded flex items-center justify-between font-mono text-[11px] text-muted hover:text-text transition-colors"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-sky-400 text-[10px]">[{idx + 1}]</span>
                    <span className="truncate">{comm}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(comm, `comm-${idx}`)}
                    className="p-1 rounded hover:bg-surface text-muted hover:text-text cursor-pointer shrink-0"
                    title="Copy commitment"
                  >
                    {copiedKey === `comm-${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Nullifiers List */}
          <div className="sharp-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-text">Spent Nullifiers Set</h3>
                <span className="text-[11px] text-muted">Cryptographic markers preventing double claims</span>
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold">
                {nullifiers.length} spent
              </span>
            </div>

            {nullifiers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted italic font-sans">
                No claim nullifiers spent yet. Allocations are awaiting recipient proof synthesis.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {nullifiers.map((nullifier, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded flex items-center justify-between font-mono text-[11px] text-emerald-400"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <Check size={12} className="shrink-0" />
                      <span className="truncate">{nullifier}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(nullifier, `null-${idx}`)}
                      className="p-1 rounded hover:bg-surface text-muted hover:text-text cursor-pointer shrink-0"
                      title="Copy nullifier"
                    >
                      {copiedKey === `null-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
