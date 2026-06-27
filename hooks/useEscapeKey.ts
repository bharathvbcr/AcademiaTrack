import { useEffect, useRef } from 'react';

/**
 * Closes the topmost open modal when the user presses Escape.
 *
 * A single document-level listener is shared across every consumer and
 * dispatches to a stack of open modals, so pressing Escape only dismisses the
 * modal that is currently on top (e.g. a confirmation dialog layered over
 * another modal) instead of every open modal at once.
 */

type CloseHandler = () => void;

const handlerStack: CloseHandler[] = [];
let listenerInstalled = false;

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  const top = handlerStack[handlerStack.length - 1];
  if (!top) return;
  event.preventDefault();
  event.stopPropagation();
  top();
}

function ensureListener() {
  if (listenerInstalled || typeof document === 'undefined') return;
  document.addEventListener('keydown', handleKeyDown);
  listenerInstalled = true;
}

export function useEscapeKey(isOpen: boolean, onClose: () => void): void {
  // Keep the latest onClose without re-subscribing on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    ensureListener();

    const handler: CloseHandler = () => onCloseRef.current();
    handlerStack.push(handler);

    return () => {
      const index = handlerStack.lastIndexOf(handler);
      if (index !== -1) handlerStack.splice(index, 1);
    };
  }, [isOpen]);
}
