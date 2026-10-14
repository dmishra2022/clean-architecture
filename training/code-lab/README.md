# Code lab — `screening-case-service`

A small, complete, runnable World-Check-style service that is the reference implementation for the whole course.
Every snippet in the interactive tutorial is taken from this code base, and the JavaScript simulators in
`../assets/js/domain.js` port its domain logic line for line.

| | |
|---|---|
| Java | 21 (records, sealed interfaces, pattern matching, virtual threads) |
| Framework | Micronaut 4.10 (compile-time DI, Netty HTTP, Serde, Validation, Data JDBC, Flyway, Management) |
| Storage | H2 in memory (PostgreSQL is an exercise) |
| Tests | 46 — domain, application, persistence, HTTP API and ArchUnit architecture rules |

## Run it

```bash
cd plan/training/code-lab
mvn test                    # 46 tests; a few seconds once Maven has downloaded the dependencies
mvn compile exec:java       # starts on http://localhost:8080
curl -s localhost:8080/health
```

Without a local Maven, use the wrapper at the repository root: `../../../mvnw test`.
Stop the service with `Ctrl+C`.

## Walk the whole lifecycle with curl

These commands were run against the service; the responses shown are real (ids shortened).
`jq` is used to pull ids out of responses (`brew install jq`).

```bash
B=http://localhost:8080/api/v1/client-groups/acme-bank/cases

# 1. Open a case (201). Repeat the same Idempotency-Key and you get the same case back, not a second one.
CASE=$(curl -s -X POST $B -H 'Content-Type: application/json' -H 'Idempotency-Key: onboarding-42' \
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}' | jq -r .caseId)

# 2. Screen it against the reference data. Viktor Ionel Albescu (WC-1001, sanctions) scores 100.
MATCH=$(curl -s -X POST $B/$CASE/screenings | tee /dev/stderr | jq -r '.matches[0].matchId')
#   {"status":"PENDING_REVIEW","matches":[{"profileId":"WC-1001","score":100,"resolution":"UNRESOLVED",...}]}

# 3. Try to close too early -> 422, rule MATCHES_AWAITING_REVIEW (a domain invariant, not a validation error)
curl -s -X POST $B/$CASE/closure -H 'Content-Type: application/json' -d '{"analystId":"analyst-anna"}'

# 4. Anna confirms the match
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H 'Content-Type: application/json' \
  -d '{"resolution":"POSITIVE","rationale":"DOB and country match exactly","analystId":"analyst-anna"}'

# 5. Anna tries to downgrade her own POSITIVE -> 422, rule FOUR_EYES
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H 'Content-Type: application/json' \
  -d '{"resolution":"FALSE_POSITIVE","rationale":"Different person","analystId":"analyst-anna"}'

# 6. A malformed body -> 400 from Bean Validation, before any use case runs
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H 'Content-Type: application/json' \
  -d '{"resolution":"MAYBE","rationale":"","analystId":"analyst-ben"}'

# 7. Another client group asks for the case -> 404 (never 403: do not confirm the case exists)
curl -s http://localhost:8080/api/v1/client-groups/globex-bank/cases/$CASE

# 8. Ben closes the case -> {"status":"CLOSED","outcome":"RISK_CONFIRMED","closedBy":"analyst-ben"}
curl -s -X POST $B/$CASE/closure -H 'Content-Type: application/json' -d '{"analystId":"analyst-ben"}'
```

Within about 2 seconds the `OutboxRelay` publishes every event from the outbox table and the log shows lines like:

```text
INFO  LoggingEventSink - Published CaseClosed for case 7700…  ({"schemaVersion":1,"type":"CaseClosed","outcome":"RISK_CONFIRMED",…})
```

Null fields and empty lists are left out of JSON responses, so a freshly opened case has no `matches` field.

### Error contract

| Situation | Status | Body |
|---|---|---|
| Body fails Bean Validation (shape) | 400 | Micronaut's default error JSON |
| Value object rejects a value (`INVALID_VALUE`) | 400 | `application/problem+json` with `rule` |
| Any other domain rule (`FOUR_EYES`, `CASE_CLOSED`, `MATCHES_AWAITING_REVIEW`, `NOT_SCREENED`, `MATCH_NOT_FOUND`, `RESOLUTION_REQUIRED`) | 422 | problem+json with `rule` |
| Case missing or owned by another client group | 404 | problem+json |
| Optimistic-lock conflict | 409 | problem+json, `rule: CONCURRENT_UPDATE` |

## Map of the code

