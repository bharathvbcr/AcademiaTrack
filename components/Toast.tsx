import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast as ToastType } from '../hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'notifications';
    }
  };

  // One entry per type: distinct, accessible hues on the dark surface. Each pairs
  // a translucent fill + border with a matching icon colour so success/error/
  // warning/info/default are all visually distinguishable (previously info and
  // the default both rendered as the same crimson).
  const styles: Record<string, { container: string; icon: string }> = {
    success: { container: 'bg-green-500/15 border-green-500/30 text-green-200', icon: 'text-green-400' },
    error: { container: 'bg-red-500/15 border-red-500/30 text-red-200', icon: 'text-red-400' },
    warning: { container: 'bg-amber-500/15 border-amber-500/30 text-amber-200', icon: 'text-amber-400' },
    info: { container: 'bg-blue-500/15 border-blue-500/30 text-blue-200', icon: 'text-blue-400' },
    default: { container: 'bg-zinc-800/80 border-zinc-700 text-zinc-200', icon: 'text-zinc-400' },
  };
  const style = styles[toast.type] || styles.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md liquid-glass ${style.container}`}
      role="alert"
      aria-live="polite"
    >
      <span className={`material-symbols-outlined flex-shrink-0 ${style.icon}`}>
        {getIcon()}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>
        )}
        <p className="text-sm">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
        aria-label={`Dismiss ${toast.type} notification: ${toast.message}`}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
      </button>
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div 
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:top-16"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onRemove={onRemove} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
