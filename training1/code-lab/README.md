# Code lab — `screening-case-service-clean`

The same World-Check-style screening service as [`../../training/code-lab`](../../training/code-lab/README.md), rebuilt
with Clean Architecture: **four Maven modules, one per ring**, with input boundaries, interactors, request and
response models, output boundaries, presenters, gateways and a Main component. Every snippet in the interactive
course comes from this code, and `../assets/js/clean-system.js` models it closely enough that
`node ../tools/check-model.mjs` checks 16 behaviours against it.

| | |
|---|---|
| Java | 21 (records, sealed interfaces, pattern matching, virtual threads) |
| Framework | Micronaut 4.10, **only in `screening-app`** (compile-time DI, Netty, Serde, Data JDBC, Flyway, Management) |
| Storage | H2 in memory (PostgreSQL is an exercise) |
| Port | **8081**, so it can run next to the hexagonal lab on 8080 |
| Tests | 79 in total: 27 entities · 13 use cases · 25 interface adapters · 14 app (API + ArchUnit) |

## Run it

```bash
cd plan/training1/code-lab
../../../mvnw clean install                 # builds the four rings in order and runs all 79 tests
../../../mvnw -pl screening-app exec:java   # starts on http://localhost:8081
curl -s localhost:8081/health
```

With a local Maven, `mvn` works the same way. Stop the service with `Ctrl+C`. One stack trace in the build log is
expected: `OutboxTest` takes the event sink down on purpose to prove the relay stops and retries.

## The four modules

```text
code-lab/
├── pom.xml                         parent: Java 21, versions, module order
├── screening-entities/             RING 1 – enterprise business rules – depends on nothing
│   └── training/clean/screening/entities/
│       ├── model/                  ScreeningCase (aggregate root), Match, value objects, CaseSnapshot
│       ├── event/                  sealed DomainEvent: CaseOpened, CaseScreened, MatchResolved, CaseClosed
│       ├── policy/                 NameMatchingPolicy (domain service), MatchEvaluation
│       └── DomainException         stable rule codes (INVALID_VALUE, FOUR_EYES, …)
├── screening-usecases/             RING 2 – application business rules – depends on entities
│   └── training/clean/screening/usecases/
│       ├── opencase/ screencase/ resolvematch/ closecase/ viewcase/
│       │                           per use case: input boundary, *Interactor, *Request (request model)
│       ├── workqueue/              ListWorkQueue + its own gateway, output boundary and response model
│       ├── shared/                 CaseOutputBoundary, CaseResponse, Outcomes, CaseLookup, RequestValues
│       └── gateway/                CaseGateway, EventOutboxGateway, IdempotencyGateway, ReferenceDataGateway,
│                                   TransactionRunner, ConcurrentCaseUpdateException
├── screening-interface-adapters/   RING 3 – conversion – depends on usecases (plain Java, no Micronaut)
│   └── training/clean/screening/adapters/
│       ├── web/                    CaseController, Forms, CasePresenter, ViewModel, CaseJson, ProblemJson, work queue
│       ├── persistence/            SqlCaseGateway, CaseRecordMapper, CaseRecords (+ records), StaleRecordException
│       ├── events/                 OutboxEventGateway, EventJson (published language v1), OutboxRelay, sink interface
│       └── reference/              RemoteReferenceData, ProfileTranslator (ACL), ReferenceDataApi, InMemoryReferenceData
└── screening-app/                  RING 4 – frameworks & drivers – depends on all three
    ├── training/clean/screening/app/
    │   ├── config/                 MainWiring (@Factory – the Main component), MatchingProperties, SerdeImports
    │   ├── web/                    CaseEndpoint, WorkQueueEndpoint, Responses, MalformedBodyHandler
    │   ├── persistence/            *Row records, Repositories (@JdbcRepository), MicronautCaseRecords,
    │   │                           MicronautOutboxRecords, JdbcIdempotencyGateway, JdbcWorkQueueGateway,
    │   │                           MicronautTransactionRunner
    │   ├── events/                 ScheduledOutboxRelay (@Scheduled), LoggingEventSink
    │   └── reference/              MicronautReferenceDataClient (declarative @Client)
    └── resources/                  application.yml, db/migration/V1__screening_schema.sql
```

