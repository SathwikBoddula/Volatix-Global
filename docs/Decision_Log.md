# Decision Log

---

## Decision 001

Title

Volatix is a production product.

Reason

The objective is to build a real software product rather than a resume project.

Status

Accepted

---

## Decision 002

Title

Preserve the TickerData contract.

Reason

Every dashboard component depends on this unified interface.

Status

Accepted

---

## Decision 003

Title

Use yahoo-finance2 as the initial data provider.

Reason

Free, reliable, no API key required, and suitable for Production V1.

Status

Accepted

---

## Decision 004

Title

Single Lead Engineer.

Decision

Ultra is responsible for implementation.

Reason

Maintains consistency throughout the codebase.

Status

Accepted

---

## Decision 005

Title

AI Engineering Team.

Decision

ChatGPT → CTO

Ultra → Lead Engineer

Gemini → Production Auditor

Qwen → Code Reviewer

DeepThink → Quantitative Engineer

Reason

Specialized responsibilities reduce overlap and improve quality.

Status

Accepted

---

## Decision 006

Title

Milestone-driven development.

Reason

Development follows professional software engineering practices.

Status

Accepted

---

## Decision 007

Title

Explicit Server/Client Data Separation

Decision

Server Components access Yahoo Finance through serverData.ts.

Client Components access live data only through the Next.js API route using clientData.ts.

Reason

Aligns with Next.js 15 architecture, guarantees bundle safety through the module graph, improves readability, testing, debugging, and long-term maintainability while preserving the TickerData contract.

Status

Accepted

---

## Decision 008

Yahoo Finance provider established as the production data source.

Status:
Accepted

---

