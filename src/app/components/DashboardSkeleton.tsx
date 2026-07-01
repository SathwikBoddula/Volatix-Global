// src/components/DashboardSkeleton.tsx
/**
 * Volatix Dashboard Skeleton - Production Loading State
 * Accessible, performant loading placeholders with semantic structure
 */

'use client';

import React, { memo, useMemo } from 'react';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface StatusItem {
  label: string;
  status: 'complete' | 'running' | 'pending';
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const STATUS_ITEMS: readonly StatusItem[] = [
  { label: 'Data Ingestion', status: 'complete' },
  { label: 'Indicator Engine', status: 'complete' },
  { label: 'LSTM Training', status: 'running' },
] as const;

const TAB_COUNT = 8;
const TAB_BASE_WIDTH = 80;
const TAB_WIDTH_INCREMENT = 8;

// ---------------------------------------------------------------------------
// SUB-COMPONENTS (Memoized)
// ---------------------------------------------------------------------------

const SkeletonBar = memo(function SkeletonBar({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton-dark ${className}`} style={style} aria-hidden="true" />;
});

SkeletonBar.displayName = 'SkeletonBar';

const StatusDot = memo(function StatusDot({
  index,
  color = 'primary',
}: {
  index: number;
  color?: 'primary' | 'accent';
}) {
  return (
    <div
      className={`w-2 h-2 rounded-full bg-${color} animate-glow-pulse`}
      style={{ animationDelay: `${index * 0.3}s` }}
      aria-hidden="true"
    />
  );
});

StatusDot.displayName = 'StatusDot';

const StatusItem = memo(function StatusItem({ item }: { item: StatusItem }) {
  const isComplete = item.status === 'complete';

  return (
    <div>
      <div className="text-xs text-muted-foreground">{item.label}</div>
      <div
        className={`text-xs font-mono-data font-semibold mt-0.5 ${
          isComplete ? 'text-positive' : 'text-warning-amber animate-pulse'
        }`}
      >
        {item.status === 'complete'
          ? 'Complete'
          : item.status === 'running'
            ? 'Running...'
            : 'Pending'}
      </div>
    </div>
  );
});

StatusItem.displayName = 'StatusItem';

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

const DashboardSkeleton = memo(function DashboardSkeleton() {
  // Stable tab widths
  const tabWidths = useMemo(
    () => Array.from({ length: TAB_COUNT }, (_, i) => TAB_BASE_WIDTH + i * TAB_WIDTH_INCREMENT),
    []
  );

  return (
    <div
      className="animate-fade-in-up space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard data"
    >
      {/* Ticker Header Skeleton */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <SkeletonBar className="h-9 w-24 rounded-lg" />
        <SkeletonBar className="h-7 w-16 rounded-md" />
      </div>

      {/* KPI Grid Skeleton */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4"
        aria-hidden="true"
      >
        <SkeletonBar className="lg:row-span-2 rounded-xl h-64" />
        <SkeletonBar className="rounded-xl h-32" />
        <SkeletonBar className="rounded-xl h-32" />
        <SkeletonBar className="rounded-xl h-32" />
        <SkeletonBar className="rounded-xl h-32" />
      </div>

      {/* Tab Bar Skeleton */}
      <div className="flex gap-2 border-b border-border pb-3 overflow-hidden" aria-hidden="true">
        {tabWidths.map((width, i) => (
          <SkeletonBar
            key={`tab-skel-${i}`}
            className="h-9 rounded-md"
            style={{ width: `${width}px` }}
          />
        ))}
      </div>

      {/* Processing Status */}
      <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center gap-4">
        {/* Animated Dots */}
        <div className="flex items-center gap-3" aria-hidden="true">
          <StatusDot index={0} color="primary" />
          <StatusDot index={1} color="accent" />
          <StatusDot index={2} color="primary" />
        </div>

        {/* Status Text */}
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mb-1">
            Ingesting market data &amp; training LSTM model
          </p>
          <p className="text-xs text-muted-foreground">
            Fetching historical trading data · Computing RSI/MACD indicators · Running 100-day
            lookback window
          </p>
        </div>

        {/* Progress Bar */}
        <div
          className="w-64 h-1 bg-muted rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Model training progress"
        >
          <SkeletonBar className="h-full bg-primary rounded-full" />
        </div>

        {/* Step Status Grid */}
        <div
          className="grid grid-cols-3 gap-6 mt-2 text-center"
          role="list"
          aria-label="Processing steps"
        >
          {STATUS_ITEMS.map((item) => (
            <StatusItem key={`status-${item.label}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
});

DashboardSkeleton.displayName = 'DashboardSkeleton';

export default DashboardSkeleton;
