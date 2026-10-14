(function () {
  const { code } = Course;
  Course.module({
    id: 'final-assessment', num: 17, level: 'Leader', minutes: 150,
    title: 'Final assessment and capstone',
    lead: 'Twenty-four questions across the whole course, then a capstone feature built through all four rings of the code lab and reviewed against a rubric.',
    html: `
<h3>Part 1 – Knowledge check</h3>
<p>Twenty-four questions, mixed levels. 80% to pass. Explanations appear after submitting.</p>
<div data-quiz="final"></div>

<h3>Part 2 – Capstone: senior closure for sanctions positives, plus a CLI</h3>
<div class="callout wc"><strong>Business request</strong><p>"From next quarter, any case with a POSITIVE match in category SANCTIONS can only be closed by a <b>senior analyst</b>. The case history must show who the senior was. Separately, operations want a command-line tool that closes cases from a file, with exit code 0 on success and a non-zero code per kind of failure."</p></div>
<h4>What to deliver, ring by ring</h4>
<ol>
<li><b>Language</b> – is "senior analyst" a role, a property of <code>AnalystId</code>, or a fact another context owns? Decide and record it in a one-page ADR.</li>
<li><b>Ring 1</b> – a new invariant in <code>ScreeningCase.close(...)</code> with rule code <code>SENIOR_REQUIRED</code>; update the invariants Javadoc. Tests: junior blocked, senior allowed, non-sanctions positive unaffected, CLEAR outcome unaffected.</li>
<li><b>Ring 2</b> – <code>CloseCaseInteractor</code> learns seniority through a new gateway it owns (e.g. <code>AnalystDirectoryGateway.seniorityOf(AnalystId)</code>), queried <i>outside</i> the write transaction, passed into the aggregate as a value. Tests in <code>CaseUseCasesTest</code> with a fake directory. The output boundary does not change – a new rule is just another <code>presentRuleViolation</code>.</li>
<li><b>Ring 3</b> – an in-memory directory gateway; verify <code>CasePresenter</code> returns 422 <code>SENIOR_REQUIRED</code> with no code change. Add a <code>CliCasePresenter</code> implementing <code>CaseOutputBoundary</code> that produces an exit code and a line of text, and a <code>CliController</code> that turns a CSV line into a <code>CloseCaseRequest</code>.</li>
<li><b>Ring 4</b> – wire the directory in <code>MainWiring</code> with <code>@Requires</code>; add a CLI entry point (a plain <code>main</code> or picocli) that builds the same interactors. Decide whether <code>CaseClosed</code> gains a <code>seniorAnalyst</code> field (additive, schemaVersion stays 1) and update <code>EventJson</code>.</li>
<li><b>Enforcement</b> – all six ArchUnit rules pass; rings 1–3 still compile without Micronaut; the CLI never imports an interactor class.</li>
<li><b>Review</b> – open a PR and review it with the checklist from module 15 together with a peer.</li>
</ol>
${code('java', String.raw`
// One possible design – not the only valid one.
// ring 2
public interface AnalystDirectoryGateway {
    AnalystSeniority seniorityOf(AnalystId analyst);
}

// CloseCaseInteractor.execute
AnalystSeniority seniority = directory.seniorityOf(analyst);          // outside the write transaction
CaseResponse response = transactions.write(() -> {
    ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
    screeningCase.close(analyst, seniority, clock.instant());           // ring 1 decides
    cases.save(screeningCase);
    outbox.append(screeningCase.pullEvents());
    return CaseResponse.from(screeningCase);
});
presenter.presentCase(response);

// ring 3 – a second delivery mechanism, same interactor
public final class CliCasePresenter implements CaseOutputBoundary {
    private int exitCode = -1;
    private String line;
    @Override public void presentCase(CaseResponse r)             { exitCode = 0; line = r.caseId() + " " + r.status(); }
    @Override public void presentRuleViolation(String rule, String m) { exitCode = 3; line = rule + ": " + m; }
    @Override public void presentNotFound(String caseId)          { exitCode = 4; line = "not found: " + caseId; }
    @Override public void presentConflict(String caseId)          { exitCode = 5; line = "conflict: " + caseId; }
    // ...
}`, 'hint')}

<h4>Rubric</h4>
<table>
<tr><th>Criterion</th><th>1 – Needs work</th><th>3 – Competent</th><th>5 – Expert</th></tr>
<tr><td>Rule placement</td><td>Check in controller or interactor</td><td>Invariant in the aggregate with tests</td><td>Also reasons about four-eyes overlap and rescreening after a senior closure</td></tr>
<tr><td>Gateway design</td><td>Aggregate calls the directory</td><td>Gateway owned by ring 2, value passed in</td><td>Gateway shaped by need; failure mode of the directory handled as an outcome; called outside the transaction</td></tr>
<tr><td>Boundaries</td><td>Entities or exceptions reach ring 3</td><td>Request/response models only</td><td>Output boundary untouched; new presenter added without editing ring 2</td></tr>
<tr><td>Second delivery mechanism</td><td>CLI duplicates logic</td><td>CLI controller + presenter call the same interactor</td><td>Exit codes documented; tests for the CLI presenter without a process</td></tr>
<tr><td>Contracts</td><td>Event or API broken silently</td><td>Additive change, tests updated</td><td>Consumers identified; ADR states the versioning decision</td></tr>
<tr><td>Tests &amp; enforcement</td><td>Only API tests</td><td>Entity + interactor + presenter + one API test</td><td>Cheapest test per behaviour; fakes honour contracts; ArchUnit green</td></tr>
</table>
<p><b>Pass</b>: average ≥ 3 with no criterion at 1. <b>Ready to lead</b>: average ≥ 4 and you have facilitated one session from the facilitator guide.</p>

<h3>Part 3 – Certification checklist</h3>
<ul>
<li>☐ All 17 module quizzes passed (see the sidebar)</li>
<li>☐ Final assessment ≥ 80%</li>
<li>☐ Capstone reviewed against the rubric</li>
<li>☐ All ten Mission Control missions predicted and verified against the real service</li>
<li>☐ Explained the dependency rule, the output boundary and the Main component to a colleague without notes</li>
<li>☐ Explained, with the lab open, two differences between this design and the hexagonal lab</li>
<li>☐ Facilitated one Event Storming or kata session</li>
</ul>
<div class="callout lead"><strong>What next</strong><p>Use <code>facilitator-guide.md</code> to run the course as an 8-week cohort, <code>clean-vs-hexagonal.md</code> to choose a style per service, and <code>code-lab/README.md</code> for further exercises (Kafka sink, PostgreSQL, a CLI, a v2 presenter).</p></div>
`,
  });

  Course.quiz('final', [
    { q: 'The goal of software architecture, according to Clean Architecture, is…', options: ['Maximum performance', 'Minimising the human effort needed to build and maintain the system', 'Using the newest frameworks', 'Having four layers'], answer: 1, why: 'Everything else is a means to that end.' },
    { q: 'The dependency rule constrains…', options: ['The direction of runtime calls', 'The direction of source-code dependencies: only inward', 'The number of classes per ring', 'Database access'], answer: 1, why: 'Calls go both ways; dependencies only inward.' },
    { q: 'SRP in Uncle Bob\'s formulation is about…', options: ['Functions doing one thing', 'One actor per module', 'One class per file', 'One method per interface'], answer: 1, why: 'Modules change for the people who request changes.' },
    { q: 'Which principle makes the gateway pattern possible?', options: ['LSP', 'ISP', 'DIP', 'OCP'], answer: 2, why: 'The inner ring owns the abstraction; the outer ring implements it.' },
    { q: 'screening-app has Ca = 0 and Ce = 3. Its instability is…', options: ['0', '0.33', '0.75', '1'], answer: 3, why: 'I = 3 / (0 + 3) = 1: maximally unstable, which is right for the outermost ring.' },
    { q: 'An anti-corruption layer for reference data lives in…', options: ['Ring 1', 'Ring 2', 'Ring 3, behind ReferenceDataGateway', 'The provider\'s code'], answer: 2, why: 'ProfileTranslator and RemoteReferenceData in screening-interface-adapters.' },
    { q: '"A case cannot close while a match is POSSIBLE" is…', options: ['An application rule', 'An enterprise rule in ScreeningCase', 'A presentation rule', 'A database constraint'], answer: 1, why: 'It would exist without software.' },
    { q: '"Same Idempotency-Key returns the same case" is…', options: ['An enterprise rule', 'An application rule in OpenCaseInteractor', 'A presenter rule', 'A Micronaut feature'], answer: 1, why: 'It exists because clients retry over a network.' },
    { q: 'Why does a request model carry strings instead of value objects?', options: ['Performance', 'So controllers do not depend on how the entities represent data; the interactor builds value objects', 'JSON requires strings', 'Value objects cannot be in records'], answer: 1, why: 'Plain data crosses boundaries.' },
    { q: 'An interactor reports "case not found" by…', options: ['Throwing CaseNotFoundException to the controller', 'Returning null', 'Calling presenter.presentNotFound(caseId)', 'Returning a 404'], answer: 2, why: 'Outcomes catches the exception inside ring 2 and calls the output boundary.' },
    { q: 'When does the presenter run relative to the transaction?', options: ['Before it starts', 'Inside it', 'After commit or rollback', 'In a separate transaction'], answer: 2, why: 'Never present success for a change that might roll back.' },
    { q: 'Where are HTTP status codes decided in the lab?', options: ['In the interactors', 'In CasePresenter (and ProblemJson)', 'In CaseEndpoint', 'In ScreeningCase'], answer: 1, why: 'The endpoint only copies the view model.' },
    { q: 'Forms.errors() rejects a blank name. What happens next?', options: ['The interactor runs and rolls back', '400 MALFORMED_REQUEST; no use case runs', '422', 'The name is trimmed and accepted'], answer: 1, why: 'Shape checks stop the request in ring 3.' },
    { q: 'Why does the controller create a new presenter per request?', options: ['Style', 'Presenters are stateful; sharing one leaks responses between concurrent requests and tenants', 'Memory', 'Micronaut requires it'], answer: 1, why: 'Per-request state must not be a singleton.' },
    { q: 'Who translates OptimisticLockException into something the use cases understand?', options: ['The aggregate', 'Ring 4 → StaleRecordException, ring 3 → ConcurrentCaseUpdateException', 'The presenter', 'Netty'], answer: 1, why: 'One translation per boundary.' },
    { q: 'The Main component is…', options: ['The entities module', 'The dirtiest component: it creates every concrete object and exposes interfaces', 'A controller', 'Optional'], answer: 1, why: 'MainWiring is a @Factory in screening-app.' },
    { q: 'How does Micronaut serialise ring-3 records without annotations on them?', options: ['Reflection', '@SerdeImport in ring 4', 'Jackson mixins', 'It cannot'], answer: 1, why: 'Serdes are generated at compile time from the outside.' },
    { q: 'Why does the lab use a TransactionRunner interface instead of @Transactional?', options: ['@Transactional is deprecated', 'Ring 2 decides where transactions begin and end without depending on the framework, and can use several short ones', 'H2 limitation', 'Performance'], answer: 1, why: 'The use case says where; ring 4 says how.' },
    { q: 'What stops ScreeningCase from importing a Micronaut annotation?', options: ['Code review only', 'screening-entities has no Micronaut on its classpath, so it does not compile; ArchUnit backs it up', 'Nothing', 'The JVM'], answer: 1, why: 'Module per ring makes the compiler enforce the rule.' },
    { q: 'Which partial boundary keeps all interfaces and models but uses one module?', options: ['Facade', 'One-dimensional boundary', 'Skip the last step', 'Full boundary'], answer: 2, why: 'Cheap to split later, but easier to erode.' },
    { q: 'The cheapest test for "the reference-data call happens outside the write transaction" is…', options: ['A load test', 'A @MicronautTest with H2', 'An interactor test with a TransactionRunner fake that records whether it is inside write', 'A manual test'], answer: 2, why: 'Application rules are testable with honest fakes in ring 2.' },
    { q: 'The outbox guarantees…', options: ['Exactly-once delivery', 'State and event commit atomically; delivery is at-least-once, in order, after a delay', 'No duplicates', 'Synchronous delivery'], answer: 1, why: 'Consumers de-duplicate on eventId.' },
    { q: 'A read model like the work queue may…', options: ['Never bypass the entities', 'Read tables directly without rehydrating aggregates; writes still go through the entities', 'Write to tables directly', 'Call presenters'], answer: 1, why: 'Reads may bypass the entities; writes never do.' },
    { q: 'Compared with the hexagonal lab, the Clean lab mainly adds…', options: ['A different domain model', 'Separate enterprise/application rings, request/response models, output boundaries with presenters, and module-level enforcement', 'A different framework', 'Nothing'], answer: 1, why: 'Same domain and rule; more explicit boundaries and more types.' },
  ]);
})();
