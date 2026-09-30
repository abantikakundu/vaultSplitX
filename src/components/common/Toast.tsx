import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useToast, ToastItem } from '../../context/ToastContext';

export function buildExplorerUrl(txHash?: string, customUrl?: string): string {
  if (customUrl) return customUrl;
  if (!txHash) return 'https://explorer.1am.xyz/?network=preprod';
  const clean = txHash.replace(/^0x/, '');
  return `https://explorer.1am.xyz/tx/${clean}?network=preprod`;
}

function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => fallbackCopy(text),
    );
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text: string): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const [copiedTx, setCopiedTx] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(toast.duration ?? 6000);
  const timerStartRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss with pause-on-hover support
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerStartRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingTime);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.duration, onDismiss, isPaused, remainingTime]);

  const handleMouseEnter = () => {
    if (!toast.duration || toast.duration <= 0) return;
    const elapsed = Date.now() - timerStartRef.current;
    setRemainingTime((prev) => Math.max(prev - elapsed, 1000));
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleCopyTx = async () => {
    if (!toast.txHash) return;
    const clean = toast.txHash.replace(/^0x/, '');
    const fullHash = `0x${clean}`;
    const ok = await copyToClipboard(fullHash);
    if (ok) {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
  };

  const cleanTxHash = toast.txHash ? toast.txHash.replace(/^0x/, '') : '';
  const explorerUrl = buildExplorerUrl(toast.txHash, toast.explorerUrl);

  // Style variations based on type
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const borderColor = isSuccess
    ? 'border-emerald-500/40'
    : isError
    ? 'border-rose-500/40'
    : 'border-sky-500/40';

  const glowShadow = isSuccess
    ? 'shadow-emerald-950/40'
    : isError
    ? 'shadow-rose-950/40'
    : 'shadow-sky-950/40';

  const iconColor = isSuccess
    ? 'text-emerald-400'
    : isError
    ? 'text-rose-400'
    : 'text-sky-400';

  const IconComponent = isSuccess ? CheckCircle2 : isError ? AlertCircle : Info;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid={`toast-${toast.type}`}
      className={`w-full max-w-sm sm:max-w-md bg-surface/95 backdrop-blur-md border ${borderColor} rounded-lg shadow-xl ${glowShadow} p-4 transition-all duration-200 animate-in fade-in slide-in-from-top-2 relative overflow-hidden`}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div className={`shrink-0 mt-0.5 ${iconColor}`} data-testid={`toast-icon-${toast.type}`}>
          <IconComponent size={18} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2 space-y-1">
          {toast.title && (
            <h4
              data-testid="toast-title"
              className="text-xs uppercase font-extrabold tracking-wider text-text"
            >
              {toast.title}
            </h4>
          )}
          <p
            data-testid="toast-message"
            className="text-xs text-muted leading-relaxed break-words"
          >
            {toast.message}
          </p>

          {/* Success On-Chain Transaction Details (txHash, copy button, explorer link) */}
          {toast.txHash && (
            <div
              data-testid="toast-tx-section"
              className="mt-2.5 pt-2 border-t border-border/80 flex flex-col gap-2 font-mono text-[11px]"
            >
              <div className="flex items-center justify-between text-muted text-[10px] uppercase font-sans font-semibold tracking-wider">
                <span>Transaction Hash</span>
                {copiedTx && (
                  <span
                    data-testid="toast-tx-copied-indicator"
                    className="text-emerald-400 font-bold"
                  >
                    Copied!
                  </span>
                )}
              </div>

              {/* Hash Display & Copy Button */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-bg-elev/90 border border-border">
                <span
                  data-testid="toast-tx-hash"
                  className="truncate text-text font-mono text-[11px] selection:bg-sky-500/20"
                  title={`0x${cleanTxHash}`}
                >
                  0x{cleanTxHash.slice(0, 8)}...{cleanTxHash.slice(-6)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyTx}
                  data-testid="toast-tx-copy-btn"
                  aria-label="Copy transaction hash"
                  title="Copy full transaction hash to clipboard"
                  className="p-1 rounded hover:bg-surface text-muted hover:text-text cursor-pointer transition-colors shrink-0"
                >
                  {copiedTx ? (
                    <Check size={13} className="text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>

              {/* View on explorer link */}
              <div className="flex items-center justify-end pt-0.5">
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="toast-explorer-link"
                  className="text-sky-400 hover:text-sky-300 text-xs inline-flex items-center gap-1 font-sans font-semibold hover:underline"
                >
                  <span>View on explorer</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* If no txHash was provided, but an explorer URL is explicitly attached to a success toast */}
          {!toast.txHash && toast.explorerUrl && (
            <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-end">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="toast-explorer-link"
                className="text-sky-400 hover:text-sky-300 text-xs inline-flex items-center gap-1 font-sans font-semibold hover:underline"
              >
                <span>View on explorer</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          data-testid="toast-close-btn"
          aria-label="Dismiss notification"
          className="text-muted hover:text-text p-1 rounded hover:bg-surface transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastCard toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </aside>
  );
};
