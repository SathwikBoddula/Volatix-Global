# Production Backend Specification v1

Last Updated: 2026-09-10
Status: Approved for incremental implementation

---

## Purpose

This specification hardens the existing `GET /api/market-data/[ticker]` endpoint without changing the canonical `TickerData` model or bypassing the provider abstraction. It is the implementation contract for Phase 1, Milestone 2: Production Backend.

## Scope

This milestone delivers:

- Versioned, predictable HTTP response envelopes.
- Safe, structured errors that never expose provider internals.
- Explicit data source and freshness metadata.
- A server-side cache abstraction with bounded freshness behavior.
- Request-scoped structured logging and rate-limit boundaries.

It does not add authentication, persistence, a public multi-provider selection API, or a breaking `TickerData` change.

## Endpoint

`GET /api/market-data/[ticker]`

The route is Node.js-only and dynamically rendered. The ticker path parameter is URL-decoded, trimmed, normalized through the existing ticker normalizer, and validated before provider work begins.

### Success response

```ts
interface MarketDataResponse {
  version: 'v1';
  data: TickerData;
  meta: {
    requestId: string;
    ticker: string;
    source: 'live' | 'mock';
    asOf: string; // ISO-8601 timestamp
    stale: boolean;
    simulated: boolean;
  };
}
```

`data.dataStatus` remains available as an optional, additive domain annotation for server consumers. The API envelope converts its millisecond `asOf` timestamp into ISO-8601, giving HTTP clients a stable transport contract.

The route returns `200` for both fresh and stale last-good data. A stale response is explicitly marked `meta.stale: true` and uses conservative cache headers. Mock data is always explicitly marked simulated and must never be selected as a live-path fallback.

### Error response

```ts
interface MarketDataErrorResponse {
  version: 'v1';
  error: {
    code: 'INVALID_TICKER' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
    message: string;
    requestId: string;
  };
}
```

| Condition                                         | Status | Error code       |
| ------------------------------------------------- | -----: | ---------------- |
| Empty, malformed, or unsupported ticker parameter |    400 | `INVALID_TICKER` |
| Valid ticker but no data is available             |    404 | `NOT_FOUND`      |
| Request limit exceeded                            |    429 | `RATE_LIMITED`   |
| Unexpected server failure                         |    500 | `INTERNAL_ERROR` |

Error messages are safe for users. Raw provider messages, stack traces, credentials, and configuration details are logged server-side only.

## Cache Design

The service retains the existing in-process last-good fallback cache. Milestone 2 introduces a cache interface so that the backing store can later be replaced without changing route or provider consumers.

```ts
interface MarketDataCache {
  get(ticker: string): Promise<CacheEntry | null>;
  set(ticker: string, entry: CacheEntry, ttlMs: number): Promise<void>;
}

interface CacheEntry {
  data: TickerData;
  fetchedAt: number;
}
```

Implemented in this increment: `InMemoryMarketDataCache` is the default per-server adapter, injected behind `MarketDataCache`. Cache keys use the normalized ticker. The service applies a 15-minute default stale-if-error retention, configurable through `staleIfErrorTtlMs`; the provider's existing live cache retains its independent five-minute freshness TTL. Cache adapter failures degrade safely to an uncached response. The cache is an optimization and resilience layer, never an authorization or data-integrity boundary.

## Observability

Each request receives a generated request ID. Structured server logs include request ID, normalized ticker, outcome, status code, source, stale state, elapsed milliseconds, and a safe error code where relevant. Logs must not include raw provider payloads or secrets.

## Rate Limiting

Rate limiting is applied before the service resolves market data. The first adapter is an in-memory fixed-window limiter keyed by a privacy-preserving client identifier and should return `429` with `Retry-After`. The route depends on a limiter interface so a distributed provider can replace it before multi-instance deployment.

## Cache Headers

- Fresh live data: `public, s-maxage=60, stale-while-revalidate=120`.
- Stale live fallback: `no-store` to avoid extending an outage response at shared caches.
- Mock data: `no-store`.
- Errors: `no-store`.

## Incremental Delivery Order

1. Add API envelope and error helpers with route tests.
2. Add ticker validation, request IDs, and structured logging.
3. Extract the last-good cache behind `MarketDataCache` and add TTL coverage. — Completed
4. Add the rate-limiter interface and in-memory adapter with `429` tests.
5. Validate with unit tests, TypeScript, lint, production build, and a live smoke test where credentials and network access are available.

## Acceptance Criteria

- Existing dashboard consumers retain the stable `TickerData` contract.
- Every API response follows the v1 success or error envelope.
- Live, mock, and stale outcomes are distinguishable to API clients.
- No provider implementation detail is returned by errors.
- Cache, logging, and rate-limit concerns are replaceable behind typed interfaces.
- Tests cover fresh, stale, mock, invalid ticker, not-found, rate-limited, and unexpected-error paths.
