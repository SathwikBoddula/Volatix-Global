// src/app/page.tsx
/**
 * Volatix - Production Entry Point
 * Next.js 15 App Router Server Component
 * Integrates with upgraded provider-based data layer
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { normalizeTicker, type NormalizedTicker, type TickerData } from './data/mockData';
import { getTickerData } from './data/marketData.server';
import AnalyticsDashboard from './components/AnalyticsDashboard';

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

/** Default ticker when none provided - highly liquid, globally recognized */
const DEFAULT_TICKER = 'NVDA';

/** Valid tickers for quick validation (avoids unnecessary data generation) */
const KNOWN_TICKERS = new Set([
  'NVDA',
  'AAPL',
  'TSLA',
  'MSFT',
  'AMZN',
  'META',
  'GOOGL',
  'AMD',
  'SPY',
  'QQQ',
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'TATAMOTORS',
  'SBIN',
  'WIPRO',
  'RELIANCE.NS',
  'TCS.NS',
  'INFY.NS',
  'HDFCBANK.NS',
  'TATAMOTORS.NS',
  'SBIN.NS',
  'WIPRO.NS',
]);

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface PageProps {
  /** Next.js 15: searchParams is a Promise */
  searchParams: Promise<{ ticker?: string }>;
}

interface DashboardProps {
  /** Pre-fetched server data for immediate hydration */
  initialData: TickerData;
  /** Normalized ticker metadata for client-side reference */
  ticker: NormalizedTicker;
  /** Indicates data was server-rendered (vs client fallback) */
  serverRendered: true;
}

// ---------------------------------------------------------------------------
// METADATA GENERATION (SEO & Social)
// ---------------------------------------------------------------------------

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const rawTicker = resolvedSearchParams.ticker?.toUpperCase().trim() || DEFAULT_TICKER;
  const normalized = normalizeTicker(rawTicker);
  const displayName = normalized.displaySymbol;

  return {
    title: `${displayName} | Volatix Analytics`,
    description: `Professional technical analysis for ${displayName}: real-time charts, ML forecasts, backtesting, and institutional-grade indicators.`,
    keywords: [
      displayName,
      'technical analysis',
      'stock charts',
      'price forecast',
      'backtesting',
      'RSI',
      'MACD',
      'moving averages',
      'volatility',
    ].join(', '),
    authors: [{ name: 'Volatix' }],
    creator: 'Volatix',
    publisher: 'Volatix',
    robots: 'index, follow',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: `/${normalized.normalized.replace(':', '%3A')}`,
      siteName: 'Volatix',
      title: `${displayName} | Volatix Analytics`,
      description: `Advanced technical analysis dashboard for ${displayName}`,
      images: [
        {
          url: `/og/${normalized.normalized.replace(':', '-')}.png`,
          width: 1200,
          height: 630,
          alt: `${displayName} technical analysis chart`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | Volatix Analytics`,
      description: `Technical analysis for ${displayName}`,
      images: [`/og/${normalized.normalized.replace(':', '-')}.png`],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  };
}

// ---------------------------------------------------------------------------
// SERVER COMPONENT - DATA FETCHING & RENDERING
// ---------------------------------------------------------------------------

export default async function Page({ searchParams }: PageProps) {
  // 1. Resolve async searchParams (Next.js 15)
  const resolvedSearchParams = await searchParams;
  const rawTicker = resolvedSearchParams.ticker?.toUpperCase().trim() || DEFAULT_TICKER;

  // 2. Normalize ticker using data layer utility (handles .NS, .BO, aliases)
  const normalizedTicker = normalizeTicker(rawTicker);
  const canonicalKey = normalizedTicker.normalized;

  // 3. Quick validation - avoid generating data for clearly invalid tickers
  // (Full validation happens in data layer; this is a fast-path optimization)
  if (!KNOWN_TICKERS.has(rawTicker) && !KNOWN_TICKERS.has(normalizedTicker.displaySymbol)) {
    // Allow unknown tickers - data layer will handle with default profile
    // But log for monitoring
    console.info(`[Page] Unknown ticker requested: ${rawTicker} -> ${canonicalKey}`);
  }

  // 4. Fetch the complete dataset on the server via the market-data service.
  //    Pass the RAW ticker — the service normalizes once internally, then applies
  //    the MARKET_DATA_MODE-driven live/mock selection, retry, and stale-cache
  //    fallback. (canonicalKey is still used below for observability logging.)
  const tickerData = await getTickerData(rawTicker);

  // 5. Handle not found / data layer failure
  if (!tickerData) {
    // Log for observability
    console.warn(`[Page] No data returned for ticker: ${canonicalKey}`);
    notFound();
  }

  // 6. Render dashboard with pre-hydrated data
  // AnalyticsDashboard will be upgraded next to consume these props
  return (
    <AnalyticsDashboard initialData={tickerData} ticker={normalizedTicker} serverRendered={true} />
  );
}

// ---------------------------------------------------------------------------
// HELPER (inline to avoid new file)
// ---------------------------------------------------------------------------

/**
 * Normalize ticker with additional validation
 * Re-exports data layer's normalizeTicker but adds project-specific logic
 */
function normalize(raw: string): NormalizedTicker {
  const trimmed = raw.trim().toUpperCase();

  // Handle empty/whitespace
  if (!trimmed) {
    return normalizeTicker(DEFAULT_TICKER);
  }

  // Delegate to data layer's canonical normalization
  return normalizeTicker(trimmed);
}
