// src/components/OverviewMatrix.tsx
/**
 * Volatix Overview Matrix - Production KPI Summary Panel
 * Displays historical data with sorting, filtering, pagination
 * Exchange-aware formatting via normalizedTicker
 */

'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TickerData, NormalizedTicker } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface OverviewMatrixProps {
  /** Complete ticker dataset */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Normalized ticker with exchange/currency metadata (from upgraded parent) */
  normalizedTicker?: NormalizedTicker;
}

type SortKey =
  | 'date'
  | 'open'
  | 'high'
  | 'low'
  | 'close'
  | 'volume'
  | 'ma100'
  | 'ma200'
  | 'rsi'
  | 'macdHistogram';

type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50, 100] as const;

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES (Exchange-aware, no external deps)
// ---------------------------------------------------------------------------

/**
 * Format price using ticker's currency and locale conventions
 * Falls back to USD if normalizedTicker unavailable
 */
function formatPrice(
  value: number,
  normalizedTicker?: NormalizedTicker,
  options: { compact?: boolean; sign?: boolean } = {}
): string {
  const currency = normalizedTicker?.currency ?? 'USD';
  const locale =
    normalizedTicker?.exchange === 'NSE' || normalizedTicker?.exchange === 'BSE'
      ? 'en-IN'
      : 'en-US';

  // Handle invalid values
  if (!Number.isFinite(value)) return '—';

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 2 : 2,
    maximumFractionDigits: currency === 'INR' ? 2 : 4,
    notation: options.compact ? 'compact' : 'standard',
    compactDisplay: 'short',
  });

  let formatted = formatter.format(value);

  // Add explicit sign for MACD histogram
  if (options.sign && value > 0) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

/**
 * Format volume with locale-aware compact notation
 */
