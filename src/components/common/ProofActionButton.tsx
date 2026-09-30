import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export const ZK_PROVING_MESSAGE =
  "Generating zero-knowledge proof… this can take up to a minute. Please don't close this tab.";

export interface UseProofActionResult<T = void> {
  isProcessing: boolean;
  elapsedSeconds: number;
  executeAction: (actionFn: () => Promise<T>) => Promise<T | undefined>;
  setIsProcessing: (val: boolean) => void;
  resetTimer: () => void;
}

/**
 * Custom hook to manage proof/transaction action lifecycle:
 * - Prevents double submits using synchronous ref locking
 * - Measures elapsed seconds with a 1-second interval
 * - Manages isProcessing state safely
 */
export function useProofAction<T = void>(): UseProofActionResult<T> {
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(0);
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const resetTimer = useCallback(() => {
    setElapsedSeconds(0);
  }, []);

  const executeAction = useCallback(
    async (actionFn: () => Promise<T>): Promise<T | undefined> => {
      // Synchronously check lock to immediately block rapid double submits
      if (isLockedRef.current) {
        console.warn('Action blocked: transaction or proof generation already in progress');
        return undefined;
      }

      isLockedRef.current = true;
      setIsProcessing(true);

      try {
        return await actionFn();
      } finally {
        isLockedRef.current = false;
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    isProcessing,
    elapsedSeconds,
    executeAction,
    setIsProcessing,
    resetTimer,
  };
}

export interface ProofActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isProcessing: boolean;
  elapsedSeconds?: number;
  children: React.ReactNode;
  spinnerSize?: number;
}

/**
 * Action button that:
 * 1. Disables itself when isProcessing is true
 * 2. Displays an animated spinner
 * 3. Displays the exact text: "Generating zero-knowledge proof… this can take up to a minute. Please don't close this tab."
 * 4. Displays elapsed seconds (e.g. "(12s)")
 * 5. Prevents double submits via disabled attribute and click event interception
 */
export const ProofActionButton: React.FC<ProofActionButtonProps> = ({
  isProcessing,
  elapsedSeconds = 0,
  children,
  disabled,
  className = '',
  spinnerSize = 16,
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled || isProcessing}
      onClick={handleClick}
      aria-busy={isProcessing}
      className={`min-h-[44px] ${className} ${
        isProcessing ? '!whitespace-normal text-center cursor-not-allowed opacity-90' : ''
      }`}
    >
      {isProcessing ? (
        <span className="inline-flex items-center justify-center gap-2 flex-wrap text-center py-0.5">
          <Loader2
            size={spinnerSize}
            className="animate-spin shrink-0 text-current"
            data-testid="zk-proving-spinner"
            aria-hidden="true"
          />
          <span data-testid="zk-proving-message">{ZK_PROVING_MESSAGE}</span>
          <span
            data-testid="zk-elapsed-seconds"
            className="font-mono font-semibold whitespace-nowrap"
          >
            ({elapsedSeconds}s)
          </span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
