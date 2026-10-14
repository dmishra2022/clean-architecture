# NFR checklist — feature / RFC gate

Copy this file per feature or attach to RFC. **All sections must be answered** before production promotion (or mark N/A with justification).

| Field | Value |
|-------|--------|
| **Feature / RFC** | |
| **Author** | |
| **Date** | |
| **Bounded context** | |

## 1. Functional scope

- [ ] User journeys documented (UI and/or API)  
- [ ] Ubiquitous language terms added to [glossary.md](glossary.md)  
- [ ] Backward compatibility assessed  

## 2. Performance and scale

| Question | Answer |
|----------|--------|
| Expected RPS / batch volume | |
| Latency target (p50 / p99) | |
| Payload size limits | |
| Peak vs steady state | |
| Load test evidence attached? | |

- [ ] Timeouts defined on all outbound calls  
- [ ] Bulkhead / concurrency limits considered  

## 3. Availability and resilience

- [ ] Idempotency for mutating APIs (key documented)  
- [ ] Retry policy safe (no duplicate side effects)  
- [ ] Circuit breaker / fallback behaviour defined  
- [ ] Graceful degradation described  
- [ ] DLQ / poison message handling (async)  
- [ ] RTO/RPO impact assessed for this component  

## 4. Multi-tenancy and authorisation

- [ ] Client group isolation enforced at data and cache layers  
- [ ] Authorisation model documented (roles, scopes)  
- [ ] No cross-tenant IDs in logs or metrics labels  
- [ ] Admin operations separately authorised  

## 5. Security

- [ ] Threat model updated or N/A confirmed  
- [ ] Input validation and output encoding  
- [ ] Secrets not in code/config repos  
- [ ] Dependency CVE scan clean or exceptions recorded  
- [ ] PII handling and masking in logs  
- [ ] External API: auth (API key + HMAC or org standard)  

## 6. Audit and compliance

- [ ] Every material action emits auditable event or immutable record  
- [ ] Who / when / what / which data version / which rule or model version  
- [ ] Analyst overrides require rationale field  
- [ ] Retention and legal hold behaviour unchanged or documented  
- [ ] Export/report impact assessed  
- [ ] Compliance sign-off required? **Y / N** — ticket:  

## 7. Screening correctness (if applicable)

- [ ] Golden test set run (no regression)  
- [ ] Algorithm or threshold version recorded on results  
- [ ] Explainability: analyst can see why match scored  
- [ ] Sync vs async semantics unchanged or migration documented  

## 8. Observability

- [ ] Correlation ID propagated inbound → outbound  
- [ ] Structured logging (JSON) with stable field names  
- [ ] Metrics: RED (rate, errors, duration) per endpoint  
- [ ] Dashboards and alerts linked  
- [ ] SLO/error budget impact noted  

## 9. Data management

- [ ] Schema migration expand-contract  
- [ ] Rollback plan for migration  
- [ ] Event schema version bumped if needed  
- [ ] Reindex / backfill plan for search  

## 10. Operability

- [ ] Runbook updated  
- [ ] Feature flag / kill switch  
- [ ] Rollback steps tested  
- [ ] On-call impact briefing done  

## Sign-off

| Role | Name | Date | OK |
|------|------|------|-----|
| Engineering lead | | | |
| Architect | | | |
| SRE | | | |
| Security | | | N/A |
| Compliance | | | N/A |
