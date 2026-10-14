# Architecture questions (insider knowledge)

Use in interviews with leads in **first 30 days**. Record answers; link to ADRs/wiki.

| Field | Value |
|-------|--------|
| **Started** | YYYY-MM-DD |
| **Completed** | |

## Screening and matching

| # | Question | Asked of | Answer summary | Link |
|---|----------|----------|----------------|------|
| 1 | What is the authoritative store for matches — case service or screening orchestrator? | | | |
| 2 | How is match algorithm version stamped on results for audit? | | | |
| 3 | What happens to in-flight cases when corpus data version updates? | | | |
| 4 | Sync vs async: who decides default per client group? | | | |

## Case and workflow

| # | Question | Asked of | Answer summary | Link |
|---|----------|----------|----------------|------|
| 5 | Case state machine — single service or distributed saga? | | | |
| 6 | How is analyst rationale stored for regulator export? | | | |
| 7 | Can API clients resolve matches without UI parity? | | | |

## Tenancy and security

| # | Question | Asked of | Answer summary | Link |
|---|----------|----------|----------------|------|
| 8 | Where is client group enforced — gateway only or every service? | | | |
| 9 | How are API keys rotated without client downtime? | | | |

## Operations

| # | Question | Asked of | Answer summary | Link |
|---|----------|----------|----------------|------|
| 10 | Which single user journey caused the last SEV-2 and why? | SRE | | postmortem |

## Additional questions discovered

| # | Question | Asked of | Answer |
|---|----------|----------|--------|
| 11 | | | |
| 12 | | | |
