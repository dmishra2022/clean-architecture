# Incident architecture follow-up

Link to official postmortem: **[POSTMORTEM_URL or ticket]**

| Field | Value |
|-------|--------|
| **Incident ID** | |
| **Severity** | SEV-__ |
| **Date** | |
| **Services affected** | |
| **Architect owner** | |
| **Status** | Open · In progress · Done |

## Summary (2–3 sentences)

What happened from a **system design** perspective (not only operational detail).

## Timeline (architecture-relevant)

| Time (UTC) | Event |
|------------|-------|
| | |

## Root causes

| Layer | Cause | Systemic? Y/N |
|-------|-------|---------------|
| Application | | |
| Integration | | |
| Data | | |
| Capacity | | |
| Process / governance | | |

## What held up detection / recovery

- Monitoring gap:  
- Runbook gap:  
- Coupling / blast radius:  

## Structural fixes (not only ops toggles)

| # | Fix type | Description | ADR/RFC | Owner | ETA |
|---|----------|-------------|---------|-------|-----|
| 1 | Code | | | | |
| 2 | Architecture boundary | | | | |
| 3 | Test / golden set | | | | |
| 4 | SLO / alert | | | | |
| 5 | Compliance / audit | | | | |

## Patterns to prevent recurrence

- [ ] Idempotency added where duplicates occurred  
- [ ] Timeout / bulkhead between contexts  
- [ ] Contract test for failing integration  
- [ ] Cache invalidation on data version  
- [ ] Tenant isolation verified  

## Game day scenario

Describe one drill to validate fixes in non-prod:

```

```

## Sign-off

| Role | Name | Date |
|------|------|------|
| Architect | | |
| EM | | |
| SRE | | |
