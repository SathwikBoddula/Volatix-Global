# Changelog

All notable changes to Volatix are documented in this file.

This project follows:

- Production-first engineering
- Incremental development
- Milestone-driven delivery
- Semantic versioning

---

# [0.1.0] - Project Foundation

## Added

### Project

- Established Volatix as a production-grade software project.
- Defined long-term product vision.
- Adopted milestone-driven engineering workflow.
- Created project documentation structure.

### Architecture

- Defined high-level system architecture.
- Established provider-based data architecture.
- Introduced canonical `TickerData` domain model.
- Documented engineering principles.

### Engineering

- Established AI engineering workflow.
- Defined engineering review process.
- Created decision log.
- Created roadmap.
- Created project status tracking.

---

# [0.2.0] - Dashboard Foundation

## Added

- Built Next.js dashboard.
- Implemented analytics dashboard.
- Added reusable dashboard components.
- Established initial application structure.
- Introduced mock market data.

---

# [0.3.0] - Production Data Foundation

## Added

- Introduced provider abstraction.
- Began migration from mock data to live market data.
- Added Yahoo Finance provider.
- Established production data layer.
- Documented provider architecture.

## Changed

- Shifted architecture toward production-ready data retrieval.
- Continued replacing prototype data pipeline.

---

# [Unreleased]

## In Progress

### Live Market Data

- Yahoo Finance integration
- Transformation layer
- Dashboard migration
- Production data pipeline

### Production Backend

Planned:

- API route contract hardening
- Server-side caching
- Logging
- Error handling
- Rate limiting
- Performance optimization

## Added

- Production Yahoo Finance provider implementation
- Server-side market data services
- Production data transformation pipeline
- Provider integration for live market data
- Server-only market data composition boundary
- Initial market data API route
- Live/mock data mode selection through `MARKET_DATA_MODE`
- Live-path retry behavior
- Stale last-good data fallback

## Changed

- Replaced prototype/mock data pipeline with production provider architecture
- Updated dashboard to consume live provider data
- Improved project documentation and engineering workflow
- Clarified Production Backend scope around hardening API contracts, caching, error handling, logging, rate limiting, and performance

## Testing

- Added validation for production data layer
- Verified dashboard compatibility with live data
- Verified data layer tests pass
- Verified TypeScript type-check passes
- Identified current lint formatting issue and warnings during validation

## Documentation

- Synchronized engineering documentation
- Updated project state
- Updated active work
- Updated project status

---

# Version History

| Version | Status      | Description |
|---------|-------------|-------------|
| 0.1.0   | Released    | Project foundation |
| 0.2.0   | Released    | Dashboard foundation |
| 0.3.0   | In Progress | Production data foundation |

---

# Notes

This changelog records significant engineering milestones and production changes.

Minor refactoring, formatting changes, and internal development work are intentionally omitted unless they materially affect the project's architecture, functionality, or release history.
