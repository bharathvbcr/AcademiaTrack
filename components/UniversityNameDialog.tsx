import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { MAX_UNIVERSITY_NAME_LENGTH } from '../utils/universityBatch';
import { MaterialIcon, formInputClass, formPrimaryBtnClass, formSecondaryBtnClass } from './ApplicationFormUI';

interface UniversityNameDialogProps {
  isOpen: boolean;
  currentName: string;
  programCount: number;
  onClose: () => void;
  onSubmit: (nextName: string) => void;
}

const UniversityNameDialog: React.FC<UniversityNameDialogProps> = ({
  isOpen,
  currentName,
  programCount,
  onClose,
  onSubmit,
}) => {
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState('');

  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setValue(currentName);
    setError('');
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const displayName = currentName.trim() || 'Untitled university';
  const noun = programCount === 1 ? 'program' : 'programs';

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = value.trim();
    if (!nextName) {
      setError('Enter a university name.');
      inputRef.current?.focus();
      return;
    }
    if (nextName.length > MAX_UNIVERSITY_NAME_LENGTH) {
      setError(`Use ${MAX_UNIVERSITY_NAME_LENGTH} characters or fewer.`);
      inputRef.current?.focus();
      return;
    }
    onSubmit(nextName);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
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
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 bg-[#dc2626]/15">
                  <MaterialIcon name="edit" className="text-2xl text-[#dc2626]" aria-hidden="true" />
                </div>
                <h3 id={titleId} className="text-lg font-semibold text-center text-[#f4f4f5] mb-2">
                  Rename university
                </h3>
                <p className="text-sm text-center text-[#a1a1aa] mb-4">
                  {`This updates ${programCount} ${noun} now called ${displayName}. You can undo with Ctrl+Z.`}
                </p>
                <label htmlFor={inputId} className="block text-xs font-medium text-[#a1a1aa] uppercase mb-1">
                  University name
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  name="universityName"
                  type="text"
                  value={value}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError('');
                  }}
                  className={formInputClass}
                />
                {error && (
                  <p id={errorId} className="mt-2 text-sm text-red-300" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t border-[#27272a]">
                <button type="button" onClick={onClose} className={formSecondaryBtnClass}>
                  Cancel
                </button>
                <button type="submit" className={formPrimaryBtnClass}>
                  Rename
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UniversityNameDialog;
