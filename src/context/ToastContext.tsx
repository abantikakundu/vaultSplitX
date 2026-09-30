import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { formatHumanReadableError } from '../utils/formatError';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  title?: string;
  txHash?: string;
  explorerUrl?: string;
  duration?: number; // Duration in ms. Default: 6000 for standard, 9000 for tx success.
  message?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (errorOrMessage: unknown, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Global dispatcher reference to allow calling toast methods outside of React components
type ToastDispatcher = {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (errorOrMessage: unknown, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

let globalDispatcher: ToastDispatcher | null = null;

export const toast: ToastDispatcher = {
  showToast: (type, message, options) => {
    if (globalDispatcher) {
      return globalDispatcher.showToast(type, message, options);
    }
    return '';
  },
  success: (message, options) => {
    if (globalDispatcher) {
      return globalDispatcher.success(message, options);
    }
    return '';
  },
  error: (errorOrMessage, options) => {
    // Even if global dispatcher is not yet mounted, log error to console as required
    console.error('[VaultSplitX Action Error]:', errorOrMessage);
    if (globalDispatcher) {
      return globalDispatcher.error(errorOrMessage, options);
    }
    return '';
  },
  info: (message, options) => {
    if (globalDispatcher) {
      return globalDispatcher.info(message, options);
    }
    return '';
  },
  dismiss: (id) => {
    globalDispatcher?.dismiss(id);
  },
  clear: () => {
    globalDispatcher?.clear();
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCountRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = `toast-${Date.now()}-${++toastCountRef.current}`;
      const defaultDuration = options?.duration ?? (type === 'success' && options?.txHash ? 9000 : 6000);

      const newToast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        txHash: options?.txHash,
        explorerUrl: options?.explorerUrl,
        duration: defaultDuration,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // Keep at most 5 toasts visible

      return id;
    },
    [],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions): string => {
      return showToast('success', message, {
        title: options?.title || 'Action Succeeded',
        ...options,
      });
    },
    [showToast],
  );

  const error = useCallback(
    (errorOrMessage: unknown, options?: ToastOptions): string => {
      // 1. Log the raw error to the console
      console.error('[VaultSplitX Action Error]:', errorOrMessage);

      // 2. Format a human-readable message instead of the raw exception
      const humanReadable = formatHumanReadableError(errorOrMessage, options?.title);

      return showToast('error', options?.message || humanReadable, {
        title: options?.title || 'Action Failed',
        ...options,
      });
    },
    [showToast],
  );

  const info = useCallback(
    (message: string, options?: ToastOptions): string => {
      return showToast('info', message, {
        title: options?.title || 'Notice',
        ...options,
      });
    },
    [showToast],
  );

  // Wire up global dispatcher
  globalDispatcher = {
    showToast,
    success,
    error,
    info,
    dismiss,
    clear,
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        info,
        dismiss,
        clear,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
