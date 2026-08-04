# Decision Log

Last Updated: 2026-07-20

---

# Purpose

This document records significant architectural and engineering decisions made during the development of Volatix.

Only long-term decisions should be documented here.

---

# DEC-001

## Title

Volatix is a Production Product

### Status

Accepted

### Decision

Volatix will be developed as a production-grade software platform rather than a demo, tutorial, or portfolio project.

### Reason

All engineering decisions should prioritize long-term maintainability, scalability, and production readiness.

---

# DEC-002

## Title

Stable Domain Contract

### Status

Accepted

### Decision

TickerData is the canonical domain model used throughout the application.

### Reason

Maintaining a stable contract minimizes breaking changes and simplifies future development.

---

# DEC-003

## Title

Provider-Based Data Architecture

### Status

Accepted

### Decision

External market data must be accessed through provider implementations behind a common interface.

### Reason

Allows providers to be replaced or expanded without affecting consumers.

---

# DEC-004

## Title

Server-First Data Access

### Status

Accepted

### Decision

Market data retrieval occurs on the server.

Client components consume only processed application data.

### Reason

Improves security, performance, and separation of concerns.

---

# DEC-005

## Title

Transformation Layer

### Status

Accepted

### Decision

Raw provider responses must never be consumed directly by dashboard components.

### Reason

Transformation creates consistent application models independent of external APIs.

---

# DEC-006

## Title

Yahoo Finance as Initial Provider

### Status

Accepted

### Decision

yahoo-finance2 is the initial production market data provider.

### Reason

Reliable, mature, no API key requirement, and suitable for Production V1.

Future providers should integrate without consumer changes.

---

# DEC-007

## Title

Incremental Development

### Status

Accepted

### Decision

Development proceeds through small, milestone-based iterations.

### Reason

Reduces risk and keeps the project deployable throughout development.

---

# DEC-008

## Title

Production Before Features

### Status

Accepted

### Decision

Core architecture and infrastructure take priority over adding new functionality.

### Reason

A stable foundation reduces long-term maintenance costs.

---

# DEC-009

## Title

Documentation as a First-Class Artifact

### Status

Accepted

### Decision

Architecture, roadmap, decisions, status, and project documentation are maintained alongside implementation.

### Reason

Documentation supports maintainability, onboarding, and AI-assisted development.

---

# DEC-010

## Title

Strong TypeScript Boundaries

### Status

Accepted

### Decision

Strong typing should be preserved across providers, domain models, and UI components.

### Reason

Improves correctness, readability, and refactoring safety.

---

# DEC-011

## Title

Minimal Breaking Changes

### Status

Accepted

### Decision

Existing interfaces should remain stable whenever possible.

### Reason

Reduces downstream impact and preserves development velocity.

---

# DEC-012

## Title

AI Engineering Workflow

### Status

Accepted

### Decision

Volatix uses a collaborative, multi-model AI engineering workflow where specialized models contribute according to their strengths rather than assigning all responsibilities to a single model.

### Team Responsibilities

| Role | Models |
|------|--------|
| Product Owner | User |
| CTO / Product Architects | GPT-5.5, Gemini, GPT-5.6 Terra |
| Lead Software Engineer | GPT-5.6 Terra |
| Lead Software Engineer (Optional) | Nemotron Ultra |
| Production Readiness Auditors | GPT-5.5, Gemini, GPT-5.6 Terra |
| Senior TypeScript Reviewers | Qwen, GPT-5.5, GPT-5.6 Terra |
| Quantitative Engineering Reviewers | DeepSeek, GPT-5.6 Terra, GPT-5.5, Gemini |

### Reason

Different AI models excel in different areas. Using a collaborative review process improves architectural quality, implementation correctness, production readiness, quantitative analysis, and overall engineering confidence while reducing blind spots.

---

# DEC-013

## Title

Documentation-First AI Engineering Workflow

### Status

Accepted

### Decision

Before any AI coding assistant modifies the codebase, it must review the project's engineering documentation, including Architecture, Decision Log, Project Context, Project State, and Active Work.

Implementation changes must be consistent with the documented project state.

### Reason

Maintaining synchronized engineering documentation reduces onboarding time, preserves architectural consistency, and enables reliable collaboration between multiple AI coding assistants throughout the project's lifecycle.

---

# Future Decisions

Future architectural decisions should be added using the following format:

- Decision ID
- Title
- Status
- Decision
- Reason
- Date