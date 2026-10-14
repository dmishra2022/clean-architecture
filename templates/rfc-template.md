# RFC-NNN: [Title]

| Field | Value |
|-------|--------|
| **Author** | |
| **Status** | Draft · Review · Approved · Implementing · Done · Abandoned |
| **Created** | YYYY-MM-DD |
| **Target completion** | YYYY-MM-DD |
| **Teams** | [Owning + dependent] |
| **Bounded contexts** | |
| **ADR(s)** | ADR-____ (create after approval if needed) |

## 1. Problem statement

- What is broken or missing?  
- **Metrics today:** (latency p99, error rate, FP rate, cost, backlog, incident count)  
- **Target metrics:**  
- **Client / regulatory driver:** (support ticket theme, audit finding, roadmap item)

## 2. Goals and non-goals

### Goals

-  

### Non-goals

-  

## 3. Context map (slice)

Paste or link diagram. List contexts touched and relationship types (customer/supplier, OHS, ACL, events).

```
[Screening] --sync API--> [Case Management]
[Data Corpus] --events--> [Monitoring]
```

## 4. Current state

- Architecture summary (3–5 bullets)  
- Known limitations and tech debt  
- Dependencies and blast radius  

## 5. Proposed solution

### 5.1 Overview

Narrative + diagram (sequence or component).

### 5.2 Domain model impact

| Aggregate / entity | Change |
|--------------------|--------|
| Case | |
| Match | |

### 5.3 API / contract changes

| API | Version | Breaking? | Migration |
|-----|---------|-----------|-----------|
| | | | |

### 5.4 Data model

- Tables/topics/indexes  
- Expand-contract plan  
- Backfill / replay strategy  

### 5.5 Events (if any)

| Event | Version | Consumers | Ordering |
|-------|---------|-----------|----------|
| CaseScreened | 1 | | |

## 6. Options considered

| Option | Summary | Why not / why yes |
|--------|---------|-------------------|
| A | | |
| B | | |
| **Recommended** | | |

## 7. Security

- Authentication / authorisation changes  
- Tenant isolation  
- Secrets / key rotation  
- Threat model deltas  

## 8. Compliance and audit

Complete [nfr-checklist.md](nfr-checklist.md) for this RFC.

- Audit trail changes:  
- Evidence exports affected:  
- Human-in-the-loop requirements:  

## 9. Operational plan

- **SLO impact:**  
- **Rollout:** pilot → canary → full  
- **Rollback:**  
- **Runbook updates:**  
- **Game day scenarios:**  

## 10. Testing strategy

- Domain unit tests  
- Contract tests (provider/consumer)  
- Golden dataset / regression (matching if applicable)  
- Performance test acceptance criteria  

## 11. Effort and milestones

| Milestone | Owner | Date |
|-----------|-------|------|
| Design sign-off | | |
| MVP in pilot | | |
| UAT / compliance review | | |
| Production | | |

**T-shirt:** S / M / L / XL  

## 12. Open questions

| # | Question | Owner | Resolution |
|---|----------|-------|------------|
| 1 | | | |

## 13. Review log

| Date | Reviewer | Outcome |
|------|----------|---------|
| | | |
