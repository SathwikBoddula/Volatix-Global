// src/components/AnalyticsDashboard.tsx
/**
 * Volatix Analytics Dashboard - Production Orchestration Layer
 * Client Component: handles interactivity, ticker switching, hydration
 * Consumes server-rendered initial data from page.tsx
 */

'use client';

import { toast } from 'sonner';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Topbar from './Topbar';
import HeroKPIGrid from './HeroKPIGrid';
import TabNavigation from './TabNavigation';
import TabContent from './TabContent';
import DashboardSkeleton from './DashboardSkeleton';
import {
  generateMockData,
  normalizeTicker,
  type TickerData,
  type NormalizedTicker,
} from '../data/mockData';

// ---------------------------------------------------------------------------
// TYPES (Preserved for child component compatibility)
// ---------------------------------------------------------------------------

export type TabId =
  | 'overview'
  | 'moving-averages'
  | 'combined-trends'
  | 'rsi-momentum'
  | 'macd-convergence'
  | 'backtest'
  | 'forecast-grid'
  | 'ai-trajectory';

interface AnalyticsDashboardProps {
  /** Pre-fetched server data for immediate first paint */
  initialData: TickerData;
  /** Normalized ticker metadata from server */
  ticker: NormalizedTicker;
  /** Indicates data came from server (not client fallback) */
  serverRendered: boolean;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

/** Minimum loading display time to prevent flash (ms) */
const MIN_LOADING_DURATION = 600;

/** Debounce for rapid ticker changes */
const TICKER_CHANGE_DEBOUNCE = 150;

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard({
  initialData,
  ticker: initialTicker,
  serverRendered,
}: AnalyticsDashboardProps) {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Active dashboard tab */
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  /** Current ticker data (hydrated from server, updated client-side) */
  const [tickerData, setTickerData] = useState<TickerData>(initialData);

  /** Normalized ticker metadata */
  const [ticker, setTicker] = useState<NormalizedTicker>(initialTicker);

  /** Loading state for ticker transitions */
  const [isLoading, setIsLoading] = useState(false);

  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  const [displaySymbol, setDisplaySymbol] = useState(initialTicker.displaySymbol);

  /** Track if we've completed initial hydration */
  const [isHydrated, setIsHydrated] = useState(false);

  /** Refs for loading UX */
  const loadStartRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  /**
   * Hydration completion - enables client-side interactions
   * Runs once after mount to prevent SSR mismatch
   */
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  /**
   * Sync with server data if props change (e.g., navigation, refresh)
   * In Next.js 15, page.tsx re-renders with new data on navigation
   */
  useEffect(() => {
    if (serverRendered && initialData !== tickerData) {
      setTickerData(initialData);
      setTicker(initialTicker);
      setDisplaySymbol(initialTicker.displaySymbol);
      setIsLoading(false);
    }
  }, [initialData, initialTicker, serverRendered]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  /**
   * Client-side ticker search with debounce, loading UX, and error handling
   * Uses async generateMockData from upgraded data layer
   */
  const handleTickerSearch = useCallback(
    async (rawTicker: string) => {
      const trimmed = rawTicker.trim().toUpperCase();
      if (!trimmed || trimmed === displaySymbol) return;

      // Debounce rapid changes
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        loadStartRef.current = Date.now();
        setIsLoading(true);

        try {
          // Normalize using data layer utility (consistent with server)
          const normalized = normalizeTicker(trimmed);
          const canonicalKey = normalized.normalized;

          // Fetch from data layer (async, supports future API providers)
          const result = await generateMockData(canonicalKey);

          // Enforce minimum loading duration for smooth UX
          const elapsed = Date.now() - loadStartRef.current;
          const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);

          await new Promise((resolve) => setTimeout(resolve, remaining));

          if (!result) {
            toast.error(`"${trimmed}" not found. Try NVDA, AAPL, RELIANCE.NS, TCS, etc.`);
            setIsLoading(false);
            return;
          }

          // Update all state atomically
          setTickerData(result);
          setTicker(normalized);
          setDisplaySymbol(normalized.displaySymbol);
          setActiveTab('overview'); // Reset to overview on ticker change
          setIsLoading(false);
        } catch (err) {
          console.error('[Dashboard] Ticker search failed:', err);
          toast.error('Failed to load data. Please try again.');
          setIsLoading(false);
        }
      }, TICKER_CHANGE_DEBOUNCE);
    },
    [displaySymbol]
  );

  /**
   * Tab change handler - memoized for child stability
   */
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  // Show skeleton only during client-side ticker transitions
  // Server-rendered data displays immediately (no flash)
  const showSkeleton = isLoading && !serverRendered;

  // Trading days count for Topbar (from history length)
  const tradingDays = tickerData.history?.length ?? 0;

  return (
    <div className="min-h-screen bg-background bg-grid-subtle">
      {/* Subtle background grid */}
      <div className="grid-bg fixed inset-0 pointer-events-none opacity-40" />

      {/* Topbar: ticker search, status, actions */}
      <Topbar
        currentTicker={displaySymbol}
        onTickerSearch={handleTickerSearch}
        isLoading={isLoading}
        tradingDays={tradingDays}
        isHydrated={isHydrated}
      />

      {/* Main dashboard content */}
      <main className="relative z-10 px-4 lg:px-8 xl:px-10 2xl:px-16 pb-16 pt-6 max-w-screen-2xl mx-auto">
        {showSkeleton ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Hero KPI Grid: key metrics at a glance */}
            <HeroKPIGrid data={tickerData} ticker={displaySymbol} metadata={tickerData.metadata} />
            {/* Tab navigation + content */}
            <div className="mt-8">
              <TabNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isLoading={isLoading}
              />
              <TabContent
                activeTab={activeTab}
                data={tickerData}
                ticker={displaySymbol}
                //normalizedTicker={ticker}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
