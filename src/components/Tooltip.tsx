import React, { useState } from 'react';
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

    const getPositionStyles = () => {
        switch (position) {
            case 'top':
                return { bottom: '100%', left: '50%', x: '-50%', marginBottom: '8px' };
            case 'bottom':
                return { top: '100%', left: '50%', x: '-50%', marginTop: '8px' };
            case 'left':
                return { right: '100%', top: '50%', y: '-50%', marginRight: '8px' };
            case 'right':
                return { left: '100%', top: '50%', y: '-50%', marginLeft: '8px' };
            default:
                return { top: '100%', left: '50%', x: '-50%', marginTop: '8px' };
        }
    };

    return (
        <div
            className="relative flex items-center justify-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, ...getPositionStyles() }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15, delay }}
                        className="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap pointer-events-none"
                        style={getPositionStyles() as any}
                    >
                        {content}
                        <div
                            className={`absolute w-2 h-2 bg-slate-800 dark:bg-slate-700 transform rotate-45 ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
                                    position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
                                        position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
                                            'left-[-4px] top-1/2 -translate-y-1/2'
                                }`}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tooltip;
