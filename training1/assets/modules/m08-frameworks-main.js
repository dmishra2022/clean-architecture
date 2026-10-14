(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'frameworks-main', num: 8, level: 'Practitioner', minutes: 70,
    title: 'Ring 4 – Frameworks, drivers and the Main component',
    lead: 'The outermost ring is glue: Micronaut, Netty, JDBC, H2, Flyway, the scheduler. It is kept humble – no decisions, just copying – and contains the one deliberately dirty class that knows everybody.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Apply the Humble Object pattern to endpoints, repositories and schedulers.</li>
<li>Write the Main component: a <code>@Factory</code> that builds plain objects and exposes only inner-ring interfaces.</li>
<li>Keep framework annotations out of rings 1–3, including JSON (de)serialisation.</li>
<li>Put any piece of code into its ring – or into Main – and justify it.</li>
</ul></div>

<h3>"The framework is a detail"</h3>
<p>Uncle Bob's warning about frameworks: you marry them, they don't marry you. A framework author wants you to couple to it – annotations on your domain, base classes to extend, its types in your signatures. That coupling is free on day one and expensive forever. Clean Architecture keeps the framework <b>at arm's length</b>: in ring 4, behind interfaces the inner rings own.</p>
${fig('11-micronaut-wiring', 'Micronaut lives only in screening-app. MainWiring constructs plain ring-1-to-3 objects and registers them as beans by their inner-ring interfaces.')}

<h3>Humble objects</h3>
<p>Some code is hard to unit-test because it is bound to a framework: an HTTP endpoint, a <code>@JdbcRepository</code>, a <code>@Scheduled</code> method. The Humble Object pattern splits it in two: a <b>humble</b> part that is too awkward to test and therefore contains no logic, and a testable part that contains all of it.</p>
${code('java', String.raw`
@Controller("/api/v1/client-groups/{clientGroupId}/cases")
@ExecuteOn(TaskExecutors.BLOCKING)
class CaseEndpoint {

    private final CaseController controller;

    @Post("/{caseId}/closure")
    HttpResponse<Object> close(String clientGroupId, String caseId, @Nullable @Body CloseCaseForm form) {
        return Responses.of(controller.close(clientGroupId, caseId, form));
    }
}

/** Copies a view model into an HTTP response. No branching on meaning: every decision was made by a presenter. */
final class Responses {

    static MutableHttpResponse<Object> of(ViewModel vm) {
        MutableHttpResponse<Object> response = HttpResponse.status(HttpStatus.valueOf(vm.status()));
        response.contentType(MediaType.of(vm.contentType()));
        if (vm.location() != null) {
            response.header(HttpHeaders.LOCATION, vm.location());
        }
        if (vm.body() != null) {
            response.body(vm.body());
        }
        return response;
    }
}`, 'screening-app/…/web/CaseEndpoint.java, Responses.java')}
<table>
<tr><th>Humble (ring 4)</th><th>Testable partner (ring 3)</th></tr>
<tr><td><code>CaseEndpoint</code> – routes, headers, body binding</td><td><code>CaseController</code> + <code>CasePresenter</code></td></tr>
<tr><td><code>MicronautCaseRecords</code> – copies records ↔ rows</td><td><code>SqlCaseGateway</code> + <code>CaseRecordMapper</code></td></tr>
<tr><td><code>ScheduledOutboxRelay</code> – decides <i>when</i></td><td><code>OutboxRelay</code> – decides <i>what running means</i></td></tr>
<tr><td><code>MicronautReferenceDataClient</code> – declarative <code>@Client</code></td><td><code>RemoteReferenceData</code> + <code>ProfileTranslator</code></td></tr>
<tr><td><code>MalformedBodyHandler</code> – hooks Micronaut's error pipeline</td><td><code>ProblemJson.malformed(...)</code></td></tr>
</table>
${code('java', String.raw`
/** The framework decides when the relay runs; the relay (ring 3) decides what running means. */
@Singleton
class ScheduledOutboxRelay {

    private final OutboxRelay relay;

    @Scheduled(fixedDelay = "...relay-interval:2s", initialDelay = "...initial-delay:2s")
    void run() {
        relay.publishPending();
    }
}`, 'screening-app/…/events/ScheduledOutboxRelay.java (property placeholders shortened)')}

<h3>The Main component</h3>
<blockquote>"Main is the dirtiest of all the dirty components … it is the ultimate detail – the lowest-level policy." – Clean Architecture, ch. 26</blockquote>
<p>Something has to call <code>new ScreenCaseInteractor(...)</code>. Main is the one place allowed to know every concrete class. It reads configuration, builds the object graph and then hands control to the high-level policy. In the lab it is a Micronaut <code>@Factory</code>:</p>
${code('java', String.raw`
/**
 * The Main component: the dirtiest class in the system and the only one that knows every ring. It builds the plain
 * objects of rings 1-3 and hands them to Micronaut as beans. Every factory method returns the inner-ring
 * interface, so nothing else can ask the container for an interactor or a concrete gateway.
 * <p>
 * Micronaut resolves this at compile time: a missing gateway is a build error, not a startup surprise.
 */
@Factory
public class MainWiring {

    @Singleton
    NameMatchingPolicy nameMatchingPolicy(MatchingProperties properties) {
        return new NameMatchingPolicy(properties.threshold());
    }

    @Singleton
    CaseGateway caseGateway(CaseRecords records) {
        return new SqlCaseGateway(records);
    }

    @Singleton
    @Requires(property = REFERENCE_MODE, value = "in-memory", defaultValue = "in-memory")
    ReferenceDataGateway inMemoryReferenceData() {
        return new InMemoryReferenceData();
    }

    @Singleton
    @Requires(property = REFERENCE_MODE, value = "http")
    ReferenceDataGateway remoteReferenceData(ReferenceDataApi api) {
        return new RemoteReferenceData(api, new ProfileTranslator());
    }

    @Singleton
    ScreenCase screenCase(CaseGateway cases, ReferenceDataGateway referenceData, EventOutboxGateway outbox,
                          TransactionRunner transactions, NameMatchingPolicy policy, Clock clock) {
        return new ScreenCaseInteractor(cases, referenceData, outbox, transactions, policy, clock);
    }

    @Singleton
    CaseController caseController(OpenCase open, ScreenCase screen, ResolveMatch resolve, CloseCase close,
                                  ViewCase view) {
        return new CaseController(open, screen, resolve, close, view);
    }
}`, 'screening-app/…/config/MainWiring.java')}
<div class="callout rule"><strong>Return the interface, not the class</strong><p><code>screenCase(...)</code> returns <code>ScreenCase</code>, the input boundary. The bean is registered under that type only, so no endpoint can inject <code>ScreenCaseInteractor</code> – and ArchUnit's <code>onlyMainKnowsTheInteractors</code> checks nobody imports it either. Swapping in-memory and HTTP reference data is one property in <code>application.yml</code>; no use case changes.</p></div>

<h3>Keeping JSON out of ring 3: <code>@SerdeImport</code></h3>
<p>Micronaut Serde normally needs <code>@Serdeable</code> on every record it reads or writes. Putting that on <code>CaseJson</code> would drag Micronaut into ring 3. Instead, ring 4 generates the serialisers from the outside, at compile time:</p>
${code('java', String.raw`
/**
 * Generates JSON (de)serializers for the plain records of the interface-adapters ring, at compile time and from
 * the outside, so that ring never has to carry a @Serdeable annotation.
 */
@SerdeImport(Forms.OpenCaseForm.class)
@SerdeImport(Forms.ResolveMatchForm.class)
@SerdeImport(Forms.CloseCaseForm.class)
@SerdeImport(CaseJson.class)
@SerdeImport(CaseJson.MatchJson.class)
@SerdeImport(ProblemJson.class)
@SerdeImport(WorkQueueJson.class)
@SerdeImport(WorkQueueJson.ItemJson.class)
@SerdeImport(ProfileRecord.class)
final class SerdeImports {
}`, 'screening-app/…/config/SerdeImports.java')}
<div class="callout pitfall"><strong>Configuration enters as plain values</strong><p><code>MatchingProperties</code> is a <code>@ConfigurationProperties</code> bean in ring 4. The policy receives an <code>int</code>. If an interactor injected <code>MatchingProperties</code>, the use cases would depend on the framework ring – the build would fail on a cycle, which module 3's simulator shows.</p></div>

<h3>Try it: where does it belong?</h3>
<div data-sim="where-belongs"></div>

<div data-quiz="m08"></div>
`,
  });

  Course.quiz('m08', [
    { q: 'What is a humble object?', options: ['An object with no fields', 'The framework-bound half of a split, kept so simple it needs no unit test; the logic lives in a testable partner', 'A singleton', 'A DTO'], answer: 1, why: 'CaseEndpoint and Responses only copy values; CaseController and CasePresenter hold the logic and are unit-tested.' },
    { q: 'Why do the MainWiring factory methods return interfaces like <code>ScreenCase</code> instead of <code>ScreenCaseInteractor</code>?', options: ['Micronaut cannot register classes', 'So no other bean can inject the concrete interactor; everyone depends on the input boundary', 'For performance', 'Because interactors are abstract'], answer: 1, why: 'The bean is exposed under the boundary type only, which keeps DIP true even inside ring 4.' },
    { q: 'How does Micronaut serialise <code>CaseJson</code> without an annotation in ring 3?', options: ['Reflection at runtime', 'Jackson', '@SerdeImport in screening-app generates the serialiser at compile time', 'It cannot; CaseJson has @Serdeable'], answer: 2, why: 'SerdeImports registers ring-3 records from the outside.' },
    { q: 'Where should <code>@Scheduled(fixedDelay = "2s")</code> for the outbox relay live?', options: ['On OutboxRelay in ring 3', 'On ScheduledOutboxRelay in ring 4, which only calls relay.publishPending()', 'In the interactor', 'In ScreeningCase'], answer: 1, why: 'When to run is a framework detail; what running means is ring-3 policy.' },
    { q: 'Switching reference data from in-memory to HTTP requires changing…', options: ['ScreenCaseInteractor', 'ScreeningCase', 'One property (screening.reference-data.mode); MainWiring picks the gateway', 'Every test'], answer: 2, why: '@Requires on two factory methods selects the ReferenceDataGateway implementation.' },
  ]);
})();
