(function () {
  const { code } = Course;
  Course.module({
    id: 'adapters', num: 7, level: 'Practitioner', minutes: 85,
    title: 'Ring 3 – Interface adapters: controllers, presenters, gateways',
    lead: 'Ring 3 converts data between the form most convenient for the use cases and the form most convenient for the outside world. All of it is plain Java – no Micronaut, no JDBC, no JSON library – so all of it is unit-testable.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Write a controller that checks shape, builds a request model and hands a fresh presenter to an input boundary.</li>
<li>Write a presenter that owns every presentation decision: status code, headers, labels, available actions, problem details.</li>
<li>Implement a gateway in two steps (aggregate ↔ records in ring 3, records ↔ rows in ring 4) and say why.</li>
<li>Decide what data may cross each boundary.</li>
</ul></div>

<h3>Two directions of conversion</h3>
<table>
<tr><th>Direction</th><th>Ring 3 class</th><th>Converts</th></tr>
<tr><td>Inbound, driving</td><td><code>CaseController</code>, <code>WorkQueueController</code>, <code>Forms</code></td><td>web form → request model</td></tr>
<tr><td>Outbound, presenting</td><td><code>CasePresenter</code>, <code>WorkQueuePresenter</code>, <code>ViewModel</code>, <code>CaseJson</code></td><td>response model → view model</td></tr>
<tr><td>Outbound, storing</td><td><code>SqlCaseGateway</code>, <code>CaseRecordMapper</code>, <code>CaseRecords</code></td><td>aggregate ↔ case and match records</td></tr>
<tr><td>Outbound, publishing</td><td><code>OutboxEventGateway</code>, <code>EventJson</code>, <code>OutboxRelay</code></td><td>domain events → published language v1</td></tr>
<tr><td>Outbound, reading upstream</td><td><code>RemoteReferenceData</code>, <code>ProfileTranslator</code></td><td>provider records → <code>ReferenceProfile</code> (ACL)</td></tr>
</table>

<h3>The controller: shape, request model, presenter</h3>
${code('java', String.raw`
/**
 * Controller in Clean Architecture terms: it packs web input into a request model, picks the input boundary and
 * hands it a fresh presenter. It does not know Micronaut; the framework's endpoint calls it with plain values.
 * It depends on input-boundary interfaces only, never on the interactors.
 */
public final class CaseController {

    public ViewModel close(String clientGroupId, String caseId, CloseCaseForm form) {
        if (form == null) {
            return malformed(List.of("body: required"));
        }
        List<String> errors = form.errors();
        if (!errors.isEmpty()) {
            return malformed(errors);
        }
        return present(p -> closeCase.execute(new CloseCaseRequest(clientGroupId, caseId, form.analystId()), p));
    }

    private static ViewModel present(Consumer<CasePresenter> useCase) {
        CasePresenter presenter = new CasePresenter();
        useCase.accept(presenter);
        return presenter.viewModel();
    }
}`, 'screening-interface-adapters/…/web/CaseController.java')}
<div class="callout rule"><strong>Shape here, meaning in the entities</strong><p><code>Forms</code> checks <i>shape</i>: present, two letters, at most 200 characters, one of a fixed set. Failure is <code>400 MALFORMED_REQUEST</code> and <b>no use case runs</b>. Whether a name is a valid <code>PartyName</code> or an organisation may have a date of birth is <i>meaning</i>, decided by ring 1 (<code>400 INVALID_VALUE</code>). Never duplicate a business rule into a form check "for a nicer message".</p></div>
<p>A <b>new presenter per request</b> is not a style choice: presenters hold state (the view model). A singleton presenter shared across threads would leak one tenant's case into another tenant's response – module 11 lets you watch it happen.</p>

<h3>The presenter: every presentation decision, in one class</h3>
${code('java', String.raw`
public final class CasePresenter implements CaseOutputBoundary {

    private static final Map<String, String> STATUS_LABELS = Map.of(
            "CREATED", "Not screened yet",
            "PENDING_REVIEW", "Waiting for analyst review",
            "REVIEWED", "Reviewed, ready to close",
            "CLOSED", "Closed");

    private ViewModel viewModel;

    @Override
    public void presentOpened(CaseResponse response, boolean newlyOpened) {
        CaseJson body = toJson(response);
        viewModel = newlyOpened ? ViewModel.created(locationOf(response), body) : ViewModel.ok(body);
    }

    @Override
    public void presentRuleViolation(String rule, String message) {
        viewModel = ViewModel.problem(ProblemJson.of(422, "Business rule violated", message, rule));
    }

    @Override
    public void presentConflict(String caseId) {
        viewModel = ViewModel.problem(ProblemJson.of(409, "Concurrent update",
                "Case " + caseId + " was changed by someone else; reload and retry", "CONCURRENT_UPDATE"));
    }

    /** Offering an action is a presentation decision; the entities still enforce every rule when it is used. */
    static List<String> allowedActions(String status) {
        return switch (status) {
            case "CREATED" -> List.of("screen");
            case "PENDING_REVIEW" -> List.of("screen", "resolve");
            case "REVIEWED" -> List.of("screen", "resolve", "close");
            default -> List.of();
        };
    }
}`, 'screening-interface-adapters/…/web/CasePresenter.java')}
${code('java', String.raw`
/**
 * Everything the web framework needs to write a response, already decided: status, media type, location and body.
 * The framework-side endpoint copies it into an HTTP response without making a single decision of its own
 * (humble object), so all response logic is testable here without starting a server.
 */
public record ViewModel(int status, String contentType, String location, Object body) {

    public static ViewModel ok(Object body)                       { return new ViewModel(200, JSON, null, body); }
    public static ViewModel created(String location, Object body) { return new ViewModel(201, JSON, location, body); }
    public static ViewModel problem(ProblemJson problem)          { return new ViewModel(problem.status(), PROBLEM_JSON, null, problem); }
}`, 'screening-interface-adapters/…/web/ViewModel.java')}
<p>The same interactor call can be presented in completely different ways. That is the output boundary paying for itself:</p>
<div data-sim="presenter-lab"></div>

<h3>Gateways: two translations instead of one</h3>
<p>In the hexagonal lab, the persistence adapter maps the aggregate straight to annotated Micronaut Data rows. Here the job is split, so the mapping logic is framework-free:</p>
<ol>
<li><b>Ring 3:</b> <code>SqlCaseGateway</code> implements <code>CaseGateway</code>. It decides how a case becomes one case record plus one record per match, when to insert vs update, and translates <code>StaleRecordException</code> into the use cases' <code>ConcurrentCaseUpdateException</code>. It talks to a <code>CaseRecords</code> interface that ring 3 owns.</li>
<li><b>Ring 4:</b> <code>MicronautCaseRecords</code> implements <code>CaseRecords</code> by copying plain records to <code>@MappedEntity</code> rows. It makes no decisions.</li>
</ol>
${code('java', String.raw`
public final class SqlCaseGateway implements CaseGateway {

    private final CaseRecords records;

    @Override
    public Optional<ScreeningCase> findById(CaseId id) {
        return records.findCase(id.value())
                .map(row -> CaseRecordMapper.toSnapshot(row, records.findMatches(row.id())))
                .map(ScreeningCase::rehydrate);
    }

    @Override
    public void save(ScreeningCase screeningCase) {
        CaseSnapshot snapshot = screeningCase.snapshot();
        CaseRecord record = CaseRecordMapper.toRecord(snapshot);
        boolean exists = records.findCase(record.id()).isPresent();
        if (exists) {
            try {
                records.updateCase(record);
            } catch (StaleRecordException e) {
                throw new ConcurrentCaseUpdateException(snapshot.id(), e);
            }
        } else {
            records.insertCase(record);
        }
        // ... insert new matches, update existing ones (matches are never deleted)
    }
}`, 'screening-interface-adapters/…/persistence/SqlCaseGateway.java')}
${code('java', String.raw`
/**
 * The database as the gateway needs it: rows in, rows out. Owned by this ring and implemented by the framework
 * ring (Micronaut Data JDBC), so the mapping between aggregate and tables is tested here without a database.
 */
public interface CaseRecords {

    Optional<CaseRecord> findCase(UUID id);

    /** Highest score first. */
    List<MatchRecord> findMatches(UUID caseId);

    void insertCase(CaseRecord record);

    /**
     * Writes the row only if the stored version still equals record.version(), then increments it.
     *
     * @throws StaleRecordException if the stored version is different
     */
    void updateCase(CaseRecord record);

    void insertMatch(MatchRecord record);

    void updateMatch(MatchRecord record);
}`, 'screening-interface-adapters/…/persistence/CaseRecords.java')}
<div class="callout expert"><strong>Is the extra interface worth it?</strong><p>It buys a <code>SqlCaseGatewayTest</code> that runs in milliseconds against <code>InMemoryCaseRecords</code> (which enforces versions like the database) and proves the round trip, rescreening and conflict translation. The cost is one interface and two copy methods in ring 4. For a single small table, mapping straight in ring 4 is a reasonable partial boundary.</p></div>

<h3>Events: the published language lives in ring 3</h3>
${code('java', String.raw`
/** Writes each domain event as an outbox row in the published language, inside the use case's transaction. */
public final class OutboxEventGateway implements EventOutboxGateway {

    @Override
    public void append(List<DomainEvent> events) {
        for (DomainEvent event : events) {
            records.insert(new OutboxRecord(event.eventId(), event.caseId().value(), event.clientGroup().value(),
                    event.type(), EventJson.of(event), event.occurredAt(), null));
        }
    }
}`, 'screening-interface-adapters/…/events/OutboxEventGateway.java')}
<p><code>EventJson</code> builds JSON by hand, field by field, with <code>schemaVersion: 1</code>. Renaming a field in a domain event cannot silently change the contract other contexts consume – the compiler forces a decision in <code>EventJson</code>.</p>

<h3>What may cross a boundary?</h3>
<div data-sim="boundary-crossing"></div>

<div data-quiz="m07"></div>
`,
  });

  Course.quiz('m07', [
    { q: 'A request has <code>"country": "Romania"</code>. Who rejects it, and how?', options: ['ScreeningCase, 422', 'Forms (shape: must be two letters), 400 MALFORMED_REQUEST, before any use case runs', 'The database, 500', 'CountryCode, 409'], answer: 1, why: 'It fails a shape check. CountryCode (ring 1) would also reject it, but the controller catches shape errors first and no use case runs.' },
    { q: 'Where is the decision "a REVIEWED case offers screen, resolve and close" made?', options: ['ScreeningCase', 'CloseCaseInteractor', 'CasePresenter.allowedActions', 'CaseEndpoint'], answer: 2, why: 'Offering an action is presentation. The entities still enforce the rule when the action is used.' },
    { q: 'Why must the controller create a new CasePresenter for every request?', options: ['Garbage collection', 'Presenters hold the view model as state; sharing one across concurrent requests leaks responses between requests and tenants', 'Micronaut requires it', 'It does not matter'], answer: 1, why: 'A presenter is stateful by design. Module 11 shows the tenant leak a singleton presenter causes.' },
    { q: 'Who turns <code>StaleRecordException</code> into <code>ConcurrentCaseUpdateException</code>?', options: ['MicronautCaseRecords (ring 4)', 'SqlCaseGateway (ring 3)', 'ScreeningCase (ring 1)', 'CasePresenter'], answer: 1, why: 'Ring 4 turns OptimisticLockException into ring 3\'s StaleRecordException; ring 3 translates it into the use cases\' contract.' },
    { q: 'Why is EventJson written by hand rather than serialising the event records automatically?', options: ['Performance', 'It is the published language: renaming a field in a domain event must not silently break consumers', 'Records cannot be serialised', 'Micronaut Serde is not allowed anywhere'], answer: 1, why: 'Contracts with other contexts are changed deliberately, with a schemaVersion.' },
  ]);
})();
