# Cheat sheet — DDD + hexagonal + Micronaut

[← Training home](README.md) · one page to keep open while designing, coding and reviewing.

## Strategic DDD

| Concept | One line | Ask in a review |
|---|---|---|
| Subdomain | A part of the business problem: **core** (why clients pay), supporting, generic | Are we spending our best people on the core? |
| Ubiquitous language | The words the business uses, used unchanged in code | Would a compliance analyst recognise this class name? |
| Bounded context | The boundary inside which one model and one language are consistent | Does this word mean the same thing everywhere it appears here? |
| Context map | The relationships between contexts | Who is upstream? Who adapts to whom? |
| Open host service / published language | One documented, versioned contract for many consumers | Is the API versioned and owned? |
| Anti-corruption layer | Translate another model at the border | Does any upstream DTO reach the domain package? |
| Customer/supplier, conformist | Negotiated vs adopted-as-is upstream model | Is accepting their model a choice or an accident? |

## Tactical DDD

| Building block | Rule of thumb | In the code lab |
|---|---|---|
| Value object | Immutable `record`, validated in the compact constructor, equal by value | `PartyName`, `CountryCode`, `MatchScore` |
| Entity | Identity that survives changes; only changed through its aggregate root | `Match` |
| Aggregate | Consistency boundary: invariants that must be true **at commit** live inside one aggregate | `ScreeningCase` |
| Aggregate rules | Small; reference other aggregates by id; one aggregate per transaction; no public setters | `screen`, `resolveMatch`, `close` |
| Domain event | Past tense fact, raised by the aggregate, pulled after saving | `CaseScreened`, `MatchResolved` |
| Domain service | Stateless domain logic that does not belong to one entity | `NameMatchingPolicy` |
| Repository | Per aggregate root, collection-like, interface in the core | `CaseRepository` port |
| Application service | Orchestration only: load, call the aggregate, save, publish. No business `if`s | `CaseApplicationService` |

**Where does a rule go?** Shape of input (not blank, max length) → Bean Validation on the API record (400).
A value is impossible (bad country code) → value object (400 `INVALID_VALUE`). A rule depends on state
(four-eyes, closing with open matches) → aggregate (422 with a rule code). A rule spans aggregates → domain service,
policy reacting to an event, or a process manager; accept eventual consistency.

## Hexagonal architecture

```text
driving adapters ──▶ port.in (use cases) ──▶ application ──▶ domain
   REST, scheduler,                                 │
   consumers, tests                                 ▼
                                         port.out (interfaces) ◀── driven adapters
                                                                    JDBC, HTTP client, outbox, Kafka
```

- **Dependency rule:** source dependencies point inwards only. `domain` and `application` import no framework.
- Ports are owned by the core and named in domain terms (`ReferenceDataSource`, not `ProfileRestClient`).
- Adapters translate: HTTP JSON ↔ command, rows ↔ snapshot, upstream DTO ↔ domain record (that is the ACL).
- One composition root (`@Factory`) builds the plain-Java core; adapters are ordinary Micronaut beans.
- Return views/DTOs from use cases, not aggregates, so adapters cannot call domain methods.
- Enforce with ArchUnit (`onionArchitecture()` plus "domain is plain Java"); a violation fails the build.

## Micronaut essentials

