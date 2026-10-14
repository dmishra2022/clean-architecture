(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'use-cases', num: 6, level: 'Practitioner', minutes: 85,
    title: 'Ring 2 – Use cases: interactors, boundaries and models',
    lead: 'A use case is one intention of one actor – open a case, resolve a match. In Clean Architecture it is a small family of types: input boundary, request model, interactor, response model, output boundary, and the gateways it needs.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Name the six parts of a Clean use case and say which ring owns each.</li>
<li>Write an interactor that orchestrates entities, owns its transaction and reports every outcome through a presenter.</li>
<li>Explain why request and response models are plain data and never entities.</li>
<li>Recognise application business rules: idempotency, transaction scope, tenancy, triage.</li>
</ul></div>

<h3>Anatomy of a use case</h3>
${fig('08-use-case-anatomy', 'One use case, step by step. Everything inside the red ring is owned by screening-usecases; the controller and presenter in green only implement or call interfaces declared there.')}
<table>
<tr><th>Part</th><th>Kind</th><th>ResolveMatch in the lab</th></tr>
<tr><td>Input boundary</td><td>interface, called by a controller</td><td><code>ResolveMatch</code></td></tr>
<tr><td>Request model</td><td>record of plain values</td><td><code>ResolveMatchRequest(clientGroupId, caseId, matchId, resolution, rationale, analystId)</code></td></tr>
<tr><td>Interactor</td><td>class implementing the input boundary</td><td><code>ResolveMatchInteractor</code></td></tr>
<tr><td>Gateways</td><td>interfaces the interactor needs</td><td><code>CaseGateway</code>, <code>EventOutboxGateway</code>, <code>TransactionRunner</code></td></tr>
<tr><td>Response model</td><td>record of plain values</td><td><code>CaseResponse</code> with <code>MatchResponse</code> list</td></tr>
<tr><td>Output boundary</td><td>interface, implemented by a presenter</td><td><code>CaseOutputBoundary</code></td></tr>
</table>

<h3>Input boundary and request model</h3>
${code('java', String.raw`
/** Input boundary: close a fully reviewed case and record its outcome. */
public interface CloseCase {

    void execute(CloseCaseRequest request, CaseOutputBoundary presenter);
}

public record CloseCaseRequest(String clientGroupId, String caseId, String analystId) {
}`, 'screening-usecases/…/closecase')}
<p>Two decisions hide in these few lines:</p>
<ul>
<li><b><code>execute</code> returns <code>void</code>.</b> The result goes to the presenter passed in. This is Uncle Bob's original design: the flow of control goes controller → interactor → presenter, never back through the controller.</li>
<li><b>The request model holds strings, not value objects.</b> The controller should not need to know how the model represents a case id or an analyst. The interactor builds <code>CaseId</code>, <code>AnalystId</code> – and those validate themselves.</li>
</ul>
${code('java', String.raw`
/**
 * Request model: a plain data structure built by a controller. It holds no entity types, so a controller never
 * needs to know how the model represents a party; the interactor builds the value objects and they validate
 * themselves.
 */
public record OpenCaseRequest(
        String clientGroupId,
        String idempotencyKey,
        String name,
        String entityType,
        LocalDate dateOfBirth,
        String country) {
}`, 'screening-usecases/…/opencase/OpenCaseRequest.java')}

<h3>The interactor</h3>
${code('java', String.raw`
public final class CloseCaseInteractor implements CloseCase {

    private final CaseGateway cases;
    private final EventOutboxGateway outbox;
    private final TransactionRunner transactions;
    private final Clock clock;

    @Override
    public void execute(CloseCaseRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            CaseId caseId = CaseId.of(request.caseId());
            AnalystId analyst = new AnalystId(request.analystId());

            CaseResponse response = transactions.write(() -> {
                ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
                screeningCase.close(analyst, clock.instant());
                cases.save(screeningCase);
                outbox.append(screeningCase.pullEvents());
                return CaseResponse.from(screeningCase);
            });

            presenter.presentCase(response);
        });
    }
}`, 'screening-usecases/…/closecase/CloseCaseInteractor.java')}
<p>Read it as a recipe every write use case follows:</p>
<ol>
<li>Turn request strings into value objects (invalid → <code>INVALID_VALUE</code>).</li>
<li>Open a write transaction through <code>TransactionRunner</code> – the use case decides <i>where</i> it starts and ends; ring 4 decides <i>how</i>.</li>
<li>Load the aggregate for this tenant, call <b>one</b> business method, save, append its events to the outbox – all inside the transaction.</li>
<li>Convert to a response model <i>inside</i> the transaction, while the aggregate is consistent.</li>
<li>Present <b>after</b> commit. If the transaction rolls back, the presenter receives a failure instead.</li>
</ol>

<h3>Failures are outcomes too</h3>
<p>The interactor never throws a business failure at the controller. <code>Outcomes</code> catches the three expected failure types – after the transaction has already rolled back – and calls the right presenter method. Unexpected exceptions (a bug, a database outage) are not outcomes and propagate.</p>
${code('java', String.raw`
public static void presentingFailures(CaseOutputBoundary presenter, Runnable useCase) {
    try {
        useCase.run();
    } catch (DomainException e) {
        if (e.isInvalidValue()) {
            presenter.presentInvalidRequest(e.rule(), e.getMessage());
        } else {
            presenter.presentRuleViolation(e.rule(), e.getMessage());
        }
    } catch (CaseNotFoundException e) {
        presenter.presentNotFound(e.caseId().toString());
    } catch (ConcurrentCaseUpdateException e) {
        presenter.presentConflict(e.caseId().toString());
    }
}`, 'screening-usecases/…/shared/Outcomes.java')}
${code('java', String.raw`
public interface CaseOutputBoundary {

    /** A case was opened, or an idempotent retry found the case the same key opened before. */
    void presentOpened(CaseResponse response, boolean newlyOpened);

    void presentCase(CaseResponse response);

    /** The request contained a value the model cannot accept (rule INVALID_VALUE). */
    void presentInvalidRequest(String rule, String message);

    /** The request was well formed but the entities refused it (four-eyes, closed case, open matches, ...). */
    void presentRuleViolation(String rule, String message);

    /** The case does not exist for this client group. Deliberately indistinguishable from "does not exist". */
    void presentNotFound(String caseId);

    /** Another analyst changed the case since it was loaded. */
    void presentConflict(String caseId);
}`, 'screening-usecases/…/shared/CaseOutputBoundary.java')}
<div class="callout expert"><strong>Why not just throw and map in a global error handler?</strong><p>That is what the hexagonal lab does, and it works. The output boundary makes the set of outcomes <b>part of the use case's contract</b>: a CLI or batch presenter must handle "not found" and "conflict" explicitly, the compiler lists them, and tests assert on presenter calls instead of exception types. The price is one interface and the <code>Outcomes</code> helper.</p></div>

<h3>Application business rules in the interactors</h3>
<table>
<tr><th>Rule</th><th>Interactor</th><th>Why not ring 1</th></tr>
<tr><td>Same Idempotency-Key, same client group → the same case, presented as a replay (200, not 201)</td><td><code>OpenCaseInteractor</code></td><td>Exists only because clients retry over a network.</td></tr>
<tr><td>Reference data is fetched <b>outside</b> the write transaction; optimistic locking catches races</td><td><code>ScreenCaseInteractor</code></td><td>A choice about this system's transactions and latency.</td></tr>
<tr><td>Another tenant's case is indistinguishable from a missing one</td><td><code>CaseLookup</code></td><td>A SaaS tenancy rule, not a compliance rule.</td></tr>
<tr><td>Triage: HIGH (unresolved ≥ 95), MEDIUM (unresolved), LOW; then oldest first; limit 1–100</td><td><code>ListWorkQueueInteractor</code></td><td>How this team works in this tool.</td></tr>
</table>
${code('java', String.raw`
@Override
public void execute(ScreenCaseRequest request, CaseOutputBoundary presenter) {
    Outcomes.presentingFailures(presenter, () -> {
        ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
        CaseId caseId = CaseId.of(request.caseId());

        Party party = transactions.read(() -> CaseLookup.load(cases, clientGroup, caseId).party());
        List<ReferenceProfile> candidates = referenceData.candidatesFor(party);      // slow, remote, no locks held

        CaseResponse response = transactions.write(() -> {
            ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
            screeningCase.screen(candidates, matchingPolicy, clock.instant());
            cases.save(screeningCase);                                                  // version check here
            outbox.append(screeningCase.pullEvents());
            return CaseResponse.from(screeningCase);
        });

        presenter.presentCase(response);
    });
}`, 'screening-usecases/…/screencase/ScreenCaseInteractor.java')}
<div data-sim="rule-classifier"></div>

<h3>Gateways: what the use cases need, in their language</h3>
${code('java', String.raw`
/**
 * The use case decides where a transaction starts and ends; the outer rings decide how (JDBC, JTA, nothing at
 * all in unit tests). A runtime exception thrown by work rolls everything back.
 */
public interface TransactionRunner {

    <T> T write(Supplier<T> work);

    <T> T read(Supplier<T> work);
}

/**
 * Records domain events for later publication. Implementations must write in the caller's transaction, so an
 * event is stored if and only if the state change that raised it is committed.
 */
public interface EventOutboxGateway {

    void append(List<DomainEvent> events);
}`, 'screening-usecases/…/gateway')}
<div class="callout pitfall"><strong>Use cases must not call each other</strong><p>If <code>CloseCaseInteractor</code> called <code>ViewCaseInteractor</code>, a change for one actor would ripple into another. Shared code lives in <code>shared</code> (<code>CaseLookup</code>, <code>Outcomes</code>, <code>CaseResponse</code>) or <code>gateway</code>. ArchUnit's <code>useCasesAreIndependentOfEachOther</code> enforces it.</p></div>

<div data-quiz="m06"></div>
`,
  });

  Course.quiz('m06', [
    { q: 'Why does <code>CloseCase.execute</code> return <code>void</code>?', options: ['Java style', 'The outcome is delivered to the presenter passed in, so control flows controller → interactor → presenter', 'Because closing has no result', 'To make it asynchronous'], answer: 1, why: 'The output boundary carries the result. The controller never interprets the outcome.' },
    { q: 'Why does <code>OpenCaseRequest</code> carry a <code>String name</code> instead of a <code>PartyName</code>?', options: ['Records cannot hold value objects', 'So the controller does not depend on how ring 1 represents a party; the interactor builds the value objects', 'For JSON performance', 'PartyName is not serialisable'], answer: 1, why: 'Request models are plain data. Validation of meaning still happens – in the value objects the interactor creates.' },
    { q: 'When does the interactor call <code>presenter.presentCase(response)</code>?', options: ['Before the transaction starts', 'Inside the transaction, before save', 'After the transaction has committed', 'Only if there are matches'], answer: 2, why: 'A presenter must never report success for a change that might still roll back.' },
    { q: 'A <code>ConcurrentCaseUpdateException</code> is thrown by <code>cases.save</code>. What does the client eventually see?', options: ['A 500 error', 'presentConflict → the REST presenter builds a 409 problem', 'presentRuleViolation → 422', 'Nothing; it is retried silently'], answer: 1, why: 'Outcomes maps it to presentConflict after the rollback; CasePresenter decides on 409 CONCURRENT_UPDATE.' },
    { q: 'Why does ScreenCaseInteractor call the reference-data gateway outside <code>transactions.write</code>?', options: ['The gateway cannot run in a transaction', 'To avoid holding a database transaction during a slow remote call; optimistic locking on save catches races', 'Because reads are not allowed in write transactions', 'It is an accident'], answer: 1, why: 'It is an application rule about latency and locking, tested by referenceDataIsFetchedOutsideTheWriteTransaction.' },
    { q: 'Where should a helper used by both CloseCaseInteractor and ResolveMatchInteractor live?', options: ['In one of the two interactors', 'In usecases.shared (or gateway)', 'In the presenter', 'In MainWiring'], answer: 1, why: 'Use cases do not depend on each other; shared code has its own package, which ArchUnit allows.' },
  ]);
})();
