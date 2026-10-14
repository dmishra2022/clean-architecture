(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'entities', num: 5, level: 'Foundation', minutes: 80,
    title: 'Ring 1 – Entities: a rich domain model with DDD',
    lead: 'The innermost ring holds the enterprise business rules: rules that would exist even if the bank did its screening on paper. DDD\'s tactical patterns give those rules their shape.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Decide whether a rule is an enterprise rule (ring 1) or an application rule (ring 2).</li>
<li>Model value objects, entities and an aggregate root that protects its invariants.</li>
<li>Explain why ring 1 knows no use case, no persistence format and no framework – and how it is persisted anyway.</li>
<li>Read the matching policy and predict a score.</li>
</ul></div>

<h3>What belongs in ring 1</h3>
<blockquote>"Entities encapsulate enterprise-wide Critical Business Rules … they are the least likely to change when something external changes." – Clean Architecture, ch. 22</blockquote>
<p>Uncle Bob's test for a <b>critical business rule</b>: it would make or save the business money even if it were not automated. A compliance officer with paper files would still refuse to close a case with an undecided match, and would still insist that a confirmed hit is downgraded only by a second person. Those rules live in <code>screening-entities</code>, with <b>zero dependencies</b> – not even on the use cases ring.</p>
${fig('07-case-aggregate', 'The ScreeningCase aggregate. The root guards its matches and value objects; other aggregates and contexts are referenced by id only.')}

<h3>Value objects: make illegal states unrepresentable</h3>
<p>A value object is defined by its value, immutable, and validates itself on construction. Once you hold a <code>PartyName</code>, you know it is 2–200 characters and contains a letter. No other ring has to check again.</p>
${code('java', String.raw`
/**
 * Name as submitted, plus the normalised form used for matching.
 * Equality is on the submitted value: two spellings are two different names.
 */
public record PartyName(String value) {

    public PartyName {
        if (value == null) {
            throw DomainException.invalid("Name is required");
        }
        value = value.strip().replaceAll("\\s+", " ");
        if (value.length() < 2 || value.length() > 200) {
            throw DomainException.invalid("Name must be 2-200 characters");
        }
        if (value.codePoints().noneMatch(Character::isLetter)) {
            throw DomainException.invalid("Name must contain at least one letter");
        }
    }

    /** Upper case, accents removed, punctuation replaced by spaces, whitespace collapsed. */
    public static String normalise(String raw) { /* ... */ }
}`, 'screening-entities/…/model/PartyName.java')}
<p>Every violation is a <code>DomainException</code> with a stable <b>rule code</b>. Invalid values use <code>INVALID_VALUE</code>; broken invariants use their own codes (<code>FOUR_EYES</code>, <code>CASE_CLOSED</code>, …). The use cases ring later turns the code into an output-boundary call, so no outer ring ever sees this exception type.</p>
${code('java', String.raw`
public class DomainException extends RuntimeException {

    public static final String INVALID_VALUE = "INVALID_VALUE";

    private final String rule;

    public static DomainException invalid(String message) {
        return new DomainException(INVALID_VALUE, message);
    }

    public boolean isInvalidValue() {
        return INVALID_VALUE.equals(rule);
    }
}`, 'screening-entities/…/DomainException.java')}
<div data-sim="entity-vo"></div>

<h3>The aggregate root: invariants first</h3>
<p>Design an aggregate by writing its invariants as sentences a domain expert signs off. <code>ScreeningCase</code> documents seven, and every public method is a business operation that checks them, changes state, recalculates derived state and raises an event:</p>
${code('java', String.raw`
/**
 * <h2>Invariants</h2>
 * <ol>
 *   <li>A closed case cannot be screened, resolved or closed again.</li>
 *   <li>At most one match per reference profile; rescreening keeps earlier resolutions.</li>
 *   <li>Matches are never removed, even if a profile stops matching (audit trail).</li>
 *   <li>A resolution must be final-or-possible (never back to UNRESOLVED) and carry a rationale.</li>
 *   <li>Four-eyes: the analyst who confirmed a POSITIVE cannot downgrade it; a second analyst must.</li>
 *   <li>A case can only close after at least one screening, with no UNRESOLVED or POSSIBLE matches.</li>
 *   <li>Status is derived from the matches, never set from outside.</li>
 * </ol>
 */
public final class ScreeningCase {

    public void close(AnalystId analyst, Instant now) {
        requireOpen("close");
        Objects.requireNonNull(analyst, "analyst");
        if (screeningCount == 0) {
            throw new DomainException(NOT_SCREENED, "Case " + id + " has never been screened");
        }
        long awaiting = matches.values().stream().filter(m -> m.resolution().blocksClosure()).count();
        if (awaiting > 0) {
            throw new DomainException(MATCHES_AWAITING_REVIEW,
                    awaiting + " match(es) are unresolved or possible on case " + id);
        }
        outcome = matches.values().stream().anyMatch(m -> m.resolution() == Resolution.POSITIVE)
                ? CaseOutcome.RISK_CONFIRMED
                : CaseOutcome.CLEAR;
        status = CaseStatus.CLOSED;
        closedAt = now;
        closedBy = analyst;
        raise(new CaseClosed(UUID.randomUUID(), id, clientGroup, now, outcome, analyst));
    }
}`, 'screening-entities/…/model/ScreeningCase.java')}
<p>Now try to corrupt a case both ways – with an anemic model where a service sets fields, and with this rich aggregate:</p>
<div data-sim="aggregate-rules"></div>

<h3>The four aggregate design rules</h3>
<ol>
<li><b>Model true invariants in consistency boundaries.</b> Only rules that must hold <i>immediately</i> belong inside.</li>
<li><b>Design small aggregates.</b> The case holds its matches (tens), not every case of a client (millions).</li>
<li><b>Reference other aggregates by identity.</b> <code>ClientGroupId</code>, <code>ProfileId</code> – never object graphs.</li>
<li><b>Use eventual consistency outside the boundary.</b> Others react to events in their own transactions (module 14).</li>
</ol>

<h3>A domain service: the matching policy</h3>
<p>Scoring a party against a profile belongs to neither object, so it is a <b>domain service</b> – still ring 1, still plain Java. The threshold is a constructor argument: the entities do not read configuration; the Main component passes the number in.</p>
${code('java', String.raw`
public final class NameMatchingPolicy {

    public static final int DEFAULT_THRESHOLD = 80;

    static final int SAME_DOB = 8;
    static final int DIFFERENT_BIRTH_YEAR = -30;
    static final int SAME_COUNTRY = 4;
    static final int DIFFERENT_COUNTRY = -8;

    public NameMatchingPolicy(int threshold) { /* 1..100 */ }

    public Optional<MatchEvaluation> evaluate(Party party, ReferenceProfile profile) { /* ... */ }
}

// ScreeningCase.screen: the policy decides what is a match; the case decides what to keep
public void screen(Collection<ReferenceProfile> candidates, NameMatchingPolicy policy, Instant now)`, 'screening-entities/…/policy/NameMatchingPolicy.java')}
<div data-sim="score-lab"></div>

<h3>Domain events: sealed and in the past tense</h3>
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
}`, 'screening-entities/…/event/DomainEvent.java')}
<p>The aggregate collects events in <code>pendingEvents</code>; an interactor calls <code>pullEvents()</code> once per transaction and hands them to the <code>EventOutboxGateway</code>. Ring 1 does not know an outbox exists.</p>

<h3>Persisted without knowing it: snapshot and rehydrate</h3>
<p>The aggregate must not know tables, rows or annotations. It exposes an immutable <code>CaseSnapshot</code> (a memento) and a <code>rehydrate</code> factory. Ring 3's <code>SqlCaseGateway</code> maps snapshots to records; ring 4 maps records to Micronaut Data rows. Two translations, each testable on its own.</p>
${code('java', String.raw`
public static ScreeningCase open(CaseId id, ClientGroupId clientGroup, Party party, Instant now)   // raises CaseOpened
public static ScreeningCase rehydrate(CaseSnapshot s)                                              // raises nothing
public CaseSnapshot snapshot()