| Need | Use |
|---|---|
| A bean | `@Singleton` (default choice), `@Prototype`, `@RequestScope`, `@Context` (eager) |
| Build plain-Java objects as beans | `@Factory` class with `@Singleton` methods |
| Typed configuration | `@ConfigurationProperties("screening.matching") record MatchingProperties(int threshold)` |
| Choose an adapter by config | `@Requires(property = "screening.reference-data.mode", value = "http")` |
| Replace a bean (tests, libraries) | `@Replaces(X.class)`, `@MockBean` in `@MicronautTest` |
| Several beans of one type | `@Named("x")` at the injection point, or `@Primary` |
| REST endpoint | `@Controller` + `@Get/@Post/@Put`, `@Body @Valid` record, `@Header` |
| Blocking work (JDBC) | `@ExecuteOn(TaskExecutors.BLOCKING)`; virtual threads on Java 21 |
| JSON | `@Serdeable` records (compile-time Serde, no reflection) |
| Map exceptions to HTTP | `ExceptionHandler<E, HttpResponse<?>>` beans returning problem+json |
| Call another service | Declarative `@Client("reference-data") interface` + `micronaut.http.services.*` config |
| Persistence | `@MappedEntity` rows + `@JdbcRepository(dialect = …)`, `@Version` for optimistic locking |
| Transactions | `TransactionOperations` behind a `UnitOfWork` port (or `@Transactional` in adapters) |
| Schema | Flyway migrations in `db/migration/V1__*.sql` |
| Background work | `@Scheduled(fixedDelay = "…")` in a driving adapter that calls a port |
| Health | `micronaut-management` → `GET /health` |
| Override config at start | `-Dscreening.matching.threshold=60` or `SCREENING_MATCHING_THRESHOLD=60` |

Compile-time DI means a missing bean or a misspelt query method fails at **build** time; put the annotation processors
on the compiler path (see `code-lab/pom.xml`).

## Consistency and integration patterns

| Problem | Pattern |
|---|---|
| Save state and publish an event without losing either | **Transactional outbox**: insert the event in the same transaction; a relay publishes and marks it sent |
| Client retries `POST` | **Idempotency key** stored with the result; replay returns the same resource |
| Consumer receives an event twice | **Inbox / dedupe table** on event id; handlers are idempotent |
| Two users edit one aggregate | **Optimistic locking** (`@Version`) → 409 `CONCURRENT_UPDATE`, client reloads |
| Workflow across aggregates/contexts | **Process manager / saga** reacting to events and sending commands, with its own state |
| Read model differs from write model | **CQRS projection** built from events, idempotent and rebuildable |
| Event schema changes | Additive changes only; `schemaVersion` field; new event type for breaking changes |
| Multi-tenant data | Tenant in every key and query; another tenant's id answers **404, never 403** |
| Replace a legacy system | **Strangler fig** with an ACL at the seam |

## HTTP error contract (code lab)

| Cause | Status |
|---|---|
| Bean Validation failure | 400 |
| `DomainException` with `INVALID_VALUE` | 400 problem+json |
| Any other `DomainException` (`FOUR_EYES`, `CASE_CLOSED`, `MATCHES_AWAITING_REVIEW`, …) | 422 problem+json with `rule` |
| Case missing or owned by another client group | 404 |
| Optimistic-lock conflict | 409 `CONCURRENT_UPDATE` |

## Testing per ring

| Ring | Test | Speed |
|---|---|---|
| Domain | Plain JUnit on aggregates and policies; one test per invariant | ms |
| Application | Use cases with in-memory fakes of each port | ms |
| Adapters | `@MicronautTest`: HTTP contract, real SQL (H2 or Test Resources) | seconds |
| Architecture | ArchUnit rules on every build | ~1 s |
| System | Few end-to-end journeys, consumer contracts | slow, keep few |

## Review checklist (short form of module 14)

1. Does the change use the ubiquitous language, and does it stay inside one bounded context?
2. Is every business rule in the domain, with a test, and none in controllers, SQL or mappers?
3. Is there one aggregate per transaction and no public setter on an aggregate?
4. Do the core packages still import no framework (ArchUnit green)?
5. Is every new external call behind a port, with a timeout, and translated at the border?
6. Are events published through the outbox, with a schema version and idempotent consumers?
7. Is every query and key scoped to the tenant (client group)?
8. Are the errors mapped to the contract above?
9. Is the test at the cheapest ring that can catch the bug?
10. Is there an ADR if the decision will matter in a year?
