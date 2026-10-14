# Cheat sheet — DDD + Clean Architecture + Micronaut

[← Training home](README.md) · one page to keep open while designing, coding and reviewing.

## The four rings

```text
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ 4  FRAMEWORKS & DRIVERS   Micronaut, Netty, Serde, Data JDBC, Flyway, H2      │  screening-app
 │  ┌────────────────────────────────────────────────────────────────────────┐  │
 │  │ 3  INTERFACE ADAPTERS  controllers, presenters, view models, gateways  │  │  screening-interface-adapters
 │  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
 │  │  │ 2  USE CASES   interactors, input/output boundaries, models,     │  │  │  screening-usecases
 │  │  │                gateway interfaces                                │  │  │
 │  │  │  ┌────────────────────────────────────────────────────────────┐  │  │  │
 │  │  │  │ 1  ENTITIES   aggregates, value objects, events, policies   │  │  │  │  screening-entities
 │  │  │  └────────────────────────────────────────────────────────────┘  │  │  │
 │  │  └──────────────────────────────────────────────────────────────────┘  │  │
 │  └────────────────────────────────────────────────────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────┘
          source-code dependencies point INWARDS only · data crosses as plain structures
```

- **The dependency rule:** nothing in an inner ring names anything in an outer ring – no class, function, annotation
  or data format.
- **Crossing outwards** (the use case must call the presenter or the database): the inner ring owns an interface; the
  outer ring implements it. Flow of control goes out, the source dependency still points in (dependency inversion).
- **What crosses a boundary:** request and response models – plain records. Never entities, rows or `HttpRequest`.
- **Main** (`MainWiring` `@Factory`) is the dirtiest component: it knows every concrete class, so nobody else has to.

## Strategic and tactical DDD inside ring 1

| Building block | Rule of thumb | In the code lab |
|---|---|---|
| Bounded context | One model and one language; usually one service = one set of rings | Screening Case |
| Ubiquitous language | Business words, unchanged, in ring 1 and in use-case names | `ScreeningCase`, `resolveMatch`, `FOUR_EYES` |
| Value object | Immutable `record`, validated in the compact constructor | `PartyName`, `CountryCode`, `MatchScore` |
| Entity | Identity that survives changes; changed only through its root | `Match` |
| Aggregate | Invariants true at commit; one aggregate per transaction; no setters | `ScreeningCase` (7 invariants) |
| Domain event | Past tense, raised by the aggregate, pulled after saving | sealed `DomainEvent`: `CaseOpened` … `CaseClosed` |
| Domain service | Stateless rule that belongs to no single entity | `NameMatchingPolicy` (threshold 80) |
| Anti-corruption layer | Translate the other model at the border, in ring 3 | `ProfileTranslator` in `RemoteReferenceData` |
| Published language | Versioned contract for consumers, built in ring 3 | `EventJson`, `schemaVersion: 1` |

**Enterprise vs application rule.** Would the rule hold if there were no software (four eyes, no closing with open
matches)? → ring 1. Is it about *this* application's flow (fetch reference data outside the write transaction,
idempotent open, tenant scoping, work-queue priority)? → ring 2.

## Where does it go?

| You are writing… | Ring | Class in the lab |
|---|---|---|
| An invariant, a calculation on domain data | 1 | `ScreeningCase.close`, `NameMatchingPolicy.evaluate` |
| An impossible value (bad country code, organisation with a DOB) | 1 | value object → 400 `INVALID_VALUE` |
| Orchestration: load, call entities, save, publish, decide the outcome | 2 | `ScreenCaseInteractor` |
| The interface for something the use case needs from outside | 2 | `CaseGateway`, `ReferenceDataGateway`, `TransactionRunner` |
| The input shape of one use case | 2 | `ResolveMatchRequest` (strings in, values built by the interactor) |
| Syntax of input: blank, too long, unknown enum | 3 | `Forms` via `CaseController` → 400 `MALFORMED_REQUEST` |
| HTTP status, labels, allowed actions, JSON shape | 3 | `CasePresenter`, `ViewModel`, `CaseJson`, `ProblemJson` |
| Mapping aggregate ↔ storage shape, no driver | 3 | `SqlCaseGateway`, `CaseRecordMapper`, `CaseRecords` |
| Annotations, SQL, HTTP server, config, scheduling | 4 | `CaseEndpoint`, `MicronautCaseRecords`, `ScheduledOutboxRelay` |
| Choosing implementations, reading config | 4 (Main) | `MainWiring` |

