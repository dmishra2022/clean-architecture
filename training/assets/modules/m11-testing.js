(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'testing', num: 11, level: 'Practitioner', minutes: 65,
    title: 'Testing a hexagon: fast at the core, real at the edges',
    lead: 'The architecture pays for itself here: each ring has a natural test type, and most tests need no framework at all.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Design a test portfolio per ring and justify its shape.</li>
<li>Write expressive domain tests, application tests with hand-written fakes, adapter integration tests and API tests.</li>
<li>Decide what to fake, what to run for real, and what never to mock.</li>
<li>Pick the cheapest test that catches a given bug.</li>
</ul></div>

<h3>The portfolio</h3>
${fig('11-test-pyramid', 'Test types mapped to rings. The wide base is fast, framework-free and runs on every save.')}
<table>
<tr><th>Ring</th><th>Test type</th><th>Code lab</th><th>Count</th><th>Needs</th></tr>
<tr><td>Domain</td><td>Plain unit tests</td><td><code>ScreeningCaseTest</code>, <code>NameMatchingPolicyTest</code></td><td>27</td><td>JDK only</td></tr>
<tr><td>Application</td><td>Use-case tests with fakes for ports</td><td><code>CaseApplicationServiceTest</code></td><td>6</td><td>JDK only</td></tr>
<tr><td>Architecture</td><td>ArchUnit rules</td><td><code>HexagonalArchitectureTest</code></td><td>5</td><td>Bytecode</td></tr>
<tr><td>Driven adapters</td><td>Integration tests through the port</td><td><code>JdbcCaseRepositoryTest</code></td><td>2</td><td>Micronaut + DB</td></tr>
<tr><td>Whole hexagon</td><td>API tests over HTTP</td><td><code>CaseApiTest</code></td><td>6</td><td>Micronaut + DB + HTTP</td></tr>
</table>

<h3>Domain tests: the specification</h3>
<p>Name each test as a sentence an analyst would agree with. Each invariant gets at least one test.</p>
${code('java', String.raw`
@Test
void fourEyesTheConfirmingAnalystCannotDowngradeAPositive() {
    ScreeningCase c = screenedCase();
    MatchId id = c.matches().getFirst().id();
    c.resolveMatch(id, Resolution.POSITIVE, SAME_PERSON, ALICE, T0);

    assertRule(() -> c.resolveMatch(id, Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, ALICE, T0),
            ScreeningCase.FOUR_EYES);
}

@Test
void rescreeningKeepsResolutionsAndNeverDuplicates() {
    ScreeningCase c = screenedCase();
    Match match = c.matches().getFirst();
    c.resolveMatch(match.id(), Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, ALICE, T0);

    c.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, T0.plusSeconds(60));

    assertThat(c.matches()).singleElement().satisfies(m -> {
        assertThat(m.id()).isEqualTo(match.id());
        assertThat(m.resolution()).isEqualTo(Resolution.FALSE_POSITIVE);
    });
    assertThat(c.status()).isEqualTo(CaseStatus.REVIEWED);
    assertThat(c.screeningCount()).isEqualTo(2);
}`, 'src/test/…/domain/model/ScreeningCaseTest.java')}
<ul>
<li>Fixed time (<code>T0</code>) is passed in – the domain never calls <code>Instant.now()</code> for business timestamps.</li>
<li>Assert on rule codes, not message text.</li>
<li>Test data lives in <code>TestProfiles</code> (named fixtures like <code>ALBESCU_NAMESAKE</code>) so tests read like scenarios.</li>
</ul>

<h3>Application tests: fakes, not mocks</h3>
<p>Each port gets a small, hand-written fake that behaves like the real thing. Fakes are reusable, readable and test behaviour rather than call sequences.</p>
${code('java', String.raw`
/** Snapshots the fakes before each write and restores them on failure: a rollback. */
final class TrackingUnitOfWork implements UnitOfWork {
    boolean inWrite;

    @Override
    public <T> T write(Supplier<T> work) {
        Map<CaseId, CaseSnapshot> cases = repository.copy();
        int events = outbox.events.size();
        inWrite = true;
        try {
            return work.get();
        } catch (RuntimeException e) {
            repository.restore(cases);
            outbox.events.subList(events, outbox.events.size()).clear();
            throw e;
        } finally {
            inWrite = false;
        }
    }
    // read(...) just runs the work
}

@Test
void referenceDataIsFetchedOutsideTheWriteTransaction() {
    CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());
    service.screen(new ScreenCaseCommand(BANK_A, id));

    assertThat(referenceData.calledInsideWriteTransaction).isFalse();
}

@Test
void aRuleViolationRollsBackTheWholeUnitOfWork() {
    CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());
    int eventsBefore = outbox.events.size();

    assertThatThrownBy(() -> service.close(new CloseCaseCommand(BANK_A, id, new AnalystId("alice"))))
            .isInstanceOf(DomainException.class);

    assertThat(outbox.events).hasSize(eventsBefore);
    assertThat(service.find(BANK_A, id)).hasValueSatisfying(v -> assertThat(v.status()).isEqualTo("CREATED"));
}`, 'src/test/…/application/CaseApplicationServiceTest.java')}
<div class="callout rule"><strong>What never to mock</strong><ul>
<li><b>Value objects and the aggregate.</b> Use the real ones; they are fast and they are what you are testing.</li>
<li><b>Types you do not own</b> (JDBC, HTTP clients). Wrap them in an adapter and test the adapter against the real thing.</li>
<li>Mocks that verify call order (<code>verify(repo).save(any())</code>) test implementation, not behaviour. They break on every refactoring.</li>
</ul></div>

<h3>Adapter tests: through the port, against reality</h3>
${code('java', String.raw`
/** The adapter is tested through its port, against the real schema created by Flyway. */
@MicronautTest
class JdbcCaseRepositoryTest {

    @Inject
    CaseRepository repository;                      // the port, not JdbcCaseRepository

    @Test
    void twoAnalystsSavingTheSameVersionConflict() {
        ScreeningCase c = ScreeningCase.open(CaseId.newId(), new ClientGroupId("bank-a"), TestProfiles.viktorAlbescu(), NOW);
        repository.save(c);

        ScreeningCase alicesCopy = repository.findById(c.id()).orElseThrow();
        ScreeningCase bobsCopy = repository.findById(c.id()).orElseThrow();
        alicesCopy.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, NOW);
        bobsCopy.screen(List.of(), policy, NOW);

        repository.save(alicesCopy);
        assertThatThrownBy(() -> repository.save(bobsCopy)).isInstanceOf(ConcurrentCaseUpdateException.class);
        assertThat(repository.findById(c.id()).orElseThrow().matches()).hasSize(1);
    }
}`, 'src/test/…/adapter/out/persistence/JdbcCaseRepositoryTest.java')}
<div class="callout expert"><strong>H2 is a stand-in</strong><p>The lab uses H2 so it runs anywhere. In production code, test against the real engine: add <code>micronaut-test-resources</code> (it starts a PostgreSQL container automatically when <code>datasources.default.url</code> is missing) or Testcontainers. Dialect differences – locking, JSON columns, <code>SKIP LOCKED</code> – are exactly the bugs H2 hides.</p></div>

<h3>API tests: the whole hexagon, few and meaningful</h3>
${code('java', String.raw`
@MicronautTest
class CaseApiTest {

    @Inject @Client("/") HttpClient httpClient;
    @Inject OutboxRelay relay;
    @Inject LoggingEventSink sink;

    @Test
    void screenResolveAndCloseACase() {
        CaseResponse opened = open(Map.of("name", "Viktor Albescu", "entityType", "INDIVIDUAL",
                "dateOfBirth", "1961-03-14", "country", "RO"), null);
        // ... screen, resolve POSITIVE, close ...
        assertThat(closed.outcome()).isEqualTo("RISK_CONFIRMED");

        relay.publishPending();
        assertThat(sink.recent())
                .filteredOn(e -> e.caseId().toString().equals(opened.caseId()))
                .extracting(IntegrationEvent::type)
                .containsExactly("CaseOpened", "CaseScreened", "MatchResolved", "CaseClosed");
    }
}`, 'src/test/…/adapter/in/rest/CaseApiTest.java')}
<p>API tests verify wiring and contracts: status codes, problem bodies, headers, idempotency, tenant isolation, events published. They do <b>not</b> re-test every business rule – the domain tests already did.</p>
<div class="callout pitfall"><strong>Micronaut testing gotchas</strong><ul>
<li>Use a random port in tests (<code>micronaut.server.port: -1</code> in <code>application-test.yml</code>), or parallel builds collide.</li>
<li>Each distinct test configuration starts a new context. Keep <code>@Property</code> overrides consistent to reuse contexts.</li>
<li>Isolate data per test (the lab uses a random client group per test) instead of truncating tables.</li>
</ul></div>

<div data-sim="test-classifier"></div>

<div data-quiz="m11"></div>
`,
  });

  Course.quiz('m11', [
    { q: 'Where is "a case cannot close with a POSSIBLE match" best tested?', options: ['API test', 'Domain unit test on ScreeningCase', 'Adapter test', 'Manual QA'], answer: 1, why: 'It is a domain invariant: test it in milliseconds with plain JUnit.' },
    { q: 'Why does the application test use a hand-written <code>TrackingUnitOfWork</code> instead of a mock?', options: ['Mocks are not allowed', 'It behaves like a real transaction (rollback) and records facts to assert on, so tests check behaviour, not call sequences', 'It is faster than a mock', 'Mockito cannot mock interfaces'], answer: 1, why: 'Behavioural fakes survive refactoring and can prove rollback and transaction placement.' },
    { q: 'Which should you NOT mock?', options: ['The CaseRepository port in an application test', 'Value objects like PartyName', 'The reference-data port', 'The clock'], answer: 1, why: 'Use real value objects and aggregates. Fake the ports at the boundary.' },
    { q: 'What do API tests primarily verify?', options: ['Every business rule', 'Wiring and contract: status codes, problem bodies, headers, tenant isolation, events published', 'SQL performance', 'Domain event names'], answer: 1, why: 'Rules are covered below. API tests prove the pieces are connected and the contract holds.' },
    { q: 'Why should production adapter tests use the real database engine rather than H2?', options: ['H2 is slow', 'Dialect differences (locking, SKIP LOCKED, JSON types) are exactly the bugs H2 hides', 'Micronaut does not support H2', 'For licensing'], answer: 1, why: 'Test Resources/Testcontainers give you the real engine at low cost.' },
  ]);
})();
