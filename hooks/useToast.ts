import { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number; // in milliseconds, 0 = don't auto-dismiss
}

interface UseToastReturn {
  toasts: Toast[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    title?: string,
    duration: number = 5000
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      id,
      type,
      message,
      title,
      duration,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-dismiss is owned by the rendered <Toast> component, which schedules
    // (and cleans up) its own timer in a useEffect keyed by duration. Scheduling
    // a second timer here would be a redundant, uncleaned leak.
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
  };
};