/** Concurrency token from the store; the aggregate carries it but never interprets it. */
public long version()`, 'screening-entities/…/model/ScreeningCase.java')}
<div class="callout pitfall"><strong>Enterprise vs application rules – the most common mistake</strong><p>"HIGH priority if an unresolved match scores ≥ 95" feels like a business rule, so teams put it on the aggregate. But it is how <i>this application's</i> work queue triages; a regulator report over the same cases would order them differently. It is an <b>application</b> rule and lives in <code>ListWorkQueueInteractor</code> (ring 2). Ask: would a paper-based compliance team need this rule? If not, it is not ring 1.</p></div>

<div data-quiz="m05"></div>
`,
  });

  Course.quiz('m05', [
    { q: 'Which rule belongs in the <b>entities</b> ring?', options: ['Retrying with the same Idempotency-Key returns the same case', 'A confirmed POSITIVE can only be downgraded by a different analyst', 'Work queue: HIGH if score ≥ 95', 'Rule violations return 422'], answer: 1, why: 'Four-eyes would exist without software. Idempotency and triage are application rules; 422 is presentation.' },
    { q: 'How does <code>NameMatchingPolicy</code> get its threshold of 80?', options: ['It reads application.yml', 'It injects MatchingProperties', 'The Main component passes it as a constructor argument', 'It is hard-coded and can never change'], answer: 2, why: 'Ring 1 cannot see configuration. MainWiring reads @ConfigurationProperties and calls new NameMatchingPolicy(threshold).' },
    { q: 'Why does <code>rehydrate</code> raise no events while <code>open</code> raises CaseOpened?', options: ['A bug', 'Loading stored state is not a business fact; opening a case is', 'Events are raised by the database', 'For performance'], answer: 1, why: 'Events record facts. Restoring from storage is not something that happened in the business.' },
    { q: 'What is the role of <code>DomainException.rule()</code>?', options: ['A stable code that ring 2 hands to presenters, so outer rings never depend on the exception type', 'An HTTP status code', 'A log level', 'A database error code'], answer: 0, why: 'Outcomes.presentingFailures reads the rule and calls presentInvalidRequest or presentRuleViolation.' },
    { q: 'The entities module depends on…', options: ['screening-usecases', 'Micronaut core', 'Nothing but the JDK', 'Jackson for JSON'], answer: 2, why: 'Ring 1 has no dependencies. That is what lets it sit stably at the centre.' },
  ]);
})();
