# Days 31–60: standards, boundaries, RFC-001

[← Back to index](README.md) · Previous: [30-day.md](30-day.md)

## DDD operating model

**Enforce in reviews:**

| Pattern | World-Check application |
|---------|-------------------------|
| **Ubiquitous language** | `Case`, `Match`, `Resolution` — not `RecordDTOProcessor` |
| **Bounded context** | Screening ≠ Case workflow ≠ Data corpus ≠ Client admin |
| **Aggregates** | Case owns consistency; cross-aggregate via domain events |
| **Domain events** | `CaseScreened`, `MatchResolved`, `MonitoringTriggered` — version payloads |
| **Anti-corruption layer** | External DTOs ↔ domain only at API boundary |
| **CQRS** | Only where measured: search/UI read models vs case write model |

**Strategic workshop (90 min, you facilitate):**

- Contexts, upstream/downstream, **OHS** for public APIs, **Conformist** only where required (e.g. sanctions list format).  
- Output: context map on wall + integration style per edge (REST, events, batch).

## Java architecture standards v0.1 → v1.0

Target **5–8 pages** (brown-bag ×2: draft → feedback → v1.0):

1. Packages: `domain`, `application`, `infrastructure`, `api`  
2. APIs: versioning, error model (RFC 7807 or org standard), pagination, idempotency keys  
3. Resilience: timeouts, safe retries, circuit breakers, bulkheads  
4. Observability: correlation ID, structured logs, RED/USE per endpoint  
5. Testing: domain unit tests without Spring; contract tests at boundaries  
6. Data: expand-contract migrations  
7. Security: no secrets in code; dependency scan; SBOM if required  

Record major standards decisions as ADRs using [templates/adr-template.md](templates/adr-template.md).

## RFC-001 (pick from risk register)

| Initiative type | Example KPI |
|-----------------|-------------|
| Sync screening latency | p99 ↓; golden match set unchanged |
| API deprecation | vN→vN+1; zero pilot breakages |
| Event-driven rescreen | Backlog time; cost per million rescreens |
| Modularisation | ACL extract; fewer cycles (ArchUnit) |
| Test harness | Golden matching dataset in CI |

Use [templates/rfc-template.md](templates/rfc-template.md).

## Deliverables (day 60)

- Architecture Standards **v1.0** (EM-backed).  
- **RFC-001** approved or in formal review.  
- **ArchUnit** (or documented dependency rules) merged for one service.  
- **2 engineers** routinely request your design review.

**Next:** [90-day.md](90-day.md)
