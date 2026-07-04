import React from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialIcon, formPrimaryBtnClass, formSecondaryBtnClass } from './ApplicationFormUI';

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
  useEscapeKey(isOpen, onClose);
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
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${isDanger ? 'bg-red-500/20' : 'bg-[#dc2626]/15'}`}>
                <MaterialIcon name={isDanger ? 'warning' : 'info'} className={`text-2xl ${isDanger ? 'text-red-400' : 'text-[#dc2626]'}`} aria-hidden />
              </div>

              <h3 className="text-lg font-semibold text-center text-[#f4f4f5] mb-2">
                {title}
              </h3>
              <p className="text-sm text-center text-[#a1a1aa]">
                {message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#27272a]">
              <button
                type="button"
                onClick={onClose}
                className={formSecondaryBtnClass}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => { onConfirm(); onClose(); }}
                className={`${formPrimaryBtnClass} ${isDanger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600' : ''}`}
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
