(function () {
  const { code } = Course;
  Course.module({
    id: 'entities-value-objects', num: 4, level: 'Foundation', minutes: 50,
    title: 'Entities and value objects in modern Java',
    lead: 'The two building blocks of every model – and how Java 21 records make value objects cheap enough to use everywhere.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Decide whether a concept is an entity or a value object, and defend the choice.</li>
<li>Write self-validating, immutable value objects with Java records.</li>
<li>Eliminate primitive obsession with typed identifiers.</li>
<li>Explain why entity equality is by identity and value equality is by content.</li>
</ul></div>

<h3>The distinction</h3>
<table>
<tr><th></th><th>Entity</th><th>Value object</th></tr>
<tr><td>Defined by</td><td>Identity that persists through change</td><td>Its attribute values only</td></tr>
<tr><td>Equality</td><td>Same id → same thing, even if attributes differ</td><td>Same values → interchangeable</td></tr>
<tr><td>Mutability</td><td>Changes state over its lifecycle (through methods)</td><td>Immutable; "change" = replace with a new value</td></tr>
<tr><td>Validation</td><td>Guards its state transitions</td><td>Validates itself in the constructor: if it exists, it is valid</td></tr>
<tr><td>Code lab</td><td><code>ScreeningCase</code>, <code>Match</code></td><td><code>PartyName</code>, <code>Party</code>, <code>MatchScore</code>, <code>CountryCode</code>, <code>ClientGroupId</code>, <code>ResolutionRationale</code></td></tr>
</table>
<p>Context decides. A party is a value object in Screening (a snapshot of submitted data). In a Customer Onboarding context the same person is an entity with a lifecycle. There is no universal answer – only an answer per bounded context.</p>

<h3>Value objects with records</h3>
<p>A Java record gives you immutability, value equality, <code>hashCode</code> and <code>toString</code>. The <b>compact constructor</b> is where the value validates itself:</p>
${code('java', String.raw`
/** Tenant boundary: every case belongs to exactly one client group. */
public record ClientGroupId(String value) {

    private static final Pattern FORMAT = Pattern.compile("[a-z0-9][a-z0-9-]{1,63}");

    public ClientGroupId {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw DomainException.invalid("Client group id must be 2-64 lowercase letters, digits or '-': " + value);
        }
    }

    @Override
    public String toString() {
        return value;
    }
}`, 'domain/model/ClientGroupId.java')}
<p>A value object can also <b>normalise</b> and carry behaviour that belongs to the value:</p>
${code('java', String.raw`
public record PartyName(String value) {

    public PartyName {
        if (value == null) {
            throw DomainException.invalid("Name is required");
        }
        value = value.strip().replaceAll("\\s+", " ");          // canonical form
        if (value.length() < 2 || value.length() > 200) {
            throw DomainException.invalid("Name must be 2-200 characters");
        }
        if (value.codePoints().noneMatch(Character::isLetter)) {
            throw DomainException.invalid("Name must contain at least one letter");
        }
    }

    /** Upper case, accents removed, punctuation replaced by spaces, whitespace collapsed. */
    public static String normalise(String raw) {
        String decomposed = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return decomposed.toUpperCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .strip();
    }
}`, 'domain/model/PartyName.java')}
<p>Composite value objects enforce rules <i>between</i> fields:</p>
${code('java', String.raw`
public record Party(PartyName name, EntityType type, LocalDate dateOfBirth, CountryCode country) {

    public Party {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(type, "entity type");
        if (type == EntityType.ORGANISATION && dateOfBirth != null) {
            throw DomainException.invalid("An organisation has no date of birth");
        }
        if (dateOfBirth != null && dateOfBirth.isAfter(LocalDate.now())) {
            throw DomainException.invalid("Date of birth cannot be in the future");
        }
    }
}`, 'domain/model/Party.java')}
<div class="callout rule"><strong>The guarantee</strong><p>Because invalid values cannot be constructed, every method that receives a <code>Party</code> can trust it. You never write <code>if (party.name() == null)</code> again. Validation happens once, at the edge where data enters the model.</p></div>

<h3>Primitive obsession and typed identifiers</h3>
<p>Compare these two signatures:</p>
${code('java', String.raw`
// Which String is which? The compiler cannot help.
CaseView resolve(String clientGroup, String caseId, String matchId, String resolution, String rationale, String analyst);

// Every argument has a type; swapping two is a compile error.
CaseView resolve(ResolveMatchCommand command);
record ResolveMatchCommand(ClientGroupId clientGroup, CaseId caseId, MatchId matchId,
                           Resolution resolution, ResolutionRationale rationale, AnalystId analyst) { }`)}
<p>Typed ids cost one line each with records and remove a whole class of bugs – including the tenant mix-up where a <code>caseId</code> is passed where a <code>clientGroupId</code> was expected.</p>

<h3>Entities: identity and controlled change</h3>
<p><code>Match</code> is an entity: it has a <code>MatchId</code>, and its resolution changes over time. Note what it does <b>not</b> have: public setters.</p>
${code('java', String.raw`
public final class Match {

    private final MatchId id;
    private final ProfileId profileId;
    private MatchScore score;
    private Resolution resolution;
    // ...

    static Match detected(ProfileId profileId, RiskCategory category, String matchedName, MatchScore score) {
        return new Match(MatchId.newId(), profileId, category, matchedName, score, Resolution.UNRESOLVED,
                null, null, null);
    }

    void resolve(Resolution newResolution, ResolutionRationale why, AnalystId analyst, Instant at) { ... }  // package-private
    void rescore(MatchScore newScore) { ... }                                                             // package-private

    @Override
    public boolean equals(Object o) {
        return o instanceof Match other && id.equals(other.id);   // identity, not attributes
    }
}`, 'domain/model/Match.java')}
<p>Mutators are package-private so only the aggregate root <code>ScreeningCase</code> (same package) can call them. Module 5 explains why that matters.</p>

<div data-sim="entity-vo"></div>

<h3>Rules of thumb</h3>
<ul>
<li>Default to value objects. Promote to an entity only when you must track one specific thing through change.</li>
<li>Value objects should be small and focused. A 20-field record is a DTO wearing a disguise.</li>
<li>Put behaviour on value objects: <code>MatchScore.isAtLeast(threshold)</code>, <code>Resolution.blocksClosure()</code>, <code>PartyName.tokens()</code>.</li>
<li>Throw one domain exception type with a rule code (<code>INVALID_VALUE</code>), so adapters can map it uniformly to HTTP 400.</li>
<li>Do not put framework annotations on value objects. They belong to adapters' DTOs and rows.</li>
</ul>
<div class="callout pitfall"><strong>Pitfall: Lombok @Data on domain classes</strong><p>It generates public setters and attribute-based equality. Both are wrong for entities, and setters are wrong for value objects. Records already give you what value objects need.</p></div>

<div data-quiz="m04"></div>
`,
  });

  Course.quiz('m04', [
    { q: 'Two <code>PartyName</code> objects both hold "Viktor Albescu". They are…', options: ['Different, because they are two objects', 'Equal and interchangeable – value objects compare by value', 'Equal only if they came from the same request', 'Not comparable'], answer: 1, why: 'Records give value equality. That is exactly the semantics a value object needs.' },
    { q: 'Where should a value object validate itself?', options: ['In the controller', 'In a separate validator class', 'In its constructor (compact constructor for records)', 'In the database constraints'], answer: 2, why: 'Constructor validation means an invalid instance can never exist.' },
    { q: 'Why does <code>Match</code> have package-private mutators?', options: ['For performance', 'So only the aggregate root in the same package can change it, keeping case-level rules enforceable', 'Because records cannot have public methods', 'To support serialisation'], answer: 1, why: 'If anyone could change a match, the case could not enforce four-eyes, rationale or closure rules.' },
    { q: 'What is "primitive obsession"?', options: ['Using int instead of long', 'Representing domain concepts as raw String/int, losing validation and type safety', 'Using too many value objects', 'Preferring arrays to lists'], answer: 1, why: 'Typed ids and value objects make wrong argument order a compile error and validate once.' },
    { q: 'In the Screening context, <code>Party</code> is a value object. In Customer Onboarding the same person would most likely be…', options: ['Also a value object, always', 'An entity with its own lifecycle', 'A domain service', 'Not modelled'], answer: 1, why: 'Entity vs value object is decided per bounded context.' },
  ]);
})();
