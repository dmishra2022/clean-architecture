# Java Architect — LSEG World-Check: Success Roadmap

**Role:** Java Architect, World-Check (Risk Intelligence)  
**Context:** Regulated financial-crime compliance (KYC, AML, CTF, sanctions, PEP, adverse media). Products include **World-Check One**, **World-Check On Demand**, **World-Check Verify**, powered by **Active Intelligence**.  
**Mandate:** Technical direction for bounded contexts, DDD and engineering standards, scalable change with auditability, latency, and data correctness.

This folder is the **execution playbook**. Each phase file ends with **deliverables** and **conversations you should have had**.

## How to navigate

| Document | When to use |
|----------|-------------|
| [00-overview.md](00-overview.md) | Start here: 12-month outcomes, domain capabilities, week 1–2 checklist |
| [30-day.md](30-day.md) | First month: stakeholders, discovery, trust |
| [60-day.md](60-day.md) | Days 31–60: DDD, standards, RFC-001 |
| [90-day.md](90-day.md) | Days 61–90: ship, SLOs, CI gates, onboarding |
| [6-month.md](6-month.md) | Months 4–6: multi-team, scale, successors |
| [12-month.md](12-month.md) | Months 7–12: vision, credibility, scorecard |
| [habits-and-scripts.md](habits-and-scripts.md) | Daily/weekly habits + stakeholder scripts |
| [learning-curriculum.md](learning-curriculum.md) | 8-week parallel learning plan |
| [personal-tracker.md](personal-tracker.md) | Weekly self-tracker (copy each week) |
| [leverage.md](leverage.md) | Optional signature contribution angle |
| [templates/](templates/) | ADR, RFC, context map, glossary, NFR, service sheet, incident follow-up |
| [training/](training/README.md) | Interactive DDD + hexagonal + Micronaut course (zero to expert), runnable code lab, team facilitator guide |
| [training1/](training1/README.md) | The same service with DDD + Clean Architecture + Micronaut: 18-module course, 4-module code lab (one per ring), facilitator guide, [comparison with hexagonal](training1/clean-vs-hexagonal.md) |

## Templates (section 11 — use from day 1)

| File | Purpose |
|------|---------|
| [templates/adr-template.md](templates/adr-template.md) | Architecture Decision Record |
| [templates/rfc-template.md](templates/rfc-template.md) | Cross-team / major change |
| [templates/context-map.md](templates/context-map.md) | Strategic DDD context map (living doc) |
| [templates/glossary.md](templates/glossary.md) | Ubiquitous language |
| [templates/nfr-checklist.md](templates/nfr-checklist.md) | Per-feature NFR gate |
| [templates/service-sheet.md](templates/service-sheet.md) | One page per service |
| [templates/incident-architecture-followup.md](templates/incident-architecture-followup.md) | Post-incident structural fixes |
| [templates/risk-register.md](templates/risk-register.md) | Top technical risks (30-day deliverable) |
| [templates/architecture-questions.md](templates/architecture-questions.md) | Insider questions (30-day deliverable) |

## Revision log

| Date | Version | Notes |
|------|---------|-------|
| 2026-10-11 | 1.0 | Initial roadmap |
| 2026-10-11 | 1.1 | Split into `plan/` + templates |
| 2026-10-11 | 1.2 | Added `training/`: interactive course, diagrams, code lab |
| 2026-10-14 | 1.3 | Added `training1/`: Clean Architecture course, diagrams, multi-module code lab, clean-vs-hexagonal comparison |

---

*After day 30: replace placeholders in templates with real service names, teams, and RFC-001 title.*
