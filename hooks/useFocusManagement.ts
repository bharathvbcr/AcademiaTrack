import React, { useEffect, useRef, RefObject } from 'react';

/**
 * Hook to manage focus within modals and other containers
 * Traps focus within the container and returns focus to trigger element on close
 */
export const useFocusManagement = (
  isOpen: boolean,
  containerRef: RefObject<HTMLElement>,
  triggerRef?: RefObject<HTMLElement>,
  initialFocusRef?: RefObject<HTMLElement>
) => {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Return focus to trigger element when closing
      if (triggerRef?.current) {
        triggerRef.current.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      return;
    }

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusInitial = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      if (containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        if (firstElement) {
          firstElement.focus();
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(focusInitial, 100);

    // Trap focus within container
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !((el as any).disabled) && el.offsetParent !== null);

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, containerRef, triggerRef, initialFocusRef]);
};

/**
 * Hook to add keyboard navigation to lists (arrow keys, Home/End)
 */
export const useListKeyboardNavigation = (
  items: any[],
  onSelect: (index: number) => void,
  containerRef: RefObject<HTMLElement>,
  enabled: boolean = true
) => {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev < items.length - 1 ? prev + 1 : 0;
            onSelect(next);
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => {
            const next = prev > 0 ? prev - 1 : items.length - 1;
            onSelect(next);
            return next;
          });
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          onSelect(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          onSelect(items.length - 1);
          break;
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => {
      containerRef.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [items.length, onSelect, containerRef, enabled]);

  return focusedIndex;
};
