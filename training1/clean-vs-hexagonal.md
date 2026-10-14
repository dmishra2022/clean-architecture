# Clean Architecture vs hexagonal — measured on the two code labs

[← Training home](README.md) · [hexagonal course](../training/README.md)

Both labs implement the same screening case service on the same DDD model, the same HTTP API and the same Micronaut
stack. `ScreeningCase`, its seven invariants, the value objects, the events and `NameMatchingPolicy` are essentially
identical. So the differences below are the architecture styles themselves, not the domain or the framework.

**Short version.** Hexagonal and Clean share the one rule that matters: source dependencies point at the business
rules. Hexagonal asks for that and stops. Clean also makes you name the rings, give each use case its own request and
response models, send every outcome through a presenter, and (in this lab) put each ring in its own module so the
compiler enforces the rule. You get stronger guarantees and more types.

## The same idea, different vocabulary

| Hexagonal (`plan/training`) | Clean (`plan/training1`) |
|---|---|
| Domain (inside the hexagon) | Ring 1 – Entities (enterprise business rules) |
| Application service, driving ports (`port.in`) | Ring 2 – Use cases: input boundaries + interactors |
| Driven ports (`port.out`) | Ring 2 – Gateway interfaces and the output boundary |
| Driving adapters (REST controller) | Ring 3 controllers + ring 4 endpoints |
| Driven adapters (JDBC, HTTP client, outbox) | Ring 3 gateways (mapping) + ring 4 drivers (Micronaut Data, `@Client`) |
| Composition root (`ApplicationWiring`) | The Main component (`MainWiring`) |
| — | Presenters and view models (ring 3) |
| — | Request and response models per use case |

Hexagonal has two sides (inside/outside, left/right). Clean has concentric rings and splits the inside into enterprise
rules and application rules, and the outside into conversion (ring 3) and frameworks (ring 4).

## One operation in both labs: resolve a match

**Hexagonal.** The controller builds domain value objects, calls a port that *returns* a view, and lets exceptions
travel to `ProblemHandlers`, which choose the HTTP status:

```java
// adapter/in/rest/CaseController.java
@Put("/{caseId}/matches/{matchId}/resolution")
public CaseResponse resolve(String clientGroupId, String caseId, String matchId, @Valid @Body ResolveMatchRequest request) {
    return CaseResponse.of(resolveMatch.resolve(new ResolveMatchCommand(
            new ClientGroupId(clientGroupId), CaseId.of(caseId), MatchId.of(matchId),
            Resolution.valueOf(request.resolution()), new ResolutionRationale(request.rationale()),
            new AnalystId(request.analystId()))));
}

// application/CaseApplicationService.java – one class implements all five use cases
public CaseView resolve(ResolveMatchCommand command) {
    return unitOfWork.write(() -> {
        ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
        screeningCase.resolveMatch(command.matchId(), command.resolution(), command.rationale(), command.analyst(), clock.instant());
        return commit(screeningCase);
    });
}
// a DomainException("FOUR_EYES") propagates; ProblemHandlers.DomainExceptionHandler turns it into 422
```

**Clean.** The controller checks only the shape of the input and passes strings. The interactor builds the values,
runs the rule and calls the presenter with the outcome. Nothing is returned and no exception escapes:

```java
// adapters/web/CaseController.java (ring 3)
public ViewModel resolve(String clientGroupId, String caseId, String matchId, ResolveMatchForm form) {
    if (form == null) return malformed(List.of("body: required"));
    List<String> errors = form.errors();
    if (!errors.isEmpty()) return malformed(errors);
    return present(p -> resolveMatch.execute(new ResolveMatchRequest(clientGroupId, caseId, matchId, …), p));
}

// usecases/resolvematch/ResolveMatchInteractor.java (ring 2) – one class per use case
public void execute(ResolveMatchRequest request, CaseOutputBoundary presenter) {
    Outcomes.presentingFailures(presenter, () -> {
        ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
        …
        CaseResponse response = transactions.write(() -> {
            ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
            screeningCase.resolveMatch(matchId, resolution, rationale, analyst, clock.instant());
            cases.save(screeningCase);
            outbox.append(screeningCase.pullEvents());
            return CaseResponse.from(screeningCase);
        });
        presenter.presentCase(response);
    });
}

// adapters/web/CasePresenter.java (ring 3) – the only place that knows about HTTP status
public void presentRuleViolation(String rule, String message) {
    viewModel = ViewModel.problem(ProblemJson.of(422, "Business rule violated", message, rule));
}
```

Both answer `422 FOUR_EYES` with the same body. The difference is where that decision lives and who can see the
entities.

## Measured differences

