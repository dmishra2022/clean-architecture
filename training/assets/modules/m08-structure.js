(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'structure-mapping-validation', num: 8, level: 'Practitioner', minutes: 60,
    title: 'Package structure, mapping, validation and enforcing the rules',
    lead: 'Turning the hexagon into a codebase: where each class goes, how data crosses the borders, which layer rejects what, and how ArchUnit keeps it that way.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Lay out a hexagonal Micronaut project and explain every package.</li>
<li>Map between API models, domain objects and persistence rows without leaking.</li>
<li>Split validation into shape, meaning and business rules – and map each to the right HTTP status.</li>
<li>Write ArchUnit rules that make the architecture a build failure, not a wiki page.</li>
</ul></div>

<h3>Package structure</h3>
${fig('10-package-structure', 'The code lab layout. Rings are packages; arrows are the only allowed dependency directions.')}
${code('text', `
training.worldcheck.screening
├── domain                     ← plain Java, no framework imports
│   ├── model                    ScreeningCase, Match, value objects, snapshots
│   ├── event                    sealed DomainEvent + records
│   └── service                  NameMatchingPolicy, MatchEvaluation
├── application                ← plain Java; use cases and ports
│   ├── port/in                  OpenCaseUseCase … FindCaseQuery, CaseView
│   ├── port/out                 CaseRepository, ReferenceDataSource, DomainEventOutbox, UnitOfWork, IdempotencyStore
│   └── CaseApplicationService
├── adapter
│   ├── in/rest                  CaseController, ApiModels, ProblemHandlers
│   └── out
│       ├── persistence          rows, Micronaut Data repositories, JdbcCaseRepository, JdbcUnitOfWork
│       ├── events               outbox rows, appender, relay, sinks, EventPayloads
│       └── reference            in-memory source, HTTP client + ACL
└── config                     ← composition root: ApplicationWiring, MatchingProperties
`)}
<div class="callout expert"><strong>Package by context first, then by ring</strong><p>In a modular monolith with several bounded contexts, the top level is the context (<code>screening</code>, <code>monitoring</code>), and each context has its own <code>domain / application / adapter / config</code>. Never a top-level <code>domain</code> package shared by contexts – that is a shared kernel by accident.</p></div>
<p>Adapters are package-private where possible (<code>class JdbcCaseRepository</code>, not <code>public class</code>). Only the port is public; nobody can depend on the implementation by mistake.</p>

<h3>Mapping across the borders</h3>
<p>Each border has its own model. That feels like duplication; it is actually decoupling – each model can change for its own reasons.</p>
<table>
<tr><th>Model</th><th>Lives in</th><th>Changes when</th><th>Example</th></tr>
<tr><td>API request/response</td><td>adapter.in.rest</td><td>The public contract changes (versioned!)</td><td><code>OpenCaseRequest</code>, <code>CaseResponse</code></td></tr>
<tr><td>Command / view</td><td>application.port.in</td><td>A use case changes</td><td><code>OpenCaseCommand</code>, <code>CaseView</code></td></tr>
<tr><td>Domain</td><td>domain</td><td>Business rules change</td><td><code>ScreeningCase</code>, <code>Party</code></td></tr>
<tr><td>Snapshot</td><td>domain.model</td><td>Persistent state of the aggregate changes</td><td><code>CaseSnapshot</code>, <code>MatchSnapshot</code></td></tr>
<tr><td>Row</td><td>adapter.out.persistence</td><td>The schema changes</td><td><code>CaseRow</code> with <code>@MappedEntity</code>, <code>@Version</code></td></tr>
<tr><td>Integration event</td><td>adapter.out.events</td><td>The published language changes (versioned!)</td><td><code>EventPayloads</code> with <code>schemaVersion</code></td></tr>
</table>
${code('java', String.raw`
/** Table shape of a case. Lives only in this adapter; the domain never sees it. */
@MappedEntity("screening_case")
record CaseRow(
        @Id UUID id,
        String clientGroupId,
        String partyName,
        String entityType,
        @Nullable LocalDate dateOfBirth,
        @Nullable String country,
        String status,
        @Nullable String outcome,
        int screeningCount,
        Instant openedAt,
        @Nullable Instant lastScreenedAt,
        @Nullable Instant closedAt,
        @Nullable String closedBy,
        @Version Long version) {
}`, 'adapter/out/persistence/CaseRow.java')}
<p>A hand-written <code>CaseRowMapper</code> converts snapshot ↔ rows. Explicit mapping code is boring, greppable and debuggable; it fails at compile time when a field is added. Mapping libraries are fine in adapters, never in the domain.</p>
<div class="callout pitfall"><strong>Pitfall: one class for everything</strong><p>A single <code>Case</code> class annotated for JSON, JPA and validation looks efficient. Then a column rename breaks the API, an API field addition needs a migration, and a business rule change requires both. Separate models at the borders are what make hexagonal architecture pay off.</p></div>

<h3>Validation: three kinds, three places</h3>
<table>
<tr><th>Kind</th><th>Question</th><th>Where</th><th>Mechanism</th><th>HTTP</th></tr>
<tr><td><b>Shape</b></td><td>Is the request well-formed?</td><td>Driving adapter</td><td>Bean Validation on request records (<code>@NotBlank</code>, <code>@Pattern</code>)</td><td>400</td></tr>
<tr><td><b>Meaning</b></td><td>Is this value valid in our domain?</td><td>Value objects</td><td>Constructor checks → <code>DomainException(INVALID_VALUE)</code></td><td>400</td></tr>
<tr><td><b>Business rule</b></td><td>Is this action allowed in the current state?</td><td>Aggregate</td><td>Invariant checks → <code>DomainException(rule)</code></td><td>422</td></tr>
<tr><td>Existence / tenancy</td><td>Does it exist for this caller?</td><td>Application service</td><td><code>CaseNotFoundException</code></td><td>404</td></tr>
<tr><td>Concurrency</td><td>Did someone change it meanwhile?</td><td>Driven adapter → port exception</td><td><code>ConcurrentCaseUpdateException</code></td><td>409</td></tr>
</table>
${code('java', String.raw`
/**
 * The public HTTP contract (open host service). Bean Validation checks shape here; business rules are
 * checked by the domain, so the two kinds of error stay distinguishable (400 vs 422).
 */
@Serdeable
public record OpenCaseRequest(
        @NotBlank @Size(max = 200) String name,
        @NotBlank @Pattern(regexp = "INDIVIDUAL|ORGANISATION") String entityType,
        @Nullable LocalDate dateOfBirth,
        @Nullable @Pattern(regexp = "[A-Za-z]{2}") String country) {
}`, 'adapter/in/rest/ApiModels.java')}
${code('java', String.raw`
/** Maps inner-layer exceptions to HTTP. The inner layers never know which status code they produce. */
@Produces
@Singleton
@Requires(classes = {DomainException.class, ExceptionHandler.class})
static class DomainExceptionHandler implements ExceptionHandler<DomainException, HttpResponse<Problem>> {
    @Override
    public HttpResponse<Problem> handle(HttpRequest request, DomainException e) {
        return e.isInvalidValue()
                ? problem(HttpStatus.BAD_REQUEST, "Invalid value", e.getMessage(), e.rule())
                : problem(HttpStatus.UNPROCESSABLE_ENTITY, "Business rule violated", e.getMessage(), e.rule());
    }
}`, 'adapter/in/rest/ProblemHandlers.java')}
<p>Every error body is RFC 9457 problem details plus a machine-readable <code>rule</code> code. Clients (and the UI) switch on <code>rule</code>, never on message text.</p>
${code('json', `
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Business rule violated",
  "status": 422,
  "detail": "1 match(es) are unresolved or possible on case 6f1c…",
  "rule": "MATCHES_AWAITING_REVIEW"
}`)}
<div class="callout rule"><strong>Why duplicate some checks?</strong><p>Bean Validation and the value object both check the country format. The adapter check gives clients a precise field-level error early; the value object check guarantees the domain is safe no matter which adapter (queue, batch file, test) builds the value. The domain check is the one that must never be removed.</p></div>

<h3>Making the architecture executable: ArchUnit</h3>
<p>Architecture that lives in a wiki decays within months. Architecture that fails the build does not.</p>
${code('java', String.raw`
/** The dependency rule as executable tests. A pull request that breaks the hexagon fails the build. */
class HexagonalArchitectureTest {

    private static final JavaClasses PRODUCTION = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("training.worldcheck.screening");

    @Test
    void dependenciesPointInwards() {
        onionArchitecture()
                .domainModels("..domain..")
                .applicationServices("..application..")
                .adapter("rest", "..adapter.in.rest..")
                .adapter("persistence", "..adapter.out.persistence..")
                .adapter("events", "..adapter.out.events..")
                .adapter("reference", "..adapter.out.reference..")
                .withOptionalLayers(true)
                .ignoreDependency(resideInAPackage("..config.."), alwaysTrue())
                .because("config is the composition root: the one place allowed to see every ring")
                .check(PRODUCTION);
    }

    @Test
    void domainIsPlainJava() {
        noClasses().that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("io.micronaut..", "jakarta..", "javax..",
                        "org.slf4j..", "com.fasterxml..")
                .because("the domain model must compile and run without any framework")
                .check(PRODUCTION);
    }

    @Test
    void adaptersUsePortsNotTheService() {
        noClasses().that().resideInAPackage("..adapter..")
                .should().dependOnClassesThat().areAssignableTo(CaseApplicationService.class)
                .because("driving adapters call use-case interfaces so the implementation can change")
                .check(PRODUCTION);
    }

    @Test
    void onlyStorageAdaptersTouchMicronautData() {
        noClasses().that().resideOutsideOfPackages("..adapter.out.persistence..", "..adapter.out.events..")
                .should().dependOnClassesThat().resideInAPackage("io.micronaut.data..")
                .check(PRODUCTION);
    }
}`, 'src/test/…/architecture/HexagonalArchitectureTest.java')}
<div class="callout lead"><strong>Introducing ArchUnit to an existing codebase</strong><p>Legacy code will have hundreds of violations. Use ArchUnit's <code>FreezingArchRule.freeze(rule)</code>: it records today's violations in a store file and fails only on <i>new</i> ones. Commit the store, then shrink it sprint by sprint. Show the count going down in your team review – it is a motivating metric.</p></div>

<div data-sim="where-belongs"></div>

<div data-quiz="m08"></div>
`,
  });

  Course.quiz('m08', [
    { q: 'A request has <code>"entityType": "PERSON"</code>. Which layer rejects it and with what status?', options: ['The aggregate, 422', 'Bean Validation in the REST adapter, 400', 'The database, 500', 'The application service, 404'], answer: 1, why: 'It is a shape error: @Pattern on the request record rejects it before any use case runs.' },
    { q: 'Closing a case with an UNRESOLVED match returns…', options: ['400 Invalid value', '404 Not found', '409 Conflict', '422 with rule MATCHES_AWAITING_REVIEW'], answer: 3, why: 'The request is valid, the action is not allowed in the current state: a business-rule violation, 422.' },
    { q: 'Why is <code>CaseRow</code> separate from <code>ScreeningCase</code>?', options: ['Micronaut Data cannot map classes', 'So schema changes and business rule changes can evolve independently, and the domain stays framework-free', 'For performance', 'Records cannot have behaviour'], answer: 1, why: 'Separate border models decouple reasons to change.' },
    { q: 'How do you introduce ArchUnit to a legacy codebase with 300 violations?', options: ['Fix all 300 first', 'Disable the rules', 'Freeze current violations and fail only on new ones; shrink over time', 'Only run it locally'], answer: 2, why: 'FreezingArchRule stops the bleeding immediately and turns cleanup into a visible trend.' },
    { q: 'Which classes should be <code>public</code> in a driven adapter package?', options: ['All of them', 'Ideally none – adapters implement public ports and can be package-private', 'Only the rows', 'Only the Micronaut Data repositories'], answer: 1, why: 'Package-private adapters make it impossible to depend on the implementation instead of the port.' },
  ]);
})();
