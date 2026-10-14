# Months 4–6: scale the role

[← Back to index](README.md) · Previous: [90-day.md](90-day.md)

## Multi-team architecture

- Own integration contracts (OpenAPI + event schemas in registry).  
- Chair **quarterly** World-Check Java architecture review: dependency graph, tech debt, capacity.  
- Map exceptions to LSEG-wide cloud, identity, messaging — each with ADR rationale.

## Scalability workstreams

| Area | Actions |
|------|---------|
| Read scaling | Cache + invalidation on data version; replicas; CQRS read models |
| Write scaling | Shard by tenant/group; document partition keys |
| Batch | Chunk tuning; parallel workers; checkpointing |
| Hot paths | JVM profiling; allocation reduction; virtual threads for blocking I/O (Java 21+) |
| Cost | K8s right-sizing; spot for batch; data transfer audit |

## Grow successors

- **2 senior engineers** as context owners; they author RFC-002 drafts.  
- Monthly **architecture dojo** on real PRs.

## Deliverables (month 6)

- **RFC-002** (second context or cross-cutting).  
- **Deprecation calendar** for at least one API or module.  
- **Tech debt epic** on roadmap with EM sign-off.

**Next:** [12-month.md](12-month.md)
