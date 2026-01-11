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

  const getColorClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[rgba(76,175,80,0.2)] border-[#4CAF50]/40 text-[#C8E6C9] backdrop-blur-sm';
      case 'error':
        return 'bg-[rgba(192,48,80,0.3)] border-[#C03050]/50 text-[#FFCDD2] backdrop-blur-sm';
      case 'warning':
        return 'bg-[rgba(255,193,7,0.25)] border-[#FFC107]/40 text-[#FFF9C4] backdrop-blur-sm';
      case 'info':
        return 'bg-[rgba(192,48,80,0.25)] border-[#E8B4B8]/40 text-[#F5D7DA] backdrop-blur-sm';
      default:
        return 'bg-[rgba(192,48,80,0.15)] border-[#E8B4B8]/30 text-[#F5D7DA] backdrop-blur-sm';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md liquid-glass ${getColorClasses()}`}
      role="alert"
      aria-live="polite"
    >
      <span className={`material-symbols-outlined flex-shrink-0 ${toast.type === 'success' ? 'text-[#4CAF50]' : toast.type === 'error' ? 'text-[#C03050]' : toast.type === 'warning' ? 'text-[#FFC107]' : 'text-[#E8B4B8]'}`}>
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
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
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
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
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
