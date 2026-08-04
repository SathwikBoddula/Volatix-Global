// src/components/TabNavigation.tsx
/**
 * Volatix Tab Navigation - Production Tab Bar
 * Optimized for keyboard navigation and accessibility
 */

'use client';

import React, { memo, useCallback } from 'react';
import {
  Table,
  TrendingUp,
  GitMerge,
  Activity,
  BarChart2,
  FlaskConical,
  Grid3X3,
  Cpu,
} from 'lucide-react';
import type { TabId } from './AnalyticsDashboard';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface TabNavigationProps {
  /** Currently active tab identifier */
  activeTab: TabId;
  /** Callback when tab changes */
  onTabChange: (tab: TabId) => void;
  /** Loading state to disable interactions */
  isLoading?: boolean;
}

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// CONSTANTS (Stable reference)
// ---------------------------------------------------------------------------

const TABS: readonly TabConfig[] = [
  { id: 'overview', label: 'Overview Matrix', shortLabel: 'Overview', icon: Table },
  { id: 'moving-averages', label: 'Moving Averages', shortLabel: 'MA Lines', icon: TrendingUp },
  { id: 'combined-trends', label: 'Combined Trends', shortLabel: 'Trends', icon: GitMerge },
  { id: 'rsi-momentum', label: 'Momentum (RSI)', shortLabel: 'RSI', icon: Activity },
  { id: 'macd-convergence', label: 'Trend Convergence', shortLabel: 'MACD', icon: BarChart2 },
  { id: 'backtest', label: 'Model Backtest', shortLabel: 'Backtest', icon: FlaskConical },
  {
    id: 'forecast-grid',
    label: '7-Day Forecast',
    shortLabel: 'Forecast',
    icon: Grid3X3,
    badge: (
      <span className="text-xs px-1.5 py-0.5 rounded font-mono-data leading-none bg-primary/10 text-primary border border-primary/20">
        7D
      </span>
    ),
  },
  {
    id: 'ai-trajectory',
    label: 'AI Trajectory',
    shortLabel: 'AI Chart',
    icon: Cpu,
    badge: (
      <span className="text-xs px-1.5 py-0.5 rounded font-mono-data leading-none bg-accent/10 text-accent border border-accent/20">
        LSTM
      </span>
    ),
  },
] as const;

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

const TabNavigation = memo(function TabNavigation({
  activeTab,
  onTabChange,
  isLoading = false,
}: TabNavigationProps) {
  // -------------------------------------------------------------------------
  // STABLE HANDLERS
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (tabId: TabId) => {
      if (!isLoading) {
        onTabChange(tabId);
      }
    },
    [onTabChange, isLoading]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: TabId) => {
      if (isLoading) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTabChange(tabId);
      }
    },
    [onTabChange, isLoading]
  );

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <nav
      className="border-b border-border overflow-x-auto scrollbar-none"
      aria-label="Dashboard sections"
    >
      <div className="flex gap-0 min-w-max" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/3'
              }`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
            >
              <Icon
                size={14}
                className={isActive ? 'text-primary' : 'text-muted-foreground'}
                aria-hidden="true"
              />
              <span className="hidden lg:block">{tab.label}</span>
              <span className="lg:hidden">{tab.shortLabel}</span>
              {tab.badge && <span aria-hidden="true">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

TabNavigation.displayName = 'TabNavigation';

export default TabNavigation;
