# Overview: success criteria and domain (weeks 1–2)

[← Back to index](README.md)

## What “success” looks like in 12 months

| Outcome | Evidence (what others see) |
|--------|----------------------------|
| **Trusted technical voice** | Default reviewer for cross-team ADRs; product and compliance cite your designs in governance |
| **Clear domain map** | Published context map + glossary; new engineers onboard from it in week 1 |
| **Measurable quality** | SLOs for screening APIs; error budgets owned; postmortems cite architecture fixes you drove |
| **Delivery credibility** | Led ≥1 material initiative (performance, API evolution, migration, platform) with measurable KPI |
| **Team multiplier** | Guild sessions; standards adopted; fewer architecture surprises in planning |

## World-Check domain to internalise

Study **business capabilities**, not a microservice list. Map each row to a bounded context (replace names with internal reality).

### Core capabilities

| Capability | What it does | Architect concerns |
|------------|--------------|-------------------|
| **Screening** | Match party (name + secondary IDs) against provider types | Sync/async latency, idempotency, explainability, rule versioning |
| **Case** | Screening request, matches, workflow, audit | Consistency, immutable audit, state machines, tenant isolation |
| **Remediation** | Resolve matches, risk, rationale | API/UI parity, authorisation, non-repudiation, retention |
| **Ongoing monitoring** | Rescreen on data changes | Events, backlog, fairness, cost |
| **Batch screening** | High volume, scheduled | Throughput, chunking, failure isolation, replay |
| **Data ingestion / enrichment** | Corpus, provenance, dedup | Correctness, schema evolution, lineage |
| **Matching engine** | Name match, secondary IDs, FP reduction | Determinism, thresholds, controlled rollout |
| **Client administration** | Groups, entitlements, API keys, HMAC | Security boundaries, config vs code |
| **Reporting & audit** | Regulator / internal evidence | WORM semantics, exports, correlation IDs |
| **Integrations** | REST/JSON, OpenAPI, pilot → prod | Contract tests, compatibility, deprecation |

**Public anchors** (LSEG Developer Community — supplement internal docs only):

- World-Check One API: cases, `screen=SYNC|ASYNC`, lifecycle  
- Zero Footprint Screening API: versioned REST, pilot/UAT/prod  
- On Demand: structured sanctions/PEP/adverse media  

### NFRs that drive architecture

- **Auditability:** Reconstruct who, what data version, what rule version, what outcome.  
- **Correctness over cleverness:** Wrong “no match” > slow match — validation, reconciliation, human override.  
- **Multi-tenancy:** Isolation of client groups (data, config, rate limits).  
- **Availability & latency:** Tight SLAs on sync paths; throughput SLAs on batch.  
- **Security:** External API key + HMAC; internal mTLS; least privilege; rotation.  
- **Change management:** API versioning, flags, backward-compatible expansion.  
- **Operational resilience:** Idempotency, DLQ, rate limits, bulkheads.

## Week 1–2 checklist

- [ ] Read: engineering handbook, on-call runbook, ADR index, threat model / security architecture summary.  
- [ ] Access: APM, logs, CI/CD, artefact repo, internal API catalog (read-only).  
- [ ] Book **45 min** with: EM, Product lead, Compliance engineering liaison, SRE/Platform, Data/Matching lead.  
- [ ] Run one screening flow in **non-prod**: case → sync screen → matches → resolve (if allowed); repeat via API if pilot access exists.  
- [ ] Draft context map v0.1 — use [templates/context-map.md](templates/context-map.md).  
- [ ] Glossary v0.1 — use [templates/glossary.md](templates/glossary.md).  
- [ ] Top **5 production incidents** (12 months) from postmortems → themes for year 1.  
- [ ] Start [templates/risk-register.md](templates/risk-register.md) and [templates/architecture-questions.md](templates/architecture-questions.md).

**Deliverable:** Context map v0.1 + one-page glossary shared with EM.

**Next:** [30-day.md](30-day.md)
