import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'bottom',
    delay = 0.2
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = rect.top - 8;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 8;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 8;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 8;
                    break;
            }

            setCoords({ top, left });
        }
    };

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    const getMotionPosition = () => {
        switch (position) {
            case 'top': return { x: '-50%', y: '-100%' };
            case 'bottom': return { x: '-50%', y: 0 };
            case 'left': return { x: '-100%', y: '-50%' };
            case 'right': return { x: 0, y: '-50%' };
        }
    };

    const getArrowClass = () => {
        switch (position) {
            case 'top': return 'bottom-[-4px] left-1/2 -translate-x-1/2';
            case 'bottom': return 'top-[-4px] left-1/2 -translate-x-1/2';
            case 'left': return 'right-[-4px] top-1/2 -translate-y-1/2';
            case 'right': return 'left-[-4px] top-1/2 -translate-y-1/2';
        }
    };

    return (
        <div
            ref={triggerRef}
            className="flex items-center justify-center cursor-help"
            onMouseEnter={() => {
                updatePosition();
                setIsVisible(true);
            }}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && createPortal(
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, ...getMotionPosition() }}
                    animate={{ opacity: 1, scale: 1, ...getMotionPosition() }}
                    transition={{ duration: 0.15, delay }}
                    className="fixed z-[9999] px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                >
                    {content}
                    <div
                        className={`absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 transform rotate-45 ${getArrowClass()}`}
                    />
                </motion.div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