The dependency rule is enforced twice: the poms make outward imports fail to **compile**, and
`CleanArchitectureTest` (ArchUnit, six rules) covers what modules cannot express: no framework in rings 1–3,
use cases independent of each other, only `app.config` constructs interactors, web adapters never see entities, and
endpoints only talk to controllers.

## Walk the whole lifecycle with curl

These commands were run against the service and the responses are real (bodies trimmed with `jq`).
`brew install jq` if you do not have it.

```bash
B=http://localhost:8081/api/v1/client-groups/acme-bank/cases
H='Content-Type: application/json'

# 1. Open a case → 201 Created + Location, decided by CasePresenter.presentOpened(response, newlyOpened=true)
curl -s -i -X POST $B -H "$H" -H 'Idempotency-Key: onboarding-42' \
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}'
#   HTTP/1.1 201 Created
#   Location: /api/v1/client-groups/acme-bank/cases/eac6c0c9-…
#   {"caseId":"eac6c0c9-…","status":"CREATED","statusLabel":"Not screened yet","allowedActions":["screen"],"matches":[],…}
CASE=eac6c0c9-…   # take it from the response

# 1b. Same Idempotency-Key again → 200 OK, same caseId, no Location (OpenCaseInteractor found the key)

# 2. Screen → WC-1001 (sanctions) scores 100
curl -s -X POST $B/$CASE/screenings | jq -c '{status, statusLabel, allowedActions, matches: [.matches[] | {profileId, categoryLabel, matchedName, score, resolution}]}'
#   {"status":"PENDING_REVIEW","statusLabel":"Waiting for analyst review","allowedActions":["screen","resolve"],
#    "matches":[{"profileId":"WC-1001","categoryLabel":"Sanctions","matchedName":"Viktor Ionel Albescu","score":100,"resolution":"UNRESOLVED"}]}
MATCH=$(curl -s $B/$CASE | jq -r '.matches[0].matchId')

# 3. Close too early → 422 from an entities invariant, reported via presentRuleViolation
curl -s -X POST $B/$CASE/closure -H "$H" -d '{"analystId":"analyst-anna"}'
#   {"title":"Business rule violated","status":422,"detail":"1 match(es) are unresolved or possible on case …","rule":"MATCHES_AWAITING_REVIEW"}

# 4. Anna confirms the match → REVIEWED, now "close" is offered
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H "$H" \
  -d '{"resolution":"POSITIVE","rationale":"DOB and country match exactly","analystId":"analyst-anna"}'
#   {"status":"REVIEWED","statusLabel":"Reviewed, ready to close","allowedActions":["screen","resolve","close"],…}

# 5. Anna downgrades her own POSITIVE → 422 FOUR_EYES
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H "$H" \
  -d '{"resolution":"FALSE_POSITIVE","rationale":"Different person after all","analystId":"analyst-anna"}'
#   {"title":"Business rule violated","status":422,"detail":"A confirmed positive can only be downgraded by a different analyst than analyst-anna","rule":"FOUR_EYES"}

# 6. Shape errors → 400 MALFORMED_REQUEST from Forms in ring 3; no use case runs
curl -s -X PUT $B/$CASE/matches/$MATCH/resolution -H "$H" -d '{"resolution":"MAYBE","rationale":"","analystId":"analyst-ben"}'
#   {"title":"Malformed request","status":400,"rule":"MALFORMED_REQUEST",
#    "errors":["resolution: must be one of FALSE_POSITIVE, POSITIVE, POSSIBLE","rationale: must not be blank"],…}

# 6b. A body the framework cannot bind → the same problem shape, from MalformedBodyHandler in ring 4
curl -s -X POST $B -H "$H" -d '{"name":"Jane Whitfield","entityType":"INDIVIDUAL","dateOfBirth":"yesterday"}'
#   {"title":"Malformed request","status":400,"detail":"body: cannot be read","rule":"MALFORMED_REQUEST","errors":["body: cannot be read"]}

# 6c. Well-formed but meaningless → 400 INVALID_VALUE from a value object in ring 1
curl -s -X POST $B -H "$H" -d '{"name":"Northwind Capital","entityType":"ORGANISATION","dateOfBirth":"1990-01-01"}'
#   {"title":"Invalid value","status":400,"detail":"An organisation has no date of birth","rule":"INVALID_VALUE"}

# 7. Another client group → 404, indistinguishable from a missing case (CaseLookup)
curl -s http://localhost:8081/api/v1/client-groups/globex-bank/cases/$CASE
#   {"title":"Case not found","status":404,"detail":"Case not found: eac6c0c9-…"}

# 8. Ben closes it
curl -s -X POST $B/$CASE/closure -H "$H" -d '{"analystId":"analyst-ben"}' | jq -c '{status, statusLabel, outcome, closedBy, allowedActions}'
#   {"status":"CLOSED","statusLabel":"Closed","outcome":"RISK_CONFIRMED","closedBy":"analyst-ben","allowedActions":[]}

# 9. A closed case cannot be screened → 422 CASE_CLOSED
curl -s -X POST $B/$CASE/screenings
#   {"title":"Business rule violated","status":422,"detail":"Cannot screen closed case …","rule":"CASE_CLOSED"}

# 10. The analyst work queue (ListWorkQueueInteractor): HIGH, then MEDIUM, then LOW, oldest first
curl -s -X POST $B -H "$H" -d '{"name":"Jane Whitfield","entityType":"INDIVIDUAL","country":"GB"}' > /dev/null
C2=$(curl -s -X POST $B -H "$H" -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL"}' | jq -r .caseId)
curl -s -X POST $B/$C2/screenings > /dev/null
curl -s "localhost:8081/api/v1/client-groups/acme-bank/work-queue?limit=10" | jq -c '.items[] | {partyName, status, priority, unresolvedMatches, highestScore}'
#   {"partyName":"Viktor Albescu","status":"PENDING_REVIEW","priority":"HIGH","unresolvedMatches":2,"highestScore":100}
#   {"partyName":"Jane Whitfield","status":"CREATED","priority":"LOW","unresolvedMatches":0,"highestScore":0}
curl -s "localhost:8081/api/v1/client-groups/acme-bank/work-queue?limit=500"
#   {"title":"Invalid value","status":400,"detail":"Limit must be 1-100: 500","rule":"INVALID_VALUE"}
```

