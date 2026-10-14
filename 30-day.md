# First 30 days: listen, map, earn trust

[← Back to index](README.md) · Prerequisite: [00-overview.md](00-overview.md)

## Stakeholder map

| Stakeholder | What they care about | Your first move |
|-------------|----------------------|-----------------|
| EM / Tribe lead | Delivery, team health | Clarify decision rights: you vs committee vs risk sign-off |
| Product | Client outcomes, roadmap | **3 client pain themes** from support tickets or NPS |
| Compliance / Risk | Regulatory fit, audit | “What evidence is hard to produce today?” |
| SRE / Platform | SLOs, cost, incidents | **Golden signals** per critical API |
| Data / Matching | Precision/recall, rollout | How algorithm changes are **versioned and rolled back** |
| Security | Threats, pen test | Last pen test + remediation status |
| Peer architects | Boundaries, standards | Offer to **review one ADR** before asking for reviews |

## Technical discovery (≈2 weeks)

For each service you own or depend on, create a copy of [templates/service-sheet.md](templates/service-sheet.md).

**Deep-dive order (typical critical path):**

1. Screening orchestration (sync/async)  
2. Case store and workflow  
3. Matching / scoring  
4. Search/index (if separate)  
5. Notification / monitoring / rescreen  
6. Admin & entitlements  
7. External API façade  

**Code reading goals:**

- Aggregate roots: `Case`, `ScreeningRequest`, `Party`, `Match`, `ClientGroup` (names may differ).  
- Anti-patterns: anemic domain, god services, shared DB across contexts, `util` leaking domain language.  
- Trace **one request** end-to-end via correlation ID.  
- Locate **contract tests** (or gap).

## Operating rhythm

| Cadence | Purpose | Your output |
|---------|---------|-------------|
| Weekly 1:1 EM | Risks, decisions | ADR/RFC log entries |
| Biweekly arch sync | Cross-team alignment | 1 reviewed ADR or RFC |
| Sprint rituals | Stay at the bench | **≥4 h/week** PR review or pairing |
| Monthly tech forum | Visibility | 20-min lightning talk |

## Deliverables (day 30)

1. **Context map v1** — validated with 2 senior engineers + 1 product person ([templates/context-map.md](templates/context-map.md)).  
2. **Risk register** — top 10 risks with owner and mitigation ([templates/risk-register.md](templates/risk-register.md)).  
3. **Architecture questions** — 10 insider questions ([templates/architecture-questions.md](templates/architecture-questions.md)).  
4. **One merged PR:** flaky test fix, observability span, local dev doc, or OpenAPI tightening.

**Do not** publish a grand target architecture in month 1. Publish **facts** and **options**.

**Next:** [60-day.md](60-day.md)
