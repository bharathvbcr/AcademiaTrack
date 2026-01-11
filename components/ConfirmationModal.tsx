import React from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
}) => {
  useLockBodyScroll(isOpen);
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 liquid-glass-modal"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative liquid-glass-modal-content rounded-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${isDanger ? 'bg-[rgba(224,48,48,0.2)]' : 'bg-[rgba(192,48,80,0.2)]'} mb-4`}>
                <span className={`material-symbols-outlined text-2xl ${isDanger ? 'text-[#E03030]' : 'text-[#C03050]'}`}>
                  {isDanger ? 'warning' : 'info'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-center text-[#F5D7DA] mb-2">
                {title}
              </h3>
              <p className="text-sm text-center text-[#E8B4B8]/70">
                {message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E8B4B8]/30">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#F5D7DA] liquid-glass border border-[#E8B4B8]/30 rounded-lg hover:bg-[rgba(192,48,80,0.25)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E8B4B8] transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => { onConfirm(); onClose(); }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${isDanger
                    ? 'bg-[#E03030] hover:bg-[#C03050] focus:ring-[#E03030]'
                    : 'bg-[#C03050] hover:bg-[#E03030] focus:ring-[#C03050]'
                  }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
