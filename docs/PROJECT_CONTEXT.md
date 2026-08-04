# Project Context

Last Updated: 2026-08-04

---

# Project Overview

Volatix is a production-grade AI-native financial intelligence platform designed to deliver reliable market data, analytics, and AI-powered insights through a scalable and maintainable software architecture.

The project is engineered as a long-term software product rather than a prototype, tutorial, or portfolio project.

---

# Product Vision

Build a modern financial intelligence platform that combines:

- Live market data
- Financial analytics
- Portfolio management
- AI-assisted research
- Market intelligence
- Scalable cloud architecture

while maintaining production-quality engineering standards.

---

# Engineering Philosophy

Development emphasizes:

- Production-first engineering
- Long-term maintainability
- Stable architecture
- Strong TypeScript practices
- Incremental delivery
- Documentation alongside implementation
- Milestone-driven development

Every engineering decision should improve the long-term health of the project.

---

# Architectural Overview

Volatix follows a layered architecture.

```
Presentation Layer
        │
        ▼
Application Layer
        │
        ▼
Domain Models
        │
        ▼
Provider Layer
        │
        ▼
External Market Data
```

The application is built around a stable domain model (`TickerData`) that isolates the user interface from provider-specific implementations.

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Visualization

- Recharts

## Data Layer

- yahoo-finance2
- Provider abstraction
- Production transformation layer
- Server-side market data services
- MarketDataService orchestration
- Server-only market data composition
- Initial market data API route
- Live/mock data mode selection

---

# Development Workflow

Development follows milestones rather than large feature branches.

Each milestone should:

- Have a clearly defined objective.
- Preserve production readiness.
- Minimize breaking changes.
- Keep the application deployable.

---

# Documentation Structure

```
docs/
├── ACTIVE_WORK.md
├── AI_HANDOFF.md
├── Architecture.md
├── CHANGELOG.md
├── Decision_Log.md
├── PROJECT_CONTEXT.md
├── PROJECT_STATE.md
├── Roadmap.md
└── Volatix_Status.md
```

---

# AI Engineering Workflow

Volatix is developed using a collaborative AI engineering workflow.

Different AI models are used according to their strengths for architecture, implementation, review, quantitative analysis, and production readiness.

All AI contributors should review the project documentation before making implementation changes.

---

# Scope

The project is currently completing its production market data foundation.

Future phases expand into:

- Production backend
- User accounts
- Portfolio management
- AI-powered financial intelligence
- Enterprise scalability

while preserving the established architecture.

---

# Intended Audience

This documentation is intended for:

- Future maintainers
- Contributors
- AI coding assistants
- Engineering reviewers
- Project stakeholders

It should provide enough context for someone new to the repository to understand the project's purpose, architecture, and engineering approach before making changes.