About two seconds later `ScheduledOutboxRelay` runs `OutboxRelay.publishPending()` and the log shows every event in
the published language:

```text
INFO  t.c.s.app.events.LoggingEventSink - Published CaseClosed for case eac6c0c9-… ({"schemaVersion":1,"eventId":"b53c…",
      "type":"CaseClosed","caseId":"eac6c0c9-…","clientGroupId":"acme-bank","occurredAt":"…","outcome":"RISK_CONFIRMED","closedBy":"analyst-ben"})
```

Null fields are left out of responses; empty lists are kept, so a closed case shows `"allowedActions": []`.

### Error contract – and which ring decides

| Situation | Status | `rule` | Decided by |
|---|---|---|---|
| No such route | 404 | — | Micronaut router (ring 4) |
| Body cannot be bound (bad JSON, bad date) | 400 | `MALFORMED_REQUEST` (`body: cannot be read`) | `MalformedBodyHandler` (ring 4) |
| Shape: missing, wrong format, too long, unknown enum | 400 | `MALFORMED_REQUEST` + `errors[]` | `Forms` via `CaseController` (ring 3) |
| A value object rejects a value | 400 | `INVALID_VALUE` | value objects (ring 1) → `presentInvalidRequest` |
| Case missing or owned by another client group | 404 | — | `CaseLookup` (ring 2) → `presentNotFound` |
| An invariant: `FOUR_EYES`, `CASE_CLOSED`, `MATCHES_AWAITING_REVIEW`, `NOT_SCREENED`, `MATCH_NOT_FOUND`, `RESOLUTION_REQUIRED` | 422 | the rule | `ScreeningCase` (ring 1) → `presentRuleViolation` |
| Optimistic-lock conflict | 409 | `CONCURRENT_UPDATE` | `@Version` (ring 4) → `SqlCaseGateway` (ring 3) → `presentConflict` |

