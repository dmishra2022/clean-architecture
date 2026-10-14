(function () {
  const { code } = Course;
  Course.module({
    id: 'events-services-repositories', num: 6, level: 'Foundation', minutes: 70,
    title: 'Domain events, domain services, repositories and application services',
    lead: 'The remaining tactical patterns – what each is for, where it lives, and how they cooperate in one use case.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Model domain events as sealed Java records and collect them on the aggregate.</li>
<li>Recognise when behaviour belongs in a domain service, and implement one.</li>
<li>Design repositories per aggregate root, as ports.</li>
<li>Separate application services (orchestration) from domain logic.</li>
</ul></div>

<h3>Domain events</h3>
<p>A domain event records something that happened that domain experts care about. In code it is an immutable record named in the past tense.</p>
${code('java', String.raw`
/** Something that happened to a case, named in the past tense, in the language of the business. */
public sealed interface DomainEvent permits CaseOpened, CaseScreened, MatchResolved, CaseClosed {
    UUID eventId();
    CaseId caseId();
    ClientGroupId clientGroup();
    Instant occurredAt();

    default String type() {
        return getClass().getSimpleName();
    }
}

public record CaseScreened(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                           int newMatches, int totalMatches, int screeningCount) implements DomainEvent { }`, 'domain/event')}
<p><b>Why sealed?</b> The compiler knows every event type. A <code>switch</code> over events without a default is checked for exhaustiveness: add a new event and every mapper that forgot it fails to compile.</p>
${code('java', String.raw`
switch (event) {
    case CaseOpened e -> payload.put("entityType", e.entityType().name());
    case CaseScreened e -> { payload.put("newMatches", e.newMatches()); /* ... */ }
    case MatchResolved e -> { payload.put("resolution", e.resolution().name()); /* ... */ }
    case CaseClosed e -> payload.put("outcome", e.outcome().name());
}`, 'adapter/out/events/EventPayloads.java')}
<h4>Raise inside, publish outside</h4>
<p>The aggregate collects events in a private list. It never publishes them – it cannot know about brokers. The application service pulls them after the state change and hands them to an outbox port, in the same transaction:</p>
${code('java', String.raw`
private void raise(DomainEvent event) { pendingEvents.add(event); }

/** Returns and clears events raised since the aggregate was loaded. Called once per transaction. */
public List<DomainEvent> pullEvents() {
    List<DomainEvent> events = List.copyOf(pendingEvents);
    pendingEvents.clear();
    return events;
}`, 'domain/model/ScreeningCase.java')}
<div class="callout expert"><strong>Domain event vs integration event</strong><p>Domain events are internal Java types; they can change with refactoring. <b>Integration events</b> are the published language other contexts depend on – versioned, explicit, stable. The code lab maps one to the other in <code>EventPayloads</code> with a <code>schemaVersion</code> field, so refactoring a record never breaks a consumer.</p></div>

<h3>Domain services</h3>
<p>Some domain logic does not naturally belong to one entity or value object. Scoring a party against a reference profile is neither the party's job nor the profile's. That is a <b>domain service</b>: stateless, named in the ubiquitous language, part of the domain ring, free of infrastructure.</p>
${code('java', String.raw`
/**
 * Score = best name similarity across the profile's names (0-100), then adjusted by secondary identifiers:
 * same date of birth +8, different birth year -30, same country +4, different country -8. Different entity
 * types never match. A match is reported when the final score reaches the threshold.
 */
public final class NameMatchingPolicy {

    public Optional<MatchEvaluation> evaluate(Party party, ReferenceProfile profile) {
        if (party.type() != profile.type()) {
            return Optional.empty();
        }
        List<String> partyTokens = meaningfulTokens(party.name().value(), party.type());
        record Candidate(String name, int similarity) { }
        Candidate best = profile.allNames()
                .map(n -> new Candidate(n, nameSimilarity(partyTokens, meaningfulTokens(n, profile.type()))))
                .max(Comparator.comparingInt(Candidate::similarity))
                .orElseThrow();

        int adjustment = dateOfBirthAdjustment(party.dateOfBirth(), profile.dateOfBirth())
                + countryAdjustment(party.country(), profile.country());
        MatchScore score = MatchScore.clamped(best.similarity() + adjustment);
        if (!score.isAtLeast(threshold)) {
            return Optional.empty();
        }
        return Optional.of(new MatchEvaluation(profile, best.name(), best.similarity(), adjustment, score));
    }

    /** Best of: plain ratio, token-sort ratio (word order ignored), token-set ratio (extra words ignored). */
    static int nameSimilarity(List<String> a, List<String> b) { ... }

    /** 2 * LCS / (|a| + |b|): 1.0 for equal strings, 0.0 for nothing in common. */
    static double ratio(String a, String b) { ... }
}`, 'domain/service/NameMatchingPolicy.java')}
<p>Notice the split of responsibility: the <b>policy decides what is a match</b>; the <b>aggregate decides what to keep</b> (one per profile, preserve resolutions). <code>ScreeningCase.screen(candidates, policy, now)</code> receives the policy as a parameter – double dispatch – so the aggregate stays free of matching details.</p>

<div data-sim="score-lab"></div>
<div class="callout wc"><strong>Try these in the lab</strong><ul>
<li>"Reyes Quintanar Marisol" → token-sort makes word order irrelevant.</li>
<li>"Viktor Albescu" with DOB 1988-07-01, MD → the sanctions profile drops below threshold (−30, −8) while the adverse-media namesake rises.</li>
<li>"Orion Shipping Holdings Limited", ORGANISATION → "LIMITED" and "LTD" are noise tokens.</li>
<li>Switch "Golden Crescent Trading" to INDIVIDUAL → entity types differ, no score at all.</li>
</ul></div>

<h3>Repositories: one per aggregate root, defined as a port</h3>
<p>A repository gives the illusion of an in-memory collection of aggregates. It is an <b>interface owned by the application</b> (a driven port), shaped by what the use cases need – not a generic CRUD API.</p>
${code('java', String.raw`
/**
 * Driven port: a collection-like store of whole aggregates. One repository per aggregate root,
 * no repositories for inner entities such as matches.
 */
public interface CaseRepository {

    Optional<ScreeningCase> findById(CaseId id);

    /**
     * Inserts or updates the whole aggregate.
     *
     * @throws ConcurrentCaseUpdateException if someone else saved the case since it was loaded
     */
    void save(ScreeningCase screeningCase);
}`, 'application/port/out/CaseRepository.java')}
<ul>
<li><b>Per aggregate root</b>, never per table or per child entity. There is no <code>MatchRepository</code>.</li>
<li>Loads and saves <b>whole aggregates</b>. Partial loading breaks invariants.</li>
<li>Takes and returns domain types; rows and SQL stay in the adapter.</li>
<li>Queries for screens and reports do not belong here – use read models (module 13).</li>
</ul>

<h3>Factories</h3>
<p>Creation that carries rules gets a named factory. In the lab, static methods on the aggregate are enough: <code>ScreeningCase.open(...)</code> (new fact, raises event) and <code>ScreeningCase.rehydrate(snapshot)</code> (restore). Use a separate factory class only when creation needs collaborators the aggregate should not know.</p>

<h3>Application services: orchestration, no rules</h3>
<p>The application service implements the use-case ports. Its job is choreography: load, check tenant, call <b>one</b> domain method, save, hand events to the outbox, return a view – inside a transaction boundary it decides.</p>
${code('java', String.raw`
@Override
public CaseView resolve(ResolveMatchCommand command) {
    return unitOfWork.write(() -> {
        ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
        screeningCase.resolveMatch(command.matchId(), command.resolution(), command.rationale(), command.analyst(),
                clock.instant());
        return commit(screeningCase);
    });
}

private ScreeningCase load(ClientGroupId clientGroup, CaseId caseId) {
    return cases.findById(caseId)
            .filter(c -> c.belongsTo(clientGroup))                       // tenant isolation
            .orElseThrow(() -> new CaseNotFoundException(caseId));
}

private CaseView commit(ScreeningCase screeningCase) {
    cases.save(screeningCase);
    outbox.append(screeningCase.pullEvents());                           // same transaction as the save
    return CaseView.of(screeningCase);
}`, 'application/CaseApplicationService.java')}
<table>
<tr><th></th><th>Domain service</th><th>Application service</th></tr>
<tr><td>Contains</td><td>Business logic that fits no single object</td><td>Use-case orchestration, transactions, security/tenant checks</td></tr>
<tr><td>Knows about</td><td>Domain types only</td><td>Ports (repositories, outbox, unit of work), domain types</td></tr>
<tr><td>Test with</td><td>Plain unit tests</td><td>Fakes for every port</td></tr>
<tr><td>Smell</td><td>Calls a repository</td><td>Contains an <code>if</code> about business state</td></tr>
</table>
<div class="callout pitfall"><strong>The test for leaked rules</strong><p>Read the application service and look for <code>if</code> statements about business state (<code>if (case.status() == CLOSED)</code>). Each one is a rule that escaped the aggregate. The only conditions allowed are about orchestration – idempotency, tenant visibility, optional data.</p></div>

<div data-quiz="m06"></div>
`,
  });

  Course.quiz('m06', [
    { q: 'Why is <code>DomainEvent</code> a <b>sealed</b> interface?', options: ['Sealed interfaces are faster', 'So switches over events are checked for exhaustiveness: a new event breaks every mapper that forgot it', 'Micronaut requires it', 'To prevent serialisation'], answer: 1, why: 'Exhaustive pattern matching turns a forgotten event mapping into a compile error.' },
    { q: 'Who publishes domain events to the outside world?', options: ['The aggregate, directly to Kafka', 'The repository', 'The aggregate collects them; the application service appends them to an outbox in the same transaction; a relay publishes', 'The controller'], answer: 2, why: 'The aggregate must stay infrastructure-free; the outbox gives atomicity with the state change.' },
    { q: 'Scoring a party against a profile belongs in…', options: ['Party', 'ReferenceProfile', 'A domain service (NameMatchingPolicy)', 'The application service'], answer: 2, why: 'Behaviour involving two concepts, owned by neither, is a domain service.' },
    { q: 'Which repository design is correct?', options: ['CaseRepository and MatchRepository', 'GenericRepository&lt;T, ID&gt; with 30 methods', 'CaseRepository with findById and save, owned by the application as a port', 'Repositories per database table'], answer: 2, why: 'One repository per aggregate root, shaped by use cases, defined as a port.' },
    { q: 'An application service contains <code>if (screeningCase.matches().isEmpty()) status = REVIEWED</code>. This is…', options: ['Fine – orchestration', 'A leaked business rule that belongs in the aggregate', 'Required for performance', 'A domain service'], answer: 1, why: 'Status derivation is invariant 7; it lives in recalculateStatus() inside the aggregate.' },
  ]);
})();
