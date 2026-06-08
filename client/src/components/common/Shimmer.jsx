import React from 'react';
import GlassCard from './GlassCard';

/**
 * Single pulsing loading block
 */
export const ShimmerBlock = ({ className = '', height = 'h-6' }) => {
  return (
    <div
      className={`
        bg-slate-300/40 dark:bg-slate-800/40 
        animate-pulse 
        rounded-lg 
        ${height} 
        ${className}
      `}
    />
  );
};

/**
 * Skeleton loaders mimicking the Bento Grid layout on Dashboard
 */
export const ShimmerBentoGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
      {/* 1. Header Balance */}
      <GlassCard className="p-6 col-span-1 lg:col-span-2">
        <div className="space-y-3">
          <ShimmerBlock width="w-1/3" height="h-4" />
          <ShimmerBlock width="w-2/3" height="h-8" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            <ShimmerBlock height="h-16" />
            <ShimmerBlock height="h-16" />
            <ShimmerBlock height="h-16" />
          </div>
        </div>
      </GlassCard>

      {/* 2. Mini Trend */}
      <GlassCard className="p-6 col-span-1">
        <div className="space-y-4">
          <ShimmerBlock width="w-1/2" height="h-5" />
          <ShimmerBlock height="h-32" />
        </div>
      </GlassCard>

      {/* 3. Budget Circles */}
      <GlassCard className="p-6 col-span-1">
        <div className="space-y-4">
          <ShimmerBlock width="w-1/2" height="h-5" />
          <div className="flex justify-around py-4">
            <div className="w-16 h-16 rounded-full border-4 border-slate-300/30 animate-pulse" />
            <div className="w-16 h-16 rounded-full border-4 border-slate-300/30 animate-pulse" />
          </div>
          <ShimmerBlock height="h-4" />
        </div>
      </GlassCard>

      {/* 4. Chart Category */}
      <GlassCard className="p-6 col-span-1 lg:col-span-2">
        <div className="space-y-4">
          <ShimmerBlock width="w-1/3" height="h-5" />
          <ShimmerBlock height="h-48" />
        </div>
      </GlassCard>
    </div>
  );
};

/**
 * Standard list item skeletons for history tables
 */
export const ShimmerList = ({ rows = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 glass-card rounded-xl">
          <div className="flex items-center space-x-3 w-2/3">
            <ShimmerBlock className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="space-y-2 w-full">
              <ShimmerBlock className="w-1/2" height="h-4" />
              <ShimmerBlock className="w-1/4" height="h-3" />
            </div>
          </div>
          <ShimmerBlock className="w-20" height="h-6" />
        </div>
      ))}
    </div>
  );
};
