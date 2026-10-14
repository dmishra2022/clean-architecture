(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'testing', num: 12, level: 'Practitioner', minutes: 75,
    title: 'Testing every ring: the payoff of the dependency rule',
    lead: 'If the dependency rule holds, every ring can be tested with nothing but the rings inside it. The lab\'s 79 tests show what that buys: the 65 tests in rings 1–3 run without a framework, a database or a network.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Choose the cheapest test that catches a given bug, ring by ring.</li>
<li>Build a test world of hand-written fakes that honour the gateway contracts – including rollback and optimistic locking.</li>
<li>Test interactors through their boundaries: request in, presenter calls out.</li>
<li>Test controllers and presenters without HTTP, and keep framework tests for the humble objects.</li>
<li>Explain Uncle Bob's "tests are part of the system" and the fragile-test problem.</li>
</ul></div>

<h3>Tests per ring</h3>
${fig('12-tests-per-ring', 'Tests per ring in the code lab. The further in, the cheaper each test and the fewer fakes it needs; the build itself tests the dependency rule.')}
<table>
<tr><th>Ring</th><th>Test classes</th><th>Tests</th><th>Needs</th></tr>
<tr><td><span class="ring-tag ring-entity">1</span></td><td><code>ScreeningCaseTest</code>, <code>NameMatchingPolicyTest</code></td><td class="num">27</td><td>nothing</td></tr>
<tr><td><span class="ring-tag ring-usecase">2</span></td><td><code>CaseUseCasesTest</code>, <code>ListWorkQueueInteractorTest</code></td><td class="num">13</td><td><code>TestWorld</code> fakes, <code>RecordingPresenter</code></td></tr>
<tr><td><span class="ring-tag ring-iadapter">3</span></td><td><code>CasePresenterTest</code>, <code>CaseControllerTest</code>, <code>SqlCaseGatewayTest</code>, <code>OutboxTest</code>, <code>ReferenceDataTest</code></td><td class="num">25</td><td>lambdas, <code>InMemoryCaseRecords</code>, <code>InMemoryOutboxRecords</code></td></tr>
<tr><td><span class="ring-tag ring-framework">4</span></td><td><code>CaseApiTest</code> (@MicronautTest + H2), <code>CleanArchitectureTest</code> (ArchUnit)</td><td class="num">14</td><td>the application context</td></tr>
</table>

<h3>Ring 1: the domain, alone</h3>
<p>Entity tests construct aggregates, call business methods and assert on state and events. No mocks at all – there is nothing to mock, because ring 1 depends on nothing. These tests are the specification of the enterprise rules; a compliance officer should be able to read the names.</p>

<h3>Ring 2: a test world of fakes</h3>
<p>Interactor tests need gateways. Mocking libraries tempt you to stub <code>save()</code> to do nothing – an LSP violation that lets real bugs pass. The lab writes <b>fakes that honour the contracts</b> instead:</p>
${code('java', String.raw`
/**
 * Every gateway as a hand-written in-memory fake, plus the interactors wired to them. This is the payoff of the
 * dependency rule: the use cases run in milliseconds with no framework, database or network.
 */
public final class TestWorld {

    public final Cases cases = new Cases();                 // bumps a version on save, throws on stale versions
    public final Keys keys = new Keys();                    // idempotency keys per client group
    public final Outbox outbox = new Outbox();              // records events in order
    public final Transactions transactions = new Transactions();   // snapshots fakes, restores them on failure
    public final ReferenceData referenceData = new ReferenceData(List.of(SANCTIONED_ALBESCU));
    public final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

    public final ScreenCaseInteractor screenCase =
            new ScreenCaseInteractor(cases, referenceData, outbox, transactions, policy, clock);

    /** Snapshots every fake before a write and restores them on failure: a rollback. */
    public final class Transactions implements TransactionRunner {
        public boolean inWrite;
        // ...
    }

    public final class ReferenceData implements ReferenceDataGateway {
        public boolean calledInsideWriteTransaction;

        @Override
        public List<ReferenceProfile> candidatesFor(Party party) {
            calledInsideWriteTransaction |= transactions.inWrite;
            return profiles;
        }
    }
}`, 'screening-usecases/src/test/…/testsupport/TestWorld.java')}
<p>The interactor's outcome is observed through its output boundary. <code>RecordingPresenter</code> records which method was called; <code>only()</code> fails the test if the interactor presented zero or two outcomes – a real bug class in output-boundary designs.</p>
${code('java', String.raw`
@Test
void referenceDataIsFetchedOutsideTheWriteTransaction() {
    String caseId = open("bank-a", null).caseId();

    RecordingPresenter presenter = screen("bank-a", caseId);

    assertThat(presenter.response.matches()).extracting(CaseResponse.MatchResponse::profileId)
            .containsExactly("WC-1001");
    assertThat(world.referenceData.calledInsideWriteTransaction).isFalse();
}

@Test
void sameIdempotencyKeyPresentsTheSameCaseAsAReplay() {
    CaseResponse first = open("bank-a", "onboarding-42");
    RecordingPresenter replay = present(p -> world.openCase.execute(request("bank-a", "onboarding-42"), p));
    CaseResponse otherTenant = open("bank-b", "onboarding-42");

    assertThat(replay.newlyOpened).isFalse();
    assertThat(replay.response.caseId()).isEqualTo(first.caseId());
    assertThat(otherTenant.caseId()).isNotEqualTo(first.caseId());
    assertThat(world.outbox.types()).containsExactly("CaseOpened", "CaseOpened");
}`, 'screening-usecases/src/test/…/CaseUseCasesTest.java')}
<div class="callout expert"><strong>Testing an application rule that is about <i>timing</i></strong><p>"Reference data is fetched outside the write transaction" sounds untestable without a database. With a <code>TransactionRunner</code> fake that knows whether it is inside <code>write</code>, it is one boolean. Every application rule should be testable this way; if one is not, a detail has leaked into ring 2.</p></div>

<h3>Ring 3: controllers and presenters without HTTP</h3>
${code('java', String.raw`
/**
 * The controller is tested with lambdas standing in for the input boundaries: it must pack the right request,
 * hand over a presenter and return whatever that presenter decided.
 */
class CaseControllerTest {

    @Test
    void aMalformedFormIs400AndNoUseCaseRuns() {
        ViewModel vm = controller.open("acme-bank", null, new OpenCaseForm(" ", "PERSON", null, "ROU"));

        ProblemJson problem = (ProblemJson) vm.body();
        assertThat(vm.status()).isEqualTo(400);
        assertThat(problem.rule()).isEqualTo(ProblemJson.MALFORMED_REQUEST);
        assertThat(problem.errors()).containsExactly(
                "name: must not be blank",
                "entityType: must be one of INDIVIDUAL, ORGANISATION",
                "country: must be two letters");
        assertThat(requests).isEmpty();
    }
}`, 'screening-interface-adapters/src/test/…/web/CaseControllerTest.java')}
<p>Input boundaries are single-method interfaces, so a lambda is a complete test double. <code>CasePresenterTest</code> calls presenter methods directly and asserts on the view model – 201 + Location, 200 on replay, labels, allowed actions, one status per failure kind – all without starting Netty. <code>SqlCaseGatewayTest</code> runs the real gateway on <code>InMemoryCaseRecords</code>, which enforces versions exactly like the database.</p>

<h3>Ring 4: few, wide, and about wiring</h3>
<p><code>CaseApiTest</code> starts Micronaut with H2 and sends real HTTP: a full lifecycle, an idempotent replay, tenant isolation, each kind of 400, a 422 and the work queue. Its job is not to re-test the rules – rings 1–3 did that – but to prove the <b>wiring</b>: routes, Serde imports, the error handler, transactions, Flyway, the factory. <code>CleanArchitectureTest</code> runs in the same module and checks the dependency rule itself.</p>

<h3>Try it: which test catches this?</h3>
<div data-sim="test-classifier"></div>

<div class="callout pitfall"><strong>The fragile-test problem</strong><p>Uncle Bob: "tests are part of the system", and they obey the dependency rule too. Tests coupled to the GUI or the database break whenever those change, and teams stop changing the structure to avoid fixing them. Test the rules through boundaries (request in, presenter calls out) and tests survive refactoring. If renaming a database column breaks an interactor test, the test is coupled to a detail.</p></div>

<div data-quiz="m12"></div>
`,
  });

  Course.quiz('m12', [
    { q: 'A bug: closing a case with a POSSIBLE match succeeds. Which is the cheapest test that catches it?', options: ['CaseApiTest', 'ScreeningCaseTest', 'CasePresenterTest', 'CleanArchitectureTest'], answer: 1, why: 'It is an enterprise rule in ring 1. A plain unit test on the aggregate takes milliseconds.' },
    { q: 'Why does <code>TestWorld.Cases</code> throw ConcurrentCaseUpdateException on stale versions instead of just storing the case?', options: ['To slow tests down', 'A fake must honour the gateway contract (LSP), or conflict handling is never tested', 'It is copied from production', 'H2 requires it'], answer: 1, why: 'Fakes that weaken contracts let real bugs pass.' },
    { q: 'How does CaseUseCasesTest assert that another tenant gets "not found"?', options: ['It checks for a 404 status', 'RecordingPresenter.only() returns "notFound"', 'It catches CaseNotFoundException', 'It queries the database'], answer: 1, why: 'Interactor tests observe outcomes through the output boundary, not HTTP and not exceptions.' },
    { q: 'What is the main job of <code>CaseApiTest</code>?', options: ['Testing every business rule', 'Proving the wiring: routes, Serde, error handler, transactions, migrations, factory', 'Testing the presenter labels', 'Load testing'], answer: 1, why: 'Rules are tested in the inner rings; the framework test covers what only the running framework can show.' },
    { q: 'Which double is enough to test CaseController?', options: ['A full Micronaut context', 'Mockito mocks of every interactor class', 'Lambdas implementing the single-method input boundaries', 'An H2 database'], answer: 2, why: 'The controller depends only on input-boundary interfaces, each with one method.' },
  ]);
})();
