import React, { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, X } from 'lucide-react';

export type TechnicalTermKey =
  | 'commitment'
  | 'nullifier'
  | 'salt'
  | 'tDUST'
  | 'tdust'
  | 'vault'
  | 'distributionId'
  | 'distribution ID'
  | string;

export interface TermDefinition {
  title: string;
  category: string;
  explanation: string;
}

/**
 * Technical terms glossary for VaultSplitX on Midnight
 * Every definition is strictly a single, clear, plain-English sentence.
 */
export const TECHNICAL_TERMS: Record<string, TermDefinition> = {
  commitment: {
    title: 'Commitment',
    category: 'ZK Privacy',
    explanation:
      'A cryptographic fingerprint of an allocation that hides recipient details and payment amounts on-chain until claimed.',
  },
  nullifier: {
    title: 'Nullifier',
    category: 'Anti-Double-Spend',
    explanation:
      'A unique single-use cryptographic token published when claiming funds to prevent double-spending without revealing recipient identity.',
  },
  salt: {
    title: 'Blinding Salt',
    category: 'Entropy',
    explanation:
      'A secret random 256-bit value blended with allocation data to prevent outsiders from guessing or reverse-engineering private payment details.',
  },
  blindingsalt: {
    title: 'Blinding Salt',
    category: 'Entropy',
    explanation:
      'A secret random 256-bit value blended with allocation data to prevent outsiders from guessing or reverse-engineering private payment details.',
  },
  tdust: {
    title: 'tDUST',
    category: 'Midnight Token',
    explanation:
      'The native shielded testnet token on Midnight used for transaction gas fees and confidential value transfers.',
  },
  vault: {
    title: 'Vault',
    category: 'Smart Contract',
    explanation:
      'A smart contract pool that securely locks distribution funds on Midnight until verified by zero-knowledge proofs.',
  },
  distributionid: {
    title: 'Distribution ID',
    category: 'Protocol Batch',
    explanation:
      'A unique 32-byte identifier linking a specific batch of payout allocations to its on-chain smart contract parameters.',
  },
  distributionbatchid: {
    title: 'Distribution ID',
    category: 'Protocol Batch',
    explanation:
      'A unique 32-byte identifier linking a specific batch of payout allocations to its on-chain smart contract parameters.',
  },
};

/**
 * Normalizes input key to match dictionary regardless of case, hyphens, or spacing
 */
export function normalizeTermKey(key?: string): string {
  if (!key) return '';
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves the definition for a given technical term
 */
export function getTermDefinition(term?: string): TermDefinition | null {
  const normalized = normalizeTermKey(term);
  return TECHNICAL_TERMS[normalized] || null;
}

export interface InfoTooltipProps {
  /** Technical term key (commitment, nullifier, salt, tDUST, vault, distribution ID) */
  term?: TechnicalTermKey;
  /** Custom title override */
  title?: string;
  /** Custom one-sentence plain-English explanation override */
  explanation?: string;
  /** Optional wrapped content. If omitted, an inline info icon button is rendered. */
  children?: React.ReactNode;
  /** Additional CSS class names for the trigger wrapper */
  className?: string;
  /** Preferred placement side */
  side?: 'top' | 'bottom';
  /** Size of info icon in pixels (defaults to 13) */
  iconSize?: number;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  term,
  title: customTitle,
  explanation: customExplanation,
  children,
  className = '',
  side = 'top',
  iconSize = 13,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean; width: number }>({
    top: 0,
    left: 0,
    placeAbove: true,
    width: 280,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const termDef = getTermDefinition(term);
  const displayTitle = customTitle || termDef?.title || (term ? String(term) : 'Information');
  const displayCategory = termDef?.category || 'Glossary';
  const displayExplanation =
    customExplanation ||
    termDef?.explanation ||
    'Zero-knowledge smart contract protocol parameter on Midnight.';

  // Calculate clamped viewport coordinates for tooltip floating panel
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Responsive width clamped to screen size
    const tooltipWidth = Math.min(290, Math.max(220, viewportWidth - 24));
    
    // Horizontal centering with 12px margin from viewport edges
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    if (left < 12) left = 12;
    if (left + tooltipWidth > viewportWidth - 12) {
      left = viewportWidth - tooltipWidth - 12;
    }

    // Vertical placement: default above trigger unless too close to top
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const placeAbove = side === 'top' ? spaceAbove >= 120 : spaceBelow < 120;

    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({
      top,
      left,
      placeAbove,
      width: tooltipWidth,
    });
  }, [side]);

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isOpen) {
        handleClose();
      } else {
        handleOpen();
      }
    },
    [isOpen, handleClose, handleOpen]
  );

  // Recalculate position on resize and scroll when opened
  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition, { passive: true });
    window.addEventListener('scroll', handleReposition, { passive: true });

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition);
    };
  }, [isOpen, updatePosition]);

  // Close on outside tap or click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        handleClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [isOpen, handleClose]);

  // Keyboard accessibility: Escape to close
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      triggerRef.current?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle(e as unknown as React.MouseEvent);
    }
  };

  // Desktop hover with short leave delay to allow moving into tooltip
  const handleMouseEnter = () => {
    // Only open on hover if primary input device is a pointer with hover support (not pure touch)
    if (window.matchMedia('(hover: hover)').matches) {
      handleOpen();
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: hover)').matches) {
      closeTimeoutRef.current = setTimeout(() => {
        handleClose();
      }, 180);
    }
  };

  return (
    <span className={`inline-flex items-center align-baseline gap-1 ${className}`}>
      {children}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-label={`Definition of ${displayTitle}: ${displayExplanation}`}
        title={`Learn about ${displayTitle}`}
        className="relative inline-flex items-center justify-center text-muted hover:text-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-full transition-colors cursor-pointer select-none align-middle p-0.5 before:content-[''] before:absolute before:-inset-2 before:rounded-full"
        style={{
          touchAction: 'manipulation',
          lineHeight: 1,
        }}
      >
        <Info size={iconSize} aria-hidden="true" className="shrink-0" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            aria-live="polite"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[99999] p-3 rounded-lg border bg-surface text-text shadow-2xl transition-opacity animate-in fade-in zoom-in-95 duration-150 select-text"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border)',
            }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-display font-bold text-xs text-text truncate">
                  {displayTitle}
                </span>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400 border border-sky-400/20 shrink-0">
                  {displayCategory}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close tooltip"
                className="p-1 -mr-1 text-muted hover:text-text rounded transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            {/* One-sentence plain-English explanation */}
            <p className="text-[11px] leading-relaxed text-muted font-sans font-normal m-0">
              {displayExplanation}
            </p>
          </div>,
          document.body
        )}
    </span>
  );
};
