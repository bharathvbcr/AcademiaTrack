import React from 'react';

interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  count = 1,
  height = 'h-4',
  className = ''
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${height} ${className}`}
          aria-label="Loading..."
        />
      ))}
    </>
  );
};

interface SkeletonCardProps {
  count?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="liquid-glass-depth rounded-2xl p-5 animate-pulse"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SkeletonLoader height="h-6" className="w-3/4" />
              <SkeletonLoader height="h-8" className="w-16 rounded-full" />
            </div>
            <SkeletonLoader height="h-4" className="w-1/2" />
            <div className="flex gap-2">
              <SkeletonLoader height="h-6" className="w-20 rounded-full" />
              <SkeletonLoader height="h-6" className="w-24 rounded-full" />
            </div>
            <SkeletonLoader height="h-2" className="w-full rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;