Every problem body is `application/problem+json` and every HTTP decision is made in exactly one class:
`CasePresenter` (or `WorkQueuePresenter`). `CaseEndpoint` only copies the view model into a response.

## Configuration: swap a detail, keep the rings

```yaml
screening:
  matching:
    threshold: 80          # read by MainWiring → new NameMatchingPolicy(80); validated 50–100 at startup
  reference-data:
    mode: in-memory        # in-memory | http  → MainWiring picks InMemoryReferenceData or RemoteReferenceData
  events:
    sink: log              # a Kafka sink is exercise 1
  outbox:
    relay-interval: 2s
```

Override at startup without editing files, e.g. `SCREENING_MATCHING_THRESHOLD=95 ../../../mvnw -pl screening-app exec:java`.
With `mode: http` the service calls `micronaut.http.services.reference-data.url` (default `http://localhost:9090`)
through `MicronautReferenceDataClient`.

## Tests

| Test class | Ring | Tests | What it proves |
|---|---|---|---|
| `ScreeningCaseTest` | 1 | 15 | every invariant of the aggregate, events raised, snapshot round trip |
| `NameMatchingPolicyTest` | 1 | 12 | transliteration, word order, organisation noise words, DOB and country adjustments |
| `CaseUseCasesTest` | 2 | 10 | lifecycle, idempotent replay, invalid values, reference data outside the write transaction, tenancy for every use case, rollback, conflict |
| `ListWorkQueueInteractorTest` | 2 | 3 | triage order, limit, tenancy |
| `CasePresenterTest` | 3 | 6 | 201 + Location, 200 replay, labels, allowed actions, one status per failure kind |
| `CaseControllerTest` | 3 | 6 | form → request model, shape errors stop before any use case, the presenter's view model is returned |
| `SqlCaseGatewayTest` | 3 | 4 | aggregate ↔ records round trip, rescreening, stale version → `ConcurrentCaseUpdateException` |
| `OutboxTest` | 3 | 4 | published language v1, order, stop at first failure, resume |
| `ReferenceDataTest` | 3 | 5 | provider codes translated by the ACL, unknown records dropped |
| `CaseApiTest` | 4 | 8 | the wiring: HTTP, Serde, error handler, transactions, Flyway, work queue |
| `CleanArchitectureTest` | 4 | 6 | the dependency rule and the rules modules cannot express |

Rings 1–3 use hand-written fakes (`TestWorld`, `RecordingPresenter`, `InMemoryCaseRecords`, `InMemoryOutboxRecords`)
that honour the gateway contracts, including versions and rollback. Only ring 4 starts Micronaut.

**Break the rule on purpose.** Add `import io.micronaut.core.annotation.Introspected;` to
`screening-entities/…/model/CaseId.java`: the build fails at compile time because ring 1 has no Micronaut on its
classpath. Then let `CaseController` depend on a concrete interactor, which the poms allow because ring 3 may see ring 2:

```java
boolean demoBreak() { return openCase instanceof training.clean.screening.usecases.opencase.OpenCaseInteractor; }
```