| | Hexagonal lab | Clean lab |
|---|---|---|
| Maven modules | 1 | 4, one per ring |
| Production source files / lines | 70 / 2,521 | 110 / 3,695 |
| … for the same features (without the Clean lab's work queue) | 70 / 2,521 | 98 / 3,408 (≈ +40 % files, +35 % lines) |
| Test files / tests | 7 / 46 | 16 / 79 |
| Use-case classes | 1 application service for 5 use cases | 6 interactors, one per use case (incl. work queue) |
| Use-case API | `CaseView screen(command)`: returns, throws | `void execute(request, presenter)`: every outcome is a call |
| What crosses into the use case | commands built from domain value objects | request models of strings and primitives |
| Who sees entities | adapters may construct value objects | rings 3–4 never import ring 1 (ArchUnit rule) |
| HTTP status decided by | controller (201/200) + `ProblemHandlers` (exceptions) | `CasePresenter` / `WorkQueuePresenter` only |
| Input shape validation | Bean Validation (`@Valid`) on API records | `Forms` in ring 3, plain Java |
| JSON annotations | `@Serdeable` on adapter records | none in rings 1–3; `@SerdeImport` in ring 4 |
| Persistence mapping | aggregate ↔ Micronaut Data rows, in one adapter | aggregate ↔ plain records (ring 3) ↔ rows with `@Version` (ring 4) |
| Optimistic-lock conflict | exception mapped by `ProblemHandlers` | translated ring by ring, then `presentConflict` |
| Enforcement | ArchUnit only | compiler (module poms) + six ArchUnit rules |
| Can rings 1–3 be built without Micronaut? | no, one module | yes |

## What Clean buys you

- **Delivery mechanisms are cheap.** A CLI, a batch job or a message consumer is a new controller and presenter. The
  interactors don't change because they never returned HTTP-shaped data (code-lab exercise 2).
- **Output formats can change independently.** A v2 representation is a second presenter (exercise 3). In the
  hexagonal lab, the shape of `CaseView` is shared by every caller.
- **The rule is enforced by the compiler.** Ring 1 has no Micronaut on its classpath, so a framework import fails to
  build. ArchUnit only catches the subtler rules.
- **The UI cannot call domain behaviour.** Response models are plain data, and the web adapters never import an
  entity.
- **Every failure is explicit.** The output boundary lists every outcome, so a reviewer can see all of them in one
  interface.
- **Component metrics are real.** With four modules you can measure I, A and D and see where the stable, abstract code
  sits (module 3).

## What it costs

- **More types.** There is a request model, an input boundary and an interactor per use case, plus response models,
  presenters, view models, and plain records between rings 3 and 4. That is about 40 % more files for the same
  features.
- **Two mapping steps for persistence:** aggregate to records, then records to rows. It's worth it if storage might
  change; it's ceremony if it never will.
- **Presenters are less familiar.** Developers used to `return` and `throw` need about a week to get used to them.
  `Outcomes.presentingFailures` is the lab's way of keeping them consistent.
- **Bean Validation can't be used in ring 3**, because it is a framework dependency. Shape checks become plain Java in
  `Forms`.
- **Tooling assumes otherwise.** Framework examples put annotations on everything, so the team has to resist pasting
  them inward.

## When to choose which

| Situation | Choose |
|---|---|
| Core subdomain with regulated rules that auditors test (screening, sanctions decisions, limits) | **Clean** |
| Several delivery mechanisms now or soon: REST, batch, events, CLI | **Clean** |
| Several teams working on one service, or rings that should be reused | **Clean**, module per ring |
| One team, one REST API, rules that matter but change slowly | **Hexagonal** |
| Supporting or generic subdomain, mostly CRUD | **Hexagonal**, or Clean with a facade partial boundary |
| A prototype whose domain is still unknown | Neither yet; a package-by-feature monolith, then move rules inward as they stabilise |
| An existing layered service | Start hexagonal (ports around the worst dependencies), then extract interactors and presenters where churn is highest (module 16) |

Most organisations run both. Use Clean for the few services that carry the core rules, and hexagonal for the rest.
The DDD model inside is the same either way, so moving a service from one style to the other later is a refactoring,
not a rewrite.

## Moving between the two labs

| From hexagonal | To Clean |
|---|---|
| Split `CaseApplicationService` into one interactor per use case | `usecases/<usecase>/…Interactor` |
| Replace `CaseView` return values with a `CaseOutputBoundary` | `shared/CaseOutputBoundary`, `CaseResponse` |
| Move `ProblemHandlers` mapping into a presenter | `adapters/web/CasePresenter` |
| Replace commands of value objects with request models of strings | `…Request` records, `RequestValues` |
| Split `JdbcCaseRepository` into mapping (ring 3) and driver (ring 4) | `SqlCaseGateway` + `MicronautCaseRecords` |
| Rename `UnitOfWork` → `TransactionRunner`, `ApplicationWiring` → `MainWiring` | `usecases/gateway`, `app/config` |
| Move each ring into its own Maven module, then add the ArchUnit rules that modules can't express | `CleanArchitectureTest` |

Done in that order, every step leaves a working service and a green build, as in the migration in module 16.
