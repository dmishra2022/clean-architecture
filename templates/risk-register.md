# Technical risk register — World-Check (architect)

| Field | Value |
|-------|--------|
| **Version** | 0.1 |
| **Last updated** | YYYY-MM-DD |
| **Review cadence** | Monthly with EM; quarterly with tribe |

## Scoring (optional)

- **Likelihood:** 1 Rare – 5 Almost certain  
- **Impact:** 1 Minor – 5 Critical (client/regulatory/availability)  
- **Exposure:** L × I  

## Register

| ID | Risk | Context / service | L | I | Exposure | Owner | Mitigation options | Target RFC/ADR | Status |
|----|------|-------------------|---|---|----------|-------|-------------------|----------------|--------|
| R01 | Shared database across screening and case | | | | | | Extract via events; separate store | RFC-001? | Open |
| R02 | No contract tests on external screening API | | | | | | Pact + OpenAPI diff in CI | | Open |
| R03 | Match algorithm rollout without golden regression set | | | | | | Golden dataset in CI | | Open |
| R04 | Sync path lacks bulkhead; cascade failures | | | | | | Bulkhead + queue async | | Open |
| R05 | Audit trail gaps on automated resolutions | | | | | | Domain events + immutable store | | Open |
| R06 | Unclear tenant boundary in cache layer | | | | | | Key prefix by group; review | | Open |
| R07 | Legacy module blocks Java upgrade | | | | | | Strangler + ADR | | Open |
| R08 | Insufficient observability on async rescreen backlog | | | | | | Metrics + SLO | | Open |
| R09 | API versioning policy not enforced | | | | | | Standards doc + lint | | Open |
| R10 | Key person dependency on matching tuning | | | | | | Document thresholds; pair | | Open |

*Replace placeholder rows with findings from postmortems and discovery.*

## Top 3 for quarter (agreed with EM)

1.  
2.  
3.  

## Closed risks

| ID | Closed date | Resolution |
|----|-------------|------------|
| | | |