## Anatomy of one use case

```text
CaseEndpoint (4) ─▶ CaseController (3) ─▶ ScreenCase «input boundary» (2)
                                               ▲ implements
                                     ScreenCaseInteractor (2) ──▶ ScreeningCase, NameMatchingPolicy (1)
                                         │  uses  CaseGateway, ReferenceDataGateway, EventOutboxGateway,
                                         │        TransactionRunner «interfaces in 2, implemented in 3/4»
                                         ▼
                              CaseOutputBoundary «interface in 2» ◀── implements ── CasePresenter (3) ─▶ ViewModel
```

```java
public interface ScreenCase { void execute(ScreenCaseRequest request, CaseOutputBoundary presenter); }

public interface CaseOutputBoundary {
    void presentOpened(CaseResponse response, boolean newlyOpened);
    void presentCase(CaseResponse response);
    void presentInvalidRequest(String rule, String message);
    void presentRuleViolation(String rule, String message);
    void presentNotFound(String caseId);
    void presentConflict(String caseId);
}
```

Every outcome, success or failure, is a call on the output boundary. The endpoint is a **humble object**: it copies the
view model into an `HttpResponse` and decides nothing.

## Principles behind the rings

| Principle | One line | Smell when broken |
|---|---|---|
| SRP | A module has one reason to change: one actor | Controller changes for a rule, a column and a status code |
| OCP | Extend by adding code, not editing policy | New delivery mechanism needs an `if` in the interactor |
| LSP | Implementations honour the contract | A fake gateway that ignores versions hides a 409 bug |
| ISP | Depend only on what you use | One `CaseRepository` with 30 methods for every use case |
| DIP | Policy owns the abstraction; details implement it | Interactor imports `MicronautCaseRecords` |
| REP / CCP / CRP | Release together, change together, reuse together | One module per class, or one module for everything |
| ADP | No cycles between components | `usecases` ↔ `interface-adapters` cycle (Maven refuses it) |
| SDP | Depend towards stability (lower I) | Entities depending on anything |
| SAP | Stable components should be abstract | Stable, concrete `common` module (zone of pain) |

Metrics: `I = Ce / (Ca + Ce)`, `A = abstract types / all types`, `D = |A + I − 1|`.
Lab: entities I 0 · A 0.03 · D 0.97 (stable and concrete on purpose: they are the policy), use cases 0.33 / 0.38 /
0.29, adapters 0.67 / 0.13 / 0.21, app 1 / 0.20 / 0.20.

## Boundaries: full or partial

| Boundary | Cost | Use when |
|---|---|---|
| Full: separate modules, input + output boundaries, models | Highest | Core subdomain, several delivery mechanisms, many teams |
| Skip the last step: interfaces in place, same module | Medium | You expect to split later; enforce with ArchUnit |
| One-dimensional: strategy interface on one side only | Low | One stable consumer (lab: `WorkQueueGateway` read model) |
| Facade: one class in front of the rest | Lowest | Supporting or generic subdomain, CRUD |

Do not pay for a full boundary you have no reason to expect (the **decoupling fallacy** is believing every boundary
must be full and deployable).

## Micronaut essentials (ring 4 only)

| Need | Use |
|---|---|
| Build plain rings 2–3 classes as beans | `@Factory class MainWiring` with `@Singleton` methods |
| Typed, validated configuration | `@ConfigurationProperties("screening.matching") record MatchingProperties(@Min(50) @Max(100) int threshold)` |
| Pick an implementation by config | `@Requires(property = "screening.reference-data.mode", value = "http")` |
| JSON for ring-3 records without annotating them | `@SerdeImport(CaseJson.class)` in `SerdeImports` |
| Endpoint | `@Controller` + `@Get/@Post/@Put`, `@ExecuteOn(TaskExecutors.BLOCKING)` |
| Replace a framework bean | `@Replaces(ConversionErrorHandler.class)` → `MalformedBodyHandler` |
| Persistence | `@MappedEntity` rows + `@JdbcRepository`, `@Version` → `OptimisticLockException` |
| Transactions | `TransactionOperations` behind the ring-2 `TransactionRunner` |
| Background work | `@Scheduled(fixedDelay = "${screening.outbox.relay-interval}")` calling ring-3 `OutboxRelay` |
| Call another service | Declarative `@Client("reference-data")` implementing ring-3 `ReferenceDataApi` |
| Override config at start | `SCREENING_MATCHING_THRESHOLD=95` or `-Dscreening.matching.threshold=95` |