Run `../../../mvnw test -pl screening-app -am -Dtest=CleanArchitectureTest -Dsurefire.failIfNoSpecifiedTests=false`.
It compiles, and the architecture test fails with:

```text
Rule 'classes that have simple name ending with 'Interactor' should only have dependent classes that reside in any
package ['training.clean.screening.usecases..', 'training.clean.screening.app.config..'], …' was violated (1 times):
Method <training.clean.screening.adapters.web.CaseController.demoBreak()> checks instanceof <…OpenCaseInteractor>
```

Revert both. (An unused import alone would not trip ArchUnit: it reads bytecode, and unused imports leave none.)

## Exercises

Each has a definition of done. Exercises 1–4 are the katas of the facilitator guide; exercise 6 is the capstone in
module 17 of the course.

1. **Kafka event sink (ring 4 only).** Add `micronaut-kafka` to `screening-app`, write
   `KafkaEventSink implements IntegrationEventSink` with `@Requires(property = "screening.events.sink", value = "kafka")`,
   keyed by case id. *Done when:* `git diff --stat` shows changes only under `screening-app`, `sink: log` still works,
   and a Test Resources test consumes `CaseClosed`.
2. **A second delivery mechanism: a CLI.** Add `CliController` and `CliCasePresenter` (ring 3, implements
   `CaseOutputBoundary`, exit codes per outcome) and a `main` in ring 4 that closes the cases listed in a CSV file.
   *Done when:* no file in `screening-usecases` or `screening-entities` changed, and `CliCasePresenter` has a unit test.
3. **A v2 case representation.** Clients want `status` as an object `{code, label}`. Add `CasePresenterV2`, `CaseJsonV2`
   and a `/api/v2` endpoint calling the same input boundaries. *Done when:* v1 responses are byte-for-byte unchanged and
   no interactor changed.
4. **PostgreSQL and `SKIP LOCKED`.** Replace H2 with PostgreSQL via Test Resources; claim outbox rows with
   `FOR UPDATE SKIP LOCKED` inside `MicronautOutboxRecords`; run two relays in a test. *Done when:* each event is
   published once and `OutboxRelay` (ring 3) did not change.
5. **Resilience on reference data.** Add a timeout, `@Retryable` and `@CircuitBreaker` to `MicronautReferenceDataClient`;
   decide in an ADR (`plan/templates/adr-template.md`) what screening reports when reference data is down – a new
   output-boundary method, or an existing one? *Done when:* a stub server that hangs makes requests fail fast with a
   clear problem+json, and the decision is tested in `CaseUseCasesTest`.
6. **Capstone.** Senior closure for sanctions positives plus the CLI, through all four rings – see module 17.

## Compared with the hexagonal lab

| | `plan/training/code-lab` (hexagonal) | this lab (Clean) |
|---|---|---|
| Modules | 1 | 4 (one per ring) |
| Production source files | 70 | 110 (98 without the work queue, which the hexagonal lab lacks) |
| Enforcement | ArchUnit | compiler (poms) + ArchUnit |
| Use case API | `CaseView screen(command)` – returns a view, throws domain exceptions | `void execute(request, presenter)` – every outcome is a presenter call |
| HTTP decisions | controller + `ProblemHandlers` | `CasePresenter` only |
| JSON annotations | `@Serdeable` on adapter records | none in rings 1–3 (`@SerdeImport` in ring 4) |
| Persistence mapping | aggregate ↔ Micronaut Data rows in one adapter | aggregate ↔ plain records (ring 3) ↔ rows (ring 4) |
| Transactions | `UnitOfWork` port | `TransactionRunner` gateway |

See [`../clean-vs-hexagonal.md`](../clean-vs-hexagonal.md) for when to choose which.

## Diagrams

The SVGs in `../assets/diagrams/` describe this exact code base; see them all on [`../diagrams.html`](../diagrams.html).
