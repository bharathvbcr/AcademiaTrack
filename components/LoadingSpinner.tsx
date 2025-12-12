import React from 'react';
import { motion } from 'framer-motion';
import { spinnerVariants } from '../hooks/useAnimations';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    text,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            <motion.div
                className={`${sizeClasses[size]} border-3 border-slate-200 dark:border-slate-700 border-t-red-500 dark:border-t-red-400 rounded-full`}
                variants={spinnerVariants}
                animate="animate"
                style={{ borderWidth: size === 'sm' ? 2 : 3 }}
            />
            {text && (
                <motion.p
                    className="text-sm text-slate-500 dark:text-slate-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
};

export default LoadingSpinner;