function formatVolume(value: number, normalizedTicker?: NormalizedTicker): string {
  const locale =
    normalizedTicker?.exchange === 'NSE' || normalizedTicker?.exchange === 'BSE'
      ? 'en-IN'
      : 'en-US';

  if (!Number.isFinite(value)) return '—';

  if (value >= 1_000_000_000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (value >= 1_000_000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (value >= 1_000) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format percentage (RSI, changes)
 */
function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// SORTING & FILTERING (Pure functions for testability)
// ---------------------------------------------------------------------------

function sortRows<T extends object>(rows: T[], key: keyof T, dir: SortDir): T[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];

    // Handle missing values
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (typeof av === 'string' && typeof bv === 'string') {
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    return 0;
  });
}

function filterRows<T extends object>(
  rows: T[],
  search: string,
  searchKeys: string[] = ['date']
): T[] {
  if (!search.trim()) return rows;
  const term = search.toLowerCase();
  return rows.filter((row) =>
    searchKeys.some((key) =>
      String((row as Record<string, unknown>)[key] ?? '')
        .toLowerCase()
        .includes(term)
    )
  );
}

// ---------------------------------------------------------------------------
// RSI COLOR/BADGE LOGIC (Pure functions)
// ---------------------------------------------------------------------------

function getRSIColor(rsi: number): string {
  if (rsi > 70) return 'text-negative';
  if (rsi < 30) return 'text-positive';
  return 'text-muted-foreground';
}

function getRSIBadge(rsi: number): React.ReactNode {
  if (rsi > 70) {
    return (
      <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-danger/10 text-negative border border-danger/20 font-mono-data">
        OB
      </span>
    );
  }
  if (rsi < 30) {
    return (
      <span className="ml-1 text-[10px] px-1 py-0.5 rounded bg-success/10 text-positive border border-success/20 font-mono-data">
        OS
      </span>
    );
  }
  return null;
}

function getMACDColor(histogram: number): string {
  return histogram >= 0 ? 'text-positive' : 'text-negative';
}

// ---------------------------------------------------------------------------
// COLUMN DEFINITIONS (Declarative, single source of truth)
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: SortKey;
  label: string;
  render: (row: TickerData['history'][0], normalizedTicker?: NormalizedTicker) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

const COLUMNS: readonly ColumnDef[] = [
  {
    key: 'date',
    label: 'Date',
    render: (r) => r.date,
    align: 'left',
    className: 'text-muted-foreground',
  },
  { key: 'open', label: 'Open', render: (r, nt) => formatPrice(r.open, nt), align: 'right' },
  {
    key: 'high',
    label: 'High',
    render: (r, nt) => formatPrice(r.high, nt),
    align: 'right',
    className: 'text-positive',
  },
  {
    key: 'low',
    label: 'Low',
    render: (r, nt) => formatPrice(r.low, nt),
    align: 'right',
    className: 'text-negative',
  },
  {
    key: 'close',
    label: 'Close',
    render: (r, nt) => formatPrice(r.close, nt),
    align: 'right',
  },
  {
    key: 'volume',
    label: 'Volume',
    render: (r, nt) => formatVolume(r.volume, nt),
    align: 'right',
    className: 'text-muted-foreground',
  },
  { key: 'ma100', label: 'MA 100', render: (r, nt) => formatPrice(r.ma100, nt), align: 'right' },
  { key: 'ma200', label: ' MA 200', render: (r, nt) => formatPrice(r.ma200, nt), align: 'right' },
  {
    key: 'rsi',
    label: 'RSI(14)',
    render: (r) => (
      <>
        <span className={`font-mono-data ${getRSIColor(r.rsi)}`}>{r.rsi.toFixed(1)}</span>
        {getRSIBadge(r.rsi)}
      </>
    ),
    align: 'right',
  },
  {
    key: 'macdHistogram',
    label: 'MACD Hist.',
    render: (r) => (
      <span className={`font-mono-data ${getMACDColor(r.macdHistogram)}`}>
        {r.macdHistogram >= 0 ? '+' : ''}
        {r.macdHistogram.toFixed(3)}
      </span>
    ),
    align: 'right',
  },
] as const;

// ---------------------------------------------------------------------------
// COMPONENT (Memoized, Optimized)
// ---------------------------------------------------------------------------

const OverviewMatrix = memo(function OverviewMatrix({
  data,
  ticker,
  normalizedTicker,
}: OverviewMatrixProps) {
  // -------------------------------------------------------------------------
  // STATE (Minimal, UI-only)
  // -------------------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);

  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const filteredAndSorted = useMemo(() => {
    if (!data?.history?.length) return [];

    let rows = filterRows(data.history, search, ['date']);
    rows = sortRows(rows, sortKey, sortDir);
    return rows;
  }, [data.history, search, sortKey, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAndSorted.length / pageSize)),
    [filteredAndSorted.length, pageSize]
  );

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, page, pageSize]);

  const visibleRange = useMemo(() => {
    if (!filteredAndSorted.length) return { start: 0, end: 0, total: 0 };
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, filteredAndSorted.length);
    return { start, end, total: filteredAndSorted.length };
  }, [filteredAndSorted.length, page, pageSize]);

  // -------------------------------------------------------------------------
  // EVENT HANDLERS (Stable refs)
  // -------------------------------------------------------------------------

  const handleSort = useCallback(
    (key: SortKey) => {
      setSortDir((prev) => (prev === 'asc' && sortKey === key ? 'desc' : 'asc'));
      setSortKey(key);
      setPage(1);
    },
    [sortKey]
  );

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages]
  );

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size as (typeof PAGE_SIZES)[number]);
    setPage(1);
  }, []);

  // -------------------------------------------------------------------------
  // RENDER HELPERS
  // -------------------------------------------------------------------------

  const SortIcon = useMemo(
    () =>
      function SortIconRenderer({ col }: { col: SortKey }) {
        if (sortKey !== col) {
          return <ArrowUpDown size={12} className="text-muted-foreground opacity-50" />;
        }
        return sortDir === 'asc' ? (
          <ArrowUp size={12} className="text-primary" />
        ) : (
          <ArrowDown size={12} className="text-primary" />
        );
      },
    [sortKey, sortDir]
  );

  const PaginationPages = useMemo(() => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
      pages.push(1, 2, 3, 4, 5);
    } else if (page >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = page - 2; i <= page + 2; i++) pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  // Empty state
  if (!data?.history?.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No historical data available for {ticker}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} Historical Data Matrix</h2>
          <p className="text-sm text-muted-foreground">
            {filteredAndSorted.length} trading sessions · sorted by {sortKey} ({sortDir})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Filter by date..."
              className="pl-8 pr-3 py-2 text-sm bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 font-mono-data w-48"
              aria-label="Filter historical data by date"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {COLUMNS.map((col) => (
                  <th
                    key={`th-${col.key}`}
                    onClick={() => handleSort(col.key)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase cursor-pointer hover:text-foreground transition-colors whitespace-nowrap select-none ${col.align === 'right' ? 'text-right' : ''}`}
                    aria-sort={
                      sortKey === col.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <div className="flex items-center gap-1.5 justify-end">
                      {col.label}
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, idx) => {
                return (
                  <tr
                    key={`row-${row.date}`}
                    className={`border-b border-border/50 hover:bg-white/3 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'
                    }`}
                  >
                    {COLUMNS.map((col) => (
                      <td
                        key={`td-${col.key}-${row.date}`}
                        className={`px-4 py-2.5 font-mono-data text-xs ${col.className ?? ''} ${col.align === 'right' ? 'text-right' : ''}`}
                      >
                        {col.render(row, normalizedTicker)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <label className="flex items-center gap-2" htmlFor="page-size">
              <span>Rows per page:</span>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-muted border border-border rounded px-2 py-1 text-foreground font-mono-data outline-none focus:border-primary/50"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={`ps-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <span className="font-mono-data">
              {visibleRange.start}–{visibleRange.end} of {visibleRange.total}
            </span>
          </div>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="First page"
            >
              «
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            {PaginationPages.map((pageNum) => (
              <button
                key={`page-${pageNum}`}
                onClick={() => handlePageChange(pageNum)}
                className={`px-2.5 py-1 rounded text-xs font-mono-data transition-colors ${
                  page === pageNum
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Last page"
            >
              »
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
});

OverviewMatrix.displayName = 'OverviewMatrix';

export default OverviewMatrix;
