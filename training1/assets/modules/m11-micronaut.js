(function () {
  const { code } = Course;
  Course.module({
    id: 'micronaut', num: 11, level: 'Practitioner', minutes: 90,
    title: 'Micronaut in the outer ring: DI, HTTP, Data JDBC, transactions',
    lead: 'Micronaut is an excellent fit for Clean Architecture: it does dependency injection, routing, JSON and SQL generation at compile time, and it can wire plain classes it has never seen an annotation on.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain compile-time DI and why "a missing gateway is a build error" matters for the Main component.</li>
<li>Configure <code>@Factory</code>, <code>@Requires</code>, <code>@ConfigurationProperties</code> and <code>@ExecuteOn</code> for a Clean service.</li>
<li>Implement ring-3 record interfaces with Micronaut Data JDBC, including optimistic locking with <code>@Version</code>.</li>
<li>Implement the use cases' <code>TransactionRunner</code> with <code>TransactionOperations</code>.</li>
<li>Read any HTTP status the service returns and name the ring – and the file – that decided it.</li>
</ul></div>

<h3>Compile-time DI, and why it suits Main</h3>
<p>Spring discovers beans by scanning the classpath at startup and reflects on them. Micronaut's annotation processor reads your <code>@Factory</code>, <code>@Singleton</code> and <code>@Requires</code> at <b>compile time</b> and generates <code>BeanDefinition</code> classes. Three consequences for Clean Architecture:</p>
<ul>
<li><b>Plain classes can be beans.</b> <code>MainWiring</code> calls constructors of classes from rings 1–3 that have no annotations. The inner rings stay framework-free.</li>
<li><b>Missing wiring is found early.</b> A factory method whose parameter has no producer fails at compile time or at the very first context start in tests – long before production traffic.</li>
<li><b>No reflection</b>, so fast startup and native-image friendly.</li>
</ul>
${code('yaml', `
screening:
  matching:
    threshold: 80
  reference-data:
    mode: in-memory        # in-memory | http  (MainWiring picks the gateway; no use case changes)
  events:
    sink: log
  outbox:
    relay-interval: 2s
    initial-delay: 2s
`, 'screening-app/src/main/resources/application.yml')}
${code('java', String.raw`
/** Bound from screening.matching.* at startup; invalid values fail fast before traffic arrives. */
@ConfigurationProperties("screening.matching")
public record MatchingProperties(@Bindable(defaultValue = "80") @Min(50) @Max(100) int threshold) {
}`, 'screening-app/…/config/MatchingProperties.java')}
<div data-sim="wiring-explorer"></div>

<h3>HTTP: endpoints on the blocking executor</h3>
<p>Micronaut runs on Netty's event loop. JDBC blocks, so <code>CaseEndpoint</code> has <code>@ExecuteOn(TaskExecutors.BLOCKING)</code> (virtual threads on Java 21+). Body binding uses Micronaut Serde with the ring-3 records registered by <code>@SerdeImport</code>. A body that cannot even be bound – <code>"dateOfBirth": "yesterday"</code> – never reaches the controller; a ring-4 handler answers with the same problem shape the controller uses:</p>
${code('java', String.raw`
/**
 * A body the framework cannot even bind (a date that is not a date, a string where an object belongs) never
 * reaches the controller. It gets the same problem shape as the controller's own shape errors.
 */
@Produces
@Singleton
@Replaces(ConversionErrorHandler.class)
class MalformedBodyHandler implements ExceptionHandler<ConversionErrorException, HttpResponse<Object>> {

    @Override
    public HttpResponse<Object> handle(HttpRequest request, ConversionErrorException e) {
        String field = e.getArgument() == null || e.getArgument().getAnnotationMetadata().hasAnnotation(Body.class)
                ? "body"
                : e.getArgument().getName();
        return Responses.of(ViewModel.problem(ProblemJson.malformed(List.of(field + ": cannot be read"))));
    }
}`, 'screening-app/…/web/MalformedBodyHandler.java')}

<h3>Micronaut Data JDBC behind ring 3's record interfaces</h3>
${code('java', String.raw`
/** Micronaut Data's view of screening_case. Mirrors the plain CaseRecord of ring 3. */
@MappedEntity("screening_case")
record CaseRow(
        @Id UUID id,
        String clientGroupId,
        String partyName,
        // ...
        @Version Long version) {
}

/** SQL for every method below is generated at compile time by the Micronaut Data annotation processor. */
@JdbcRepository(dialect = Dialect.H2)
interface CaseRows extends CrudRepository<CaseRow, UUID> {

    List<CaseRow> findByClientGroupIdAndStatusInList(String clientGroupId, Collection<String> status);
}

// MicronautCaseRecords implements CaseRecords (ring 3)
@Override
public void updateCase(CaseRecord record) {
    try {
        cases.update(toRow(record));                   // UPDATE ... WHERE id = ? AND version = ?
    } catch (OptimisticLockException e) {
        throw new StaleRecordException(record.id(), e); // ring 3's exception, not Micronaut's
    }
}`, 'screening-app/…/persistence')}
<p>The exception travels outward-to-inward through three translations, one per ring boundary: <code>OptimisticLockException</code> (Micronaut) → <code>StaleRecordException</code> (ring 3) → <code>ConcurrentCaseUpdateException</code> (ring 2) → <code>presentConflict</code> → 409.</p>
<div class="callout expert"><strong>A deliberate shortcut: the work-queue read model</strong><p><code>JdbcWorkQueueGateway</code> in ring 4 implements ring 2's <code>WorkQueueGateway</code> <i>directly</i>, with two generated queries and no aggregate rehydration. There is no ring-3 mapping step because there is no aggregate to map – it is a read model. "Reads may bypass the entities; writes never do." That is a one-dimensional partial boundary, chosen on purpose and documented in the class.</p></div>

<h3>Transactions: the use case says where, Micronaut says how</h3>
${code('java', String.raw`
/**
 * The use cases' transaction boundary, implemented with Micronaut's programmatic transactions. Every repository
 * call inside work joins the same JDBC connection; a runtime exception rolls everything back, outbox rows
 * included.
 */
@Singleton
class MicronautTransactionRunner implements TransactionRunner {

    private final TransactionOperations<Connection> transactions;

    @Override
    public <T> T write(Supplier<T> work) {
        return transactions.executeWrite(status -> work.get());
    }

    @Override
    public <T> T read(Supplier<T> work) {
        return transactions.executeRead(status -> work.get());
    }
}`, 'screening-app/…/persistence/MicronautTransactionRunner.java')}
<div class="callout pitfall"><strong>Why not <code>@Transactional</code> on the interactor?</strong><p>It would put a <code>jakarta.transaction</code> or Micronaut annotation in ring 2 – which does not compile there – and it would make the whole <code>execute</code> one transaction, including the slow reference-data call. A programmatic runner lets <code>ScreenCaseInteractor</code> read in one short transaction, call the remote service with no transaction, and write in another.</p></div>

<h3>Which ring said no?</h3>
<p>Every status the API returns is decided in exactly one place. Send each request and watch where it stops:</p>
<div data-sim="request-pipeline"></div>
<table>
<tr><th>Status</th><th>Decided by</th><th>Ring</th></tr>
<tr><td>404 (no route)</td><td>Micronaut router</td><td><span class="ring-tag ring-framework">4</span></td></tr>
<tr><td>400 <code>body: cannot be read</code></td><td><code>MalformedBodyHandler</code></td><td><span class="ring-tag ring-framework">4</span></td></tr>
<tr><td>400 MALFORMED_REQUEST</td><td><code>Forms.errors()</code> via <code>CaseController</code></td><td><span class="ring-tag ring-iadapter">3</span></td></tr>
<tr><td>400 INVALID_VALUE</td><td>a value object, reported by <code>presentInvalidRequest</code></td><td><span class="ring-tag ring-entity">1</span> → <span class="ring-tag ring-iadapter">3</span></td></tr>
<tr><td>404 Case not found</td><td><code>CaseLookup</code> (tenant check)</td><td><span class="ring-tag ring-usecase">2</span> → <span class="ring-tag ring-iadapter">3</span></td></tr>
<tr><td>422 rule code</td><td><code>ScreeningCase</code> invariant</td><td><span class="ring-tag ring-entity">1</span> → <span class="ring-tag ring-iadapter">3</span></td></tr>
<tr><td>409 CONCURRENT_UPDATE</td><td><code>@Version</code> → gateway translations</td><td><span class="ring-tag ring-framework">4</span> → <span class="ring-tag ring-iadapter">3</span> → <span class="ring-tag ring-usecase">2</span> → <span class="ring-tag ring-iadapter">3</span></td></tr>
<tr><td>201 + Location / 200</td><td><code>CasePresenter</code></td><td><span class="ring-tag ring-iadapter">3</span></td></tr>
</table>

<div data-quiz="m11"></div>
`,
  });

  Course.quiz('m11', [
    { q: 'Why can Micronaut make <code>new ScreenCaseInteractor(...)</code> a bean although the class has no annotations?', options: ['It scans for constructors at runtime', 'MainWiring is a @Factory; its @Singleton methods are processed at compile time and may return any object', 'It cannot; the interactor must be annotated', 'Through reflection proxies'], answer: 1, why: 'Factories are how a Clean service keeps rings 1–3 free of DI annotations.' },
    { q: 'A client sends <code>"dateOfBirth": "yesterday"</code>. What answers?', options: ['PartyName, 400 INVALID_VALUE', 'MalformedBodyHandler in ring 4, 400 "body: cannot be read"', 'CasePresenter, 422', 'Netty, 500'], answer: 1, why: 'Binding fails before the controller runs. The ring-4 handler reuses ring 3\'s ProblemJson.' },
    { q: 'Why does <code>CaseEndpoint</code> use <code>@ExecuteOn(TaskExecutors.BLOCKING)</code>?', options: ['To make it faster', 'JDBC calls block; they must not run on the Netty event loop', 'It is required for JSON', 'For transactions'], answer: 1, why: 'Blocking the event loop stalls every connection. The blocking executor uses virtual threads on Java 21+.' },
    { q: 'Why does the lab use a programmatic <code>TransactionRunner</code> instead of <code>@Transactional</code> on interactors?', options: ['@Transactional does not exist in Micronaut', 'It keeps framework annotations out of ring 2 and lets the interactor choose several short transactions around a slow remote call', 'For performance only', 'Because H2 does not support transactions'], answer: 1, why: 'The use case decides where; the framework decides how.' },
    { q: 'JdbcWorkQueueGateway implements a ring-2 interface directly from ring 4, with no ring-3 class. Is that a violation?', options: ['Yes, every gateway needs a ring-3 implementation', 'No: the dependency still points inward; it is a deliberate one-dimensional partial boundary for a read model', 'Yes, ring 4 may not see ring 2', 'Only if it uses SQL'], answer: 1, why: 'Ring 4 may depend on any inner ring. Skipping a mapping layer for a read model is a documented trade-off.' },
  ]);
})();