## Consistency and integration patterns

| Problem | Pattern | Where in the rings |
|---|---|---|
| Save state and publish without losing either | Transactional outbox | interactor appends via `EventOutboxGateway` (2) → `OutboxEventGateway` (3) → row (4); `OutboxRelay` (3) on a schedule (4) |
| Client retries `POST` | Idempotency key | `OpenCaseInteractor` (2) + `IdempotencyGateway` |
| Two analysts edit one case | Optimistic locking | `@Version` (4) → `StaleRecordException` (3) → `ConcurrentCaseUpdateException` (2) → `presentConflict` → 409 |
| Read model differs from write model | Query gateway bypassing entities | `ListWorkQueueInteractor` + `JdbcWorkQueueGateway` |
| Workflow across services | Process manager with its own state | its own use cases; reacts to events, sends commands |
| Event schema change | Additive fields, `schemaVersion`, new type for breaking change | `EventJson` (3) |
| Multi-tenant data | Tenant in every lookup; another tenant's case is **404** | `CaseLookup` (2) |

## HTTP error contract (code lab)

| Cause | Status | Decided in |
|---|---|---|
| Body cannot be bound | 400 `MALFORMED_REQUEST` | `MalformedBodyHandler` (4) |
| Shape errors | 400 `MALFORMED_REQUEST` + `errors[]` | `Forms` (3) |
| Value object rejects a value | 400 `INVALID_VALUE` | ring 1 → `presentInvalidRequest` |
| Missing or other tenant's case | 404 | `CaseLookup` → `presentNotFound` |
| Invariant (`FOUR_EYES`, `CASE_CLOSED`, `MATCHES_AWAITING_REVIEW`, `NOT_SCREENED`, …) | 422 + `rule` | ring 1 → `presentRuleViolation` |
| Optimistic-lock conflict | 409 `CONCURRENT_UPDATE` | ring 4 → 3 → 2 → `presentConflict` |

## Testing per ring

| Ring | Test | Needs | Speed |
|---|---|---|---|
| 1 Entities | Plain JUnit, one test per invariant | nothing | ms |
| 2 Use cases | Interactors with fake gateways and a recording presenter | `TestWorld`, `RecordingPresenter` | ms |
| 3 Adapters | Presenter, controller, gateway mapping, outbox, ACL | in-memory records | ms |
| 4 Frameworks | `@MicronautTest` over HTTP and real SQL | H2 / Test Resources | seconds |
| Architecture | Six ArchUnit rules + the compiler | — | ~1 s |

Fakes must honour the gateway contract (versions, rollback) or ring-2 tests will pass bugs ring 4 then finds.

## Review checklist (short form of module 15)

1. Does every new class sit in the ring the "where does it go" table says, and does its module compile without
   Micronaut (rings 1–3)?
2. Is every business rule in ring 1 or 2, with a test there, and none in a controller, presenter, SQL or endpoint?
3. Does the use case take a request model and report every outcome through the output boundary – no return value,
   no exception escaping to the controller?
4. Do presenters receive response models only, never entities?
5. Is each new outside dependency an interface owned by ring 2, implemented outward?
6. Are use cases independent of each other (shared code only in `shared/` and `gateway/`)?
7. Is the boundary as full as it needs to be – and no fuller?
8. Is every lookup scoped to the client group, and is a cross-tenant id a 404?
9. Are events written through the outbox with a schema version?
10. Is the test at the cheapest ring that can catch the bug, and does `CleanArchitectureTest` still pass?
11. Is there an ADR if the decision will matter in a year?
