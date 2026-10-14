# Days 61–90: ship, measure, institutionalise

[← Back to index](README.md) · Previous: [60-day.md](60-day.md)

## Delivery

- Lead or co-lead an implementation slice of **RFC-001** (not design-only).  
- Define **SLO** for one critical journey, e.g. sync screen API: availability 99.9%, p99 &lt; X ms, error budget policy with SRE.  
- **Game day** on non-prod for that path (with SRE).

## CI quality gates

| Gate | Examples |
|------|----------|
| Static analysis | SonarQube / Checkstyle |
| CVEs | Snyk / Mend / OWASP dependency-check |
| Contract | Pact / Spring Cloud Contract / OpenAPI diff |
| Architecture | ArchUnit forbidden imports |
| Performance | Gatling / k6 nightly baseline |

Run [templates/nfr-checklist.md](templates/nfr-checklist.md) for RFC-001 scope before prod/pilot promotion.

## Knowledge transfer

- Onboarding guide: “First screening change in 1 day” (local stack, test data, flags).  
- 15-min internal architecture walkthrough (recorded).

## Deliverables (day 90)

- RFC-001 in **prod or pilot** with before/after metrics.  
- SLO dashboard shared with EM + SRE.  
- Post-implementation review (what to refactor next).  
- For any SEV incident in quarter: [templates/incident-architecture-followup.md](templates/incident-architecture-followup.md).

**Next:** [6-month.md](6-month.md)
