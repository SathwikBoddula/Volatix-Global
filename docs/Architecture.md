# Volatix Architecture

Last Updated: 2026-08-04

---

# Vision

Volatix is a production-grade AI-native financial intelligence platform designed to provide reliable market data, analytics, and AI-powered insights through a scalable, maintainable, and production-ready architecture.

This project is engineered as a real software product—not a prototype, tutorial, or portfolio project.

---

# Architectural Goals

- Build for long-term maintainability.
- Preserve stable domain contracts.
- Separate presentation from business logic.
- Isolate external data providers.
- Support multiple market data providers.
- Minimize breaking changes.
- Enable incremental feature delivery.
- Keep the codebase production-ready at every milestone.

---

# Core Engineering Principles

- Production quality over development speed.
- Incremental, milestone-driven development.
- Strong TypeScript typing.
- Separation of concerns.
- Provider-based architecture.
- Server-first data access.
- Reusable and modular components.
- Documentation evolves with implementation.

---

# High-Level Architecture

```
                     User
                       │
                       ▼
              Next.js App Router
                       │
                       ▼
                  Page Components
                       │
                       ▼
             Analytics Dashboard
                       │
                       ▼
              Dashboard Components
                       │
                       ▼
                 TickerData Model
                       │
                       ▼
             Data Provider Interface
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
 Yahoo Finance Provider      Future Providers
         │                           │
         └─────────────┬─────────────┘
                       ▼
             Transformation Layer
                       ▼
                External APIs
```

---

# Layer Responsibilities

## Presentation Layer

Responsible for rendering the user interface.

Includes:

- App Router
- Pages
- Dashboard
- Charts
- Tables
- UI Components

This layer never communicates directly with external APIs.

---

## Domain Layer

Contains the application's core business models.

Primary model:

- TickerData

TickerData is the canonical contract consumed throughout the application.

Changes to this model require careful review because it affects the entire dashboard.

---

## Provider Layer

Responsible for retrieving market data.

Responsibilities include:

- Provider abstraction
- Data retrieval
- Provider selection
- Error handling
- Retry logic

Consumers remain independent of provider implementation.

---

## Transformation Layer

Responsible for converting provider-specific responses into Volatix's canonical domain models.

Responsibilities:

- Normalize raw API responses
- Validate data
- Handle missing values
- Preserve consistent application contracts

---

## External Services

Current:

- yahoo-finance2

Future providers may include:

- Finnhub
- Polygon.io
- Alpha Vantage
- Twelve Data
- Other institutional market data sources

The application should require minimal changes when introducing additional providers.

---

# Data Flow

```
Dashboard Request
        │
        ▼
Provider Interface
        │
        ▼
Yahoo Finance Provider
        │
        ▼
Yahoo Finance API
        │
        ▼
Raw Provider Response
        │
        ▼
Transformation Layer
        │
        ▼
TickerData
        │
        ▼
Dashboard Components
```

Current implementation notes:

- `marketData.server.ts` is the server-only composition boundary for the market data layer.
- `MarketDataService` coordinates live/mock mode selection, live-path retry behavior, stale last-good fallback, and bounded cache access.
- `YahooDataProvider` remains isolated from client components behind the server-only data access path.
- The market data API route exposes a versioned v1 response and error contract at `/api/market-data/[ticker]`.
- API responses include request ID, source, freshness, stale, and simulated metadata.
- `MarketDataCache` provides a replaceable cache abstraction with an in-memory implementation and bounded stale-if-error retention.

---

# Core Architectural Contracts

## TickerData

TickerData is the central domain model.

Every dashboard component depends on this contract.

Breaking changes should be avoided unless absolutely necessary.

---

## Provider Interface

All market data providers should expose a consistent interface.

This allows providers to be replaced or extended without affecting the UI.

---

# Scalability Strategy

Future expansion should occur by adding new providers rather than modifying existing consumers.

Example:

```
Provider Interface
        │
 ┌──────┼──────────┐
 ▼      ▼          ▼
Yahoo  Polygon  Finnhub
```

This minimizes downstream changes.

---

# Error Handling Strategy

Errors should be handled as close to the provider and service layers as
possible.

Responsibilities include:

- Retry transient provider failures.
- Normalize provider errors into application-level errors.
- Return predictable API responses through the versioned v1 contract.
- Prevent provider-specific errors from leaking into the UI or API clients.
- Return safe error messages without exposing provider internals, stack traces,
  credentials, or configuration details.
- Allow cache failures to degrade safely without breaking successful live
  responses.

Current implementation includes live-path retry behavior, stale last-good
fallback, safe API error envelopes, and bounded cache failure isolation.

Production Backend hardening continues with structured logging and rate
limiting.

---

# Performance Strategy

- Server-side data retrieval
- Efficient provider abstraction
- Reusable transformation logic
- Minimized duplicate API requests
- Bounded server-side caching
- Replaceable cache abstraction
- Safe cache failure degradation
- Future support for distributed caching and request optimization

Current implementation includes server-side data access, request optimization,
and an in-memory last-good cache abstraction with bounded stale-if-error
retention. The cache remains an optimization and resilience layer and can be
replaced by a different backing store without changing route or provider
consumers.

---

# Long-Term Direction

The architecture is designed to support:

- Multiple financial data providers
- AI-powered analytics
- Portfolio management
- Watchlists
- Alerts
- Authentication
- Real-time streaming
- Machine learning services
- Enterprise-scale deployment

without requiring major architectural redesign.

---

# AI Engineering Team

| Role | Models |
|------|--------|
| Product Owner | User |
| CTO / Product Architects | GPT-5.5, Gemini, GPT-5.6 Terra |
| Lead Software Engineer | GPT-5.6 Terra |
| Lead Software Engineer (Optional) | Nemotron Ultra |
| Production Readiness Auditors | GPT-5.5, Gemini, GPT-5.6 Terra |
| Senior TypeScript Reviewers | Qwen, GPT-5.5, GPT-5.6 Terra |
| Quantitative Engineering Reviewers | DeepSeek, GPT-5.6 Terra, GPT-5.5, Gemini |

---

# Architecture Philosophy

Every architectural decision should prioritize:

1. Maintainability
2. Reliability
3. Scalability
4. Simplicity
5. Production readiness

Short-term convenience must never compromise long-term architecture.