```text
src/main/java/training/worldcheck/screening/
├── domain/                     plain Java, no framework imports (ArchUnit enforces this)
│   ├── model/                  ScreeningCase (aggregate root), Match, value objects as records, snapshots
│   ├── event/                  sealed DomainEvent + CaseOpened, CaseScreened, MatchResolved, CaseClosed
│   └── service/                NameMatchingPolicy (domain service), MatchEvaluation
├── application/                plain Java use cases
│   ├── port/in/                OpenCase/ScreenCase/ResolveMatch/CloseCase use cases, FindCaseQuery, CaseView
│   ├── port/out/               CaseRepository, ReferenceDataSource, DomainEventOutbox, IdempotencyStore, UnitOfWork
│   └── CaseApplicationService  orchestrates: load → call aggregate → save → append events, in one unit of work
├── adapter/
│   ├── in/rest/                CaseController, ApiModels (HTTP contract), ProblemHandlers (exception → HTTP)
│   └── out/
│       ├── persistence/        Micronaut Data JDBC rows + repositories, JdbcCaseRepository, JdbcUnitOfWork
│       ├── reference/          InMemoryReferenceDataSource | HttpReferenceDataSource (+ declarative @Client)
│       └── events/             OutboxEventAppender, OutboxRelay (@Scheduled), IntegrationEventSink, LoggingEventSink
└── config/                     ApplicationWiring (@Factory composition root), MatchingProperties
src/main/resources/
├── application.yml             threshold, adapter switches, relay interval
└── db/migration/V1__screening_schema.sql
```

The two lines in `application.yml` that demonstrate "swap the adapter, keep the core":

```yaml
screening:
  reference-data:
    mode: in-memory   # in-memory | http  → @Requires picks InMemoryReferenceDataSource or HttpReferenceDataSource
  events:
    sink: log         # add a Kafka sink with @Requires(value = "kafka") in exercise 1
```

Each property can be overridden at start-up without editing files, for example
`SCREENING_MATCHING_THRESHOLD=60 mvn compile exec:java`.

## Tests

| Test class | Layer | What it proves |
|---|---|---|
| `ScreeningCaseTest` | domain | every invariant of the aggregate, no Micronaut, milliseconds |
| `NameMatchingPolicyTest` | domain | transliteration, word order, organisation noise words, DOB and country adjustments |
| `CaseApplicationServiceTest` | application | orchestration, idempotency, transaction boundaries with in-memory fakes of the ports |
| `JdbcCaseRepositoryTest` | adapter | the mapping round-trips through real SQL and the version check raises `ConcurrentCaseUpdateException` |
| `CaseApiTest` | adapter | HTTP contract and status codes, with the full application context on a random port |
| `HexagonalArchitectureTest` | architecture | dependencies point inwards; domain and application are plain Java; adapters use ports |

Break the architecture on purpose to see the guard rail work: add
`import io.micronaut.core.annotation.Introspected;` and the annotation to `domain/model/CaseId.java`, then run
`mvn test -Dtest=HexagonalArchitectureTest`. The `domainIsPlainJava` rule fails with 35 violations, most of them in
the `$CaseId$Introspection` class that Micronaut generated into the domain package. Remove the annotation and run
`mvn clean test` to get back to green.

## Exercises

Do these in order; each has a definition of done. Exercises 1–4 are the hands-on part of the facilitator guide
(`../facilitator-guide.md`), and exercise 6 is the course capstone.

1. **Kafka event sink (new driven adapter).** Add `micronaut-kafka`, write `KafkaEventSink implements IntegrationEventSink`
   annotated `@Requires(property = "screening.events.sink", value = "kafka")`, keyed by case id so events of one case
   stay ordered. Use Test Resources to start Kafka in a test.
   *Done when:* nothing under `domain/` or `application/` changed, `sink: log` still works, and a test consumes `CaseClosed`.

2. **`RescreenJob` (new driving adapter).** A `@Scheduled(cron = …)` bean that re-screens every open case older than
   N days through `ScreenCaseUseCase`, one case per transaction, continuing past failures.
   *Done when:* the job depends only on ports, a test drives it directly, and a resolved match stays resolved after a re-screen.

3. **Analyst work-queue read model (CQRS).** A projection table filled from integration events
   (`case_id, client_group, status, unresolved_count, highest_score`) and `GET /api/v1/client-groups/{g}/work-queue`
   sorted by highest score. *Done when:* the aggregate is not loaded to serve the query, the projection is idempotent
   (replaying an event twice changes nothing), and it is tenant-scoped.

4. **PostgreSQL with Test Resources.** Replace H2 with PostgreSQL, make the relay use `FOR UPDATE SKIP LOCKED`, and run two
   relay instances in a test. *Done when:* each event is published exactly once by the relays and the migrations run unchanged.

5. **Resilience on the reference-data client.** Add a timeout, `@Retryable` for idempotent reads, and `@CircuitBreaker` to
   `HttpReferenceDataSource`; decide (and write an ADR from `plan/templates/adr-template.md`) what screening does when
   reference data is down. *Done when:* a test with a stub server that hangs proves requests fail fast with a clear problem+json.

6. **Senior review capstone.** Pick any change you made above, open it as a pull request and review it with the checklist in
   module 14 of the tutorial. Then present the design to a peer as a 10-minute walkthrough using diagrams `06`, `07` and `09`.

## Diagrams

The SVG diagrams in `../assets/diagrams/` describe this exact code base. View them all on `../diagrams.html`.
