# World-Check ubiquitous language (glossary)

| Field | Value |
|-------|--------|
| **Version** | 0.1 |
| **Maintainer** | Java Architect / tribe |
| **Rule** | Terms here must match **code**, **APIs**, **UI**, and **support docs** |

## How to use

- New feature PRs: if you introduce a term, add a row or link to an existing term.  
- Disputes between teams: this doc is the negotiation surface — escalate to product if language splits.

## Core terms

| Term | Definition | Not the same as | Code / API hint |
|------|------------|-----------------|-----------------|
| **Party** | Individual or organisation being screened | User (login account) | |
| **Case** | Container for submitted screening data, matches, workflow state, and audit for one screening unit of work | Ticket, incident | `caseSystemId` (API) |
| **Screening request** | Action of evaluating party data against selected provider types | Case (request may create or update case) | `screen=SYNC\|ASYNC` |
| **Provider type** | Category of list/source screened (e.g. sanctions, PEP, law enforcement, structured adverse media, watchlist) | Data vendor name only | |
| **Match** | Potential hit linking party attributes to a profile/reference record | Confirmed risk | |
| **False positive (FP)** | Match assessed as non-actionable after review or rules | No match | |
| **Resolution** | Analyst decision on a match (e.g. positive, false positive, unable to verify) with rationale | Case status alone | |
| **Remediation** | Workflow of reviewing and resolving matches on a case | Screening | |
| **Client group** | Tenant boundary for configuration, data isolation, entitlements | Organisation (LSEG internal) | |
| **Ongoing monitoring** | Periodic or event-driven rescreen when data or party attributes change | Initial onboarding screen only | |
| **Batch screening** | High-volume screening outside interactive API latency expectations | Sync API | |
| **Secondary identifier** | DOB, country, ID number, etc. used to reduce ambiguity in name matching | Primary name only | |
| **Audit trail** | Immutable record of submissions, system decisions, user actions, versions | Application log | |
| **Correlation ID** | End-to-end id for tracing one client request | Case ID | HTTP header / MDC |
| **Pilot / UAT / Prod** | Environment progression for API and UI | | Base URL per env |

## Workflow states (align with product — example placeholders)

| State | Meaning | Who transitions |
|-------|---------|-----------------|
| `OPEN` | Case created, screening pending or in progress | System |
| `REVIEW_REQUIRED` | Matches need analyst action | System |
| `RESOLVED` | All required resolutions complete | Analyst / API |
| `ARCHIVED` | Closed for operational purposes | Analyst |

*Replace with your canonical enum values.*

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| AML | Anti-Money Laundering |
| KYC | Know Your Customer |
| CTF | Counter-Terrorist Financing |
| PEP | Politically Exposed Person |
| SLA / SLO | Service Level Agreement / Objective |
| FP | False positive |

## Deprecated terms (do not use in new code)

| Deprecated | Use instead | Removed from codebase target date |
|------------|-------------|-----------------------------------|
| | | |

## Change log

| Date | Term | Change |
|------|------|--------|
| | | |
