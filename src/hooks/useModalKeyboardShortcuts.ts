import { useEffect, useRef } from 'react';

export interface ModalKeyboardShortcutsConfig {
  onSave?: () => void;
  onSaveAndClose?: () => void;
  onClose?: () => void;
  onDuplicate?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
  hasUnsavedChanges?: boolean;
}

export const useModalKeyboardShortcuts = ({
  onSave,
  onSaveAndClose,
  onClose,
  onDuplicate,
  onCancel,
  enabled = true,
  hasUnsavedChanges = false,
}: ModalKeyboardShortcutsConfig) => {
  const handlersRef = useRef({
    onSave,
    onSaveAndClose,
    onClose,
    onDuplicate,
    onCancel,
    hasUnsavedChanges,
  });

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = {
      onSave,
      onSaveAndClose,
      onClose,
      onDuplicate,
      onCancel,
      hasUnsavedChanges,
    };
  }, [onSave, onSaveAndClose, onClose, onDuplicate, onCancel, hasUnsavedChanges]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { onSave, onSaveAndClose, onClose, onDuplicate, onCancel, hasUnsavedChanges } = handlersRef.current;

      // Cmd/Ctrl+Enter: Save and close
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (onSaveAndClose) {
          onSaveAndClose();
        } else if (onSave) {
          onSave();
          if (onClose) onClose();
        }
        return;
      }

      // Cmd/Ctrl+Shift+S: Save without closing
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        if (onSave) {
          onSave();
        }
        return;
      }

      // Cmd/Ctrl+Shift+D: Duplicate
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (onDuplicate) {
          onDuplicate();
        }
        return;
      }

      // Escape: Close (with confirmation if unsaved changes)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onClose) {
          if (hasUnsavedChanges) {
            // Show confirmation - for now just call onCancel if provided
            if (onCancel) {
              onCancel();
            } else {
              // Default: close anyway (can be enhanced with confirmation modal)
              onClose();
            }
          } else {
            onClose();
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
};
