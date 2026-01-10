import { useEffect } from 'react';

/**
 * Hook to lock body scroll when a component is mounted (e.g. a modal)
 * @param isLocked - Whether the scroll should be locked (defaults to true if hook is called, but can be toggled)
 */
export const useLockBodyScroll = (isLocked: boolean = true) => {
    useEffect(() => {
        if (!isLocked) return;

        // Get original overflow style
        const originalStyle = window.getComputedStyle(document.body).overflow;

        // Prevent scrolling on mount
        document.body.style.overflow = 'hidden';

        // Re-enable scrolling on unmount
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isLocked]);
};
