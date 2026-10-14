(function () {
  const { code } = Course;
  const D = (s) => s.replaceAll('$(', '$' + '{');
  Course.module({
    id: 'micronaut-web-data', num: 10, level: 'Practitioner', minutes: 80,
    title: 'Micronaut in the adapters: HTTP, clients, data, transactions, scheduling',
    lead: 'Every Micronaut feature the screening service uses – each one confined to an adapter, none of them visible to the domain.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Build a REST driving adapter with routing, binding, Serde, validation and problem responses.</li>
<li>Choose the right thread model (<code>@ExecuteOn</code>, virtual threads) for blocking work.</li>
<li>Write a declarative HTTP client with resilience behind an ACL.</li>
<li>Use Micronaut Data JDBC with records, optimistic locking and compile-time queries.</li>
<li>Implement transaction boundaries programmatically, and schedule background work.</li>
</ul></div>

<h3>The REST driving adapter</h3>
${code('java', String.raw`
/**
 * Driving adapter. Translates HTTP into commands, calls a use-case port, translates the view back.
 * It depends on port interfaces only, never on the application service class.
 * <p>
 * JDBC is blocking, so requests run on the blocking executor (virtual threads on Java 21+), not the Netty
 * event loop.
 */
@Controller("/api/v1/client-groups/{clientGroupId}/cases")
@ExecuteOn(TaskExecutors.BLOCKING)
public class CaseController {

    private final OpenCaseUseCase openCase;
    private final ScreenCaseUseCase screenCase;
    private final ResolveMatchUseCase resolveMatch;
    private final CloseCaseUseCase closeCase;
    private final FindCaseQuery findCase;

    @Post
    public HttpResponse<CaseResponse> open(String clientGroupId,
                                           @Nullable @Header("Idempotency-Key") String idempotencyKey,
                                           @Valid @Body OpenCaseRequest request) {
        Party party = new Party(
                new PartyName(request.name()),
                EntityType.valueOf(request.entityType()),
                request.dateOfBirth(),
                CountryCode.ofNullable(request.country()));
        CaseView view = openCase.open(new OpenCaseCommand(new ClientGroupId(clientGroupId), party, idempotencyKey));
        return HttpResponse.created(CaseResponse.of(view),
                URI.create("/api/v1/client-groups/" + clientGroupId + "/cases/" + view.caseId()));
    }

    @Put("/{caseId}/matches/{matchId}/resolution")
    public CaseResponse resolve(String clientGroupId, String caseId, String matchId,
                                @Valid @Body ResolveMatchRequest request) {
        return CaseResponse.of(resolveMatch.resolve(new ResolveMatchCommand(
                new ClientGroupId(clientGroupId),
                CaseId.of(caseId),
                MatchId.of(matchId),
                Resolution.valueOf(request.resolution()),
                new ResolutionRationale(request.rationale()),
                new AnalystId(request.analystId()))));
    }
}`, 'adapter/in/rest/CaseController.java')}
<table>
<tr><th>Feature</th><th>What happens</th></tr>
<tr><td>Routing</td><td>Route table generated at compile time from <code>@Controller</code>, <code>@Post</code>, <code>@Put</code>. <code>micronaut-http-validation</code> checks URI templates against parameters at build time.</td></tr>
<tr><td>Binding</td><td>Path variables bind by name (<code>clientGroupId</code>), headers by <code>@Header</code>, body by <code>@Body</code>. Needs <code>-parameters</code> in the compiler args.</td></tr>
<tr><td>Serde</td><td><code>@Serdeable</code> records get generated (de)serializers. No reflection; unknown types fail at compile time rather than at runtime.</td></tr>
<tr><td>Validation</td><td><code>@Valid</code> triggers Bean Validation on the request record; failures become 400 before your method runs.</td></tr>
<tr><td>Errors</td><td><code>ExceptionHandler</code> beans (module 8) map inner exceptions to problem+json.</td></tr>
</table>
<div data-sim="http-pipeline"></div>

<h4>Threads: never block the event loop</h4>
<p>Micronaut's HTTP server runs on Netty. Its event-loop threads must never block. JDBC, blocking HTTP clients and file I/O block. Options:</p>
<ul>
<li><code>@ExecuteOn(TaskExecutors.BLOCKING)</code> on the controller – the code lab's choice. On Java 21+ Micronaut 4 backs the blocking executor with <b>virtual threads</b> where supported, so thousands of concurrent blocking requests are cheap.</li>
<li>Reactive end-to-end (<code>Publisher</code>, R2DBC) – maximum efficiency, much higher complexity; rarely worth it now that virtual threads exist.</li>
</ul>
<div class="callout pitfall"><strong>Virtual threads and connection pools</strong><p>Virtual threads remove the thread limit, not the database limit. 5,000 concurrent screenings still share a Hikari pool of, say, 20 connections. Size the pool deliberately, keep transactions short (that is why reference data is fetched outside the transaction), and watch pool wait time as a key metric.</p></div>

<h3>Declarative HTTP clients behind an ACL</h3>
${code('java', String.raw`
/**
 * Declarative HTTP client: Micronaut generates the implementation at compile time.
 * The base URL comes from {@code micronaut.http.services.reference-data.url}.
 */
@Client(id = "reference-data")
@Requires(property = "screening.reference-data.mode", value = "http")
interface ReferenceDataClient {

    @Get("/v1/profiles/candidates")
    List<ProfileDto> candidates(@QueryValue String name, @QueryValue String entityType);
}`, 'adapter/out/reference/ReferenceDataClient.java')}
${code('yaml', `
micronaut:
  http:
    services:
      reference-data:
        url: http://localhost:9090
        read-timeout: 2s`, 'application.yml')}
<p>The client returns upstream DTOs; <code>HttpReferenceDataSource</code> (module 7) translates them. Add resilience on the adapter side:</p>
${code('java', String.raw`
@Retryable(attempts = "3", delay = "200ms", multiplier = "2.0", includes = HttpClientException.class)
@CircuitBreaker(reset = "30s")      // fail fast while the upstream is down
List<ProfileDto> candidates(@QueryValue String name, @QueryValue String entityType);`, 'exercise: resilience on the client')}
<div class="callout expert"><strong>Retry only what is safe</strong><p>Retrying a GET for candidates is safe. Retrying a non-idempotent POST to another service can duplicate work. That is why commands sent to other contexts carry idempotency keys (module 13).</p></div>

<h3>Micronaut Data JDBC</h3>
<p>Micronaut Data generates repository implementations at compile time. Rows are records; query methods are parsed and type-checked during the build.</p>
${code('java', String.raw`
@JdbcRepository(dialect = Dialect.H2)
interface CaseRowRepository extends CrudRepository<CaseRow, UUID> { }

@JdbcRepository(dialect = Dialect.H2)
interface MatchRowRepository extends CrudRepository<MatchRow, UUID> {
    List<MatchRow> findByCaseIdOrderByScoreDesc(UUID caseId);   // parsed at compile time
}

@JdbcRepository(dialect = Dialect.H2)
interface OutboxRowRepository extends CrudRepository<OutboxRow, UUID> {
    List<OutboxRow> findByPublishedAtIsNull(Pageable pageable);
    long countByPublishedAtIsNull();
    void update(@Id UUID id, Instant publishedAt);               // partial update
}`, 'adapter/out/persistence + adapter/out/events')}
<ul>
<li>Misspell <code>findByCaseIdOrderByScorDesc</code> and the <b>build fails</b> naming the unknown property.</li>
<li><code>@Version Long version</code> on the row turns every <code>update</code> into <code>… WHERE version = ?</code> and throws <code>OptimisticLockException</code> on zero rows.</li>
<li>Switching to PostgreSQL: change the dialect and datasource; the domain is untouched.</li>
<li>Flyway (<code>micronaut-flyway</code>) runs <code>db/migration/V1__screening_schema.sql</code> at startup – the schema is versioned with the code.</li>
</ul>
${code('sql', `
CREATE TABLE case_match (
    id           UUID          PRIMARY KEY,
    case_id      UUID          NOT NULL REFERENCES screening_case (id),
    profile_id   VARCHAR(64)   NOT NULL,
    category     VARCHAR(20)   NOT NULL,
    matched_name VARCHAR(200)  NOT NULL,
    score        INT           NOT NULL,
    resolution   VARCHAR(20)   NOT NULL,
    rationale    VARCHAR(2000),
    resolved_by  VARCHAR(64),
    resolved_at  TIMESTAMP(6),
    CONSTRAINT uq_match_profile_per_case UNIQUE (case_id, profile_id)   -- invariant 2, defended twice
);`, 'db/migration/V1__screening_schema.sql (excerpt)')}

<h3>Transactions</h3>
<p>Micronaut offers declarative <code>@Transactional</code> and programmatic <code>TransactionOperations</code>. The code lab implements the application's <code>UnitOfWork</code> port with the programmatic API, keeping the application ring annotation-free:</p>
${code('java', String.raw`
/**
 * Implements the application's transaction boundary with Micronaut's programmatic transactions.
 * Every repository call made inside {@code work} joins the same JDBC connection; a runtime exception
 * rolls everything back, outbox rows included.
 */
@Singleton
class JdbcUnitOfWork implements UnitOfWork {

    private final TransactionOperations<Connection> transactions;

    JdbcUnitOfWork(TransactionOperations<Connection> transactions) {
        this.transactions = transactions;
    }

    @Override
    public <T> T write(Supplier<T> work) {
        return transactions.executeWrite(status -> work.get());
    }

    @Override
    public <T> T read(Supplier<T> work) {
        return transactions.executeRead(status -> work.get());
    }
}`, 'adapter/out/persistence/JdbcUnitOfWork.java')}
<div class="callout rule"><strong>Transaction design rules for this service</strong><ul>
<li>One write transaction per use case, modifying one aggregate.</li>
<li>No remote calls inside a write transaction.</li>
<li>Outbox rows are written in the same transaction as the aggregate.</li>
<li>Domain exceptions are runtime exceptions, so they roll back automatically.</li>
</ul></div>

<h3>Scheduling and management</h3>
${code('java', D(String.raw`
@Scheduled(fixedDelay = "$(screening.outbox.relay-interval:2s}",
           initialDelay = "$(screening.outbox.initial-delay:2s}")
void scheduledRun() {
    publishPending();
}`), 'adapter/out/events/OutboxRelay.java')}
<p><code>@Scheduled</code> accepts property placeholders, so intervals are configuration. With several instances, every instance runs the schedule – design for it (module 13: <code>SKIP LOCKED</code> or leader election).</p>
<p><code>micronaut-management</code> exposes <code>/health</code> (with datasource checks), and with Micrometer <code>/metrics</code> (or Prometheus scrape). Health and readiness endpoints are adapters too: they observe the system, they never contain business logic.</p>
${code('shell', `
curl -s localhost:8080/health | jq
# {"name":"screening-case-service","status":"UP","details":{"jdbc":{"status":"UP",...},...}}`)}

<div data-quiz="m10"></div>
`,
  });

  Course.quiz('m10', [
    { q: 'Why is the controller annotated <code>@ExecuteOn(TaskExecutors.BLOCKING)</code>?', options: ['To make it faster', 'Because the use cases call blocking JDBC, which must not run on Netty\'s event loop', 'Required for validation', 'To enable virtual threads in the domain'], answer: 1, why: 'Blocking the event loop stalls every connection on it. Blocking work moves to the blocking executor (virtual threads on Java 21).' },
    { q: 'A misspelled Micronaut Data method <code>findByCaseIdOrderByScorDesc</code> fails…', options: ['At the first call in production', 'At startup', 'At compile time', 'Never; it returns empty'], answer: 2, why: 'Queries are parsed and validated by micronaut-data-processor during the build.' },
    { q: 'What does <code>@Version</code> on a row record do?', options: ['Adds an audit timestamp', 'Adds optimistic locking: updates include WHERE version = ? and fail on zero rows', 'Versions the API', 'Enables Flyway'], answer: 1, why: 'The version check detects concurrent modification; the adapter translates the failure into a port exception.' },
    { q: 'You switched to virtual threads. 5,000 concurrent screens now wait. The likely bottleneck?', options: ['Netty', 'The JDBC connection pool', 'Serde', 'The router'], answer: 1, why: 'Virtual threads remove thread limits, not database connection limits. Keep transactions short and size the pool.' },
    { q: 'Where should <code>@Retryable</code> go for reference-data calls?', options: ['On ScreeningCase.screen()', 'On the declarative HTTP client / adapter', 'On the application service', 'On the controller'], answer: 1, why: 'Resilience is a technical concern of the driven adapter; the domain must not know about remote failures.' },
  ]);
})();
