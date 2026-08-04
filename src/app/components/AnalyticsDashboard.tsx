// src/components/AnalyticsDashboard.tsx
/**
 * Volatix Analytics Dashboard - Production Orchestration Layer
 * Client Component: handles interactivity, ticker switching, hydration
 * Consumes server-rendered initial data from page.tsx
 */

'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Topbar from './Topbar';
import HeroKPIGrid from './HeroKPIGrid';
import TabNavigation from './TabNavigation';
import TabContent from './TabContent';
import DashboardSkeleton from './DashboardSkeleton';
import { type TickerData, type NormalizedTicker } from '../data/mockData';

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
  const router = useRouter();

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------

  /** Active dashboard tab */
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  /** Current ticker data (hydrated from server, updated client-side) */
  const [tickerData, setTickerData] = useState<TickerData>(initialData);

  /** Normalized ticker metadata */
  const [_ticker, setTicker] = useState<NormalizedTicker>(initialTicker);

  /** Loading state for ticker transitions */
  const [isLoading, setIsLoading] = useState(false);

  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  const [displaySymbol, setDisplaySymbol] = useState(initialTicker.displaySymbol);

  /** Track if we've completed initial hydration */
  const [isHydrated, setIsHydrated] = useState(false);

  /** Debounce timer for ticker search */
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
  }, [initialData, initialTicker, serverRendered, tickerData]);

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
   * Client-side ticker search → server round-trip.
   *
   * The dashboard is a Client Component and cannot import the server-only
   * market-data service, so instead of fetching here we navigate to `/?ticker=…`.
   * page.tsx re-runs on the server and re-fetches through `getTickerData`, so
   * client-initiated ticker changes honor MARKET_DATA_MODE, retry, and
   * stale-cache — and never silently show mock data in LIVE mode. The refreshed
   * server props are synced into state by the initialData effect above; invalid
   * tickers resolve to not-found.tsx on the server.
   */
  const handleTickerSearch = useCallback(
    (rawTicker: string) => {
      const trimmed = rawTicker.trim().toUpperCase();
      if (!trimmed || trimmed === displaySymbol) return;

      // Debounce rapid changes
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setIsLoading(true); // Topbar shows progress during the server round-trip
        setActiveTab('overview'); // Reset to overview on ticker change
        router.push(`/?ticker=${encodeURIComponent(trimmed)}`);
      }, TICKER_CHANGE_DEBOUNCE);
    },
    [displaySymbol, router]
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
