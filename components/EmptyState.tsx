import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tips?: string[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center py-16 px-6 liquid-glass-card rounded-3xl"
    >
      <div className="liquid-glass h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <span className={`material-symbols-outlined text-4xl text-[#a1a1aa]`}>
          {icon}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-[#f4f4f5] mb-2">
        {title}
      </h3>
      <p className="text-[#a1a1aa] max-w-md mx-auto mb-6">
        {message}
      </p>
      
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-6 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 transition-colors font-medium"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-6 py-2 border border-[#27272a] text-[#f4f4f5] rounded-lg hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#f4f4f5] focus:ring-offset-2 transition-colors font-medium"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}

      {tips && tips.length > 0 && (
        <div className="mt-8 pt-8 border-t border-[#27272a]">
          <p className="text-sm font-medium text-[#f4f4f5] mb-3">Quick Tips:</p>
          <ul className="text-sm text-[#a1a1aa] space-y-2 max-w-md mx-auto text-left">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#dc2626] text-sm mt-0.5">lightbulb</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

export default EmptyState;
