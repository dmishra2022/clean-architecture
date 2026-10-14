(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'aggregates', num: 5, level: 'Foundation', minutes: 75,
    title: 'Aggregates: consistency boundaries and invariants',
    lead: 'The most important – and most often misunderstood – tactical pattern. Get this right and the rest of the model follows.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Define an aggregate precisely and identify its root and invariants.</li>
<li>Apply the four aggregate design rules and size an aggregate.</li>
<li>Implement an aggregate in Java with derived state, a memento snapshot and pending events.</li>
<li>Explain optimistic concurrency and why every aggregate needs a version.</li>
</ul></div>

<h3>Definition</h3>
<p>An <b>aggregate</b> is a cluster of entities and value objects treated as <b>one unit for data changes</b>. It has one <b>root</b> entity – the only object outsiders may hold a reference to. Every change goes through the root, which enforces the <b>invariants</b>: rules that must be true after every transaction.</p>
${fig('05-case-aggregate', 'The ScreeningCase aggregate: the root guards matches and value objects; other aggregates and contexts are referenced by id only.')}

<h3>Invariants first</h3>
<p>Design an aggregate by writing its invariants, as sentences a domain expert signs off. The code lab's <code>ScreeningCase</code> documents seven:</p>
${code('java', String.raw`
/**
 * Aggregate root for one screening unit of work. Everything that must be consistent in a single
 * transaction lives here; everything else is referenced by id.
 *
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
public final class ScreeningCase {`, 'domain/model/ScreeningCase.java')}
<p>Every invariant has at least one test in <code>ScreeningCaseTest</code>. If you cannot test it without a database, it is not inside the aggregate yet.</p>

<h3>Behaviour, not setters</h3>
<p>Public methods are named after business operations from the Event Storming board. Each one checks rules, changes state, recalculates derived state and raises an event:</p>
${code('java', String.raw`
public void resolveMatch(MatchId matchId, Resolution resolution, ResolutionRationale rationale,
                         AnalystId analyst, Instant now) {
    requireOpen("resolve a match on");                                          // invariant 1
    if (resolution == null || resolution == Resolution.UNRESOLVED) {
        throw new DomainException(RESOLUTION_REQUIRED, "A resolution must be POSITIVE, POSSIBLE or FALSE_POSITIVE");
    }
    if (rationale == null) {                                                    // invariant 4
        throw new DomainException(RESOLUTION_REQUIRED, "A rationale is required for every resolution");
    }
    Match match = findMatch(matchId)
            .orElseThrow(() -> new DomainException(MATCH_NOT_FOUND, "No match " + matchId + " on case " + id));

    Resolution previous = match.resolution();
    boolean downgradingPositive = previous == Resolution.POSITIVE && resolution != Resolution.POSITIVE;
    if (downgradingPositive && match.resolvedBy().filter(analyst::equals).isPresent()) {   // invariant 5
        throw new DomainException(FOUR_EYES,
                "A confirmed positive can only be downgraded by a different analyst than " + analyst);
    }

    match.resolve(resolution, rationale, analyst, now);
    recalculateStatus();                                                        // invariant 7
    raise(new MatchResolved(UUID.randomUUID(), id, clientGroup, now, match.id(), match.profileId(), previous,
            resolution, analyst));
}

public void close(AnalystId analyst, Instant now) {
    requireOpen("close");
    if (screeningCount == 0) {
        throw new DomainException(NOT_SCREENED, "Case " + id + " has never been screened");
    }
    long awaiting = matches.values().stream().filter(m -> m.resolution().blocksClosure()).count();
    if (awaiting > 0) {                                                         // invariant 6
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

private void recalculateStatus() {
    if (screeningCount == 0) {
        status = CaseStatus.CREATED;
    } else if (matches.values().stream().anyMatch(m -> m.resolution().blocksClosure())) {
        status = CaseStatus.PENDING_REVIEW;
    } else {
        status = CaseStatus.REVIEWED;
    }
}`, 'domain/model/ScreeningCase.java')}
<p>Now try to corrupt a case both ways. Watch the invariant monitor:</p>
<div data-sim="aggregate-rules"></div>

<h3>The four design rules</h3>
<ol>
<li><b>Model true invariants in consistency boundaries.</b> Only rules that must hold <i>immediately</i> belong inside one aggregate. "Closure needs no open matches" – yes. "Monitoring alert sent within 5 minutes" – no, that is eventual.</li>
<li><b>Design small aggregates.</b> Large aggregates load slowly and collide constantly under concurrency. <code>ScreeningCase</code> holds its matches (tens), not all cases for a client (millions).</li>
<li><b>Reference other aggregates by identity.</b> The case stores <code>ClientGroupId</code> and <code>ProfileId</code>, never a <code>ClientGroup</code> or <code>ReferenceProfile</code> object graph.</li>
<li><b>Use eventual consistency outside the boundary.</b> Other aggregates and contexts react to events (<code>CaseClosed</code> → notify client), in their own transactions.</li>
</ol>
<div class="callout expert"><strong>Sizing heuristics</strong><ul>
<li>One transaction modifies <b>one</b> aggregate instance. If a use case needs to change two, either the boundary is wrong or you need a process (module 13).</li>
<li>If two users routinely conflict on the same aggregate for unrelated reasons, it is too big.</li>
<li>If a rule needs data from two aggregates <i>at the same instant</i>, they may be one aggregate – or the rule is really eventual. Ask the business what happens if it is briefly violated.</li>
<li>Collections that grow unbounded (all alerts ever) never belong inside an aggregate.</li>
</ul></div>

<h3>Persistence without leaking: snapshot and rehydrate</h3>
<p>The aggregate must not know about tables. It exposes an immutable <b>snapshot</b> (memento) for adapters to store, and a factory to rebuild itself:</p>
${code('java', String.raw`
public static ScreeningCase open(CaseId id, ClientGroupId clientGroup, Party party, Instant now) {
    ScreeningCase screeningCase = new ScreeningCase(id, clientGroup, party, now, 0);
    screeningCase.status = CaseStatus.CREATED;
    screeningCase.raise(new CaseOpened(UUID.randomUUID(), id, clientGroup, now, party.type()));
    return screeningCase;
}

public static ScreeningCase rehydrate(CaseSnapshot s) {      // no events raised: nothing happened
    ScreeningCase screeningCase = new ScreeningCase(s.id(), s.clientGroup(), s.party(), s.openedAt(), s.version());
    screeningCase.status = s.status();
    // ...
    s.matches().forEach(m -> screeningCase.matches.put(m.profileId(), Match.restore(m)));
    return screeningCase;
}

public CaseSnapshot snapshot() {
    return new CaseSnapshot(id, clientGroup, party, status, outcome, screeningCount, openedAt, lastScreenedAt,
            closedAt, closedBy, version, matches.values().stream().map(Match::snapshot).toList());
}`, 'domain/model/ScreeningCase.java')}
<p>Two factories with different meaning: <code>open</code> creates a new business fact (raises <code>CaseOpened</code>); <code>rehydrate</code> restores stored state (raises nothing).</p>

<h3>Concurrency: one version per aggregate</h3>
<p>Two analysts load the same case at version 1. Without a check, the second save overwrites the first. The aggregate carries a <code>version</code> it never interprets; the repository adapter turns it into <code>UPDATE … WHERE id = ? AND version = ?</code>. Zero rows updated means someone else won.</p>
<div data-sim="concurrency"></div>
${code('java', String.raw`
@MappedEntity("screening_case")
record CaseRow(@Id UUID id, /* ... */ @Version Long version) { }

// JdbcCaseRepository.save
try {
    caseRows.update(row);
} catch (OptimisticLockException e) {
    throw new ConcurrentCaseUpdateException(snapshot.id(), e);     // → HTTP 409 CONCURRENT_UPDATE
}`, 'adapter/out/persistence')}
<div class="callout rule"><strong>Why the version lives on the root</strong><p>Resolving a match changes a <code>case_match</code> row, but the version check is on <code>screening_case</code>. Because every change goes through the root and the root row is always updated, any concurrent change to <i>any part</i> of the aggregate is detected. A separate <code>MatchRepository</code> would silently break this (see module 14).</p></div>

<div data-quiz="m05"></div>
`,
  });

  Course.quiz('m05', [
    { q: 'Which rule belongs <b>inside</b> the ScreeningCase aggregate?', options: ['A monitoring alert is sent within 5 minutes of a new match', 'A case cannot close while a match is POSSIBLE', 'The client\'s monthly screening quota is not exceeded', 'Audit stores every event'], answer: 1, why: 'Only invariants that must hold immediately, within one case, belong inside. The others span aggregates/contexts and are eventual.' },
    { q: 'Why does the case reference profiles by <code>ProfileId</code> instead of holding <code>ReferenceProfile</code> objects?', options: ['To save memory only', 'Rule 3: reference other aggregates/contexts by identity, so boundaries and transactions stay small and independent', 'Because records cannot be nested', 'Micronaut Data requires it'], answer: 1, why: 'Holding another aggregate\'s object graph blurs ownership and drags it into your transaction.' },
    { q: 'Why does <code>rehydrate</code> raise no events while <code>open</code> raises CaseOpened?', options: ['A bug', 'Rehydration restores stored state – nothing happened in the business; opening is a new business fact', 'Events are raised by the repository', 'To improve performance'], answer: 1, why: 'Events record facts. Loading from storage is not a fact.' },
    { q: 'Two analysts save different resolutions for the same match from version 3. With optimistic locking…', options: ['Both succeed; last write wins', 'The first commit wins; the second gets a conflict (409) and must reload', 'Both fail', 'The database merges the changes'], answer: 1, why: 'The second UPDATE … WHERE version = 3 matches zero rows → ConcurrentCaseUpdateException → 409.' },
    { q: 'A use case needs to modify two ScreeningCase instances atomically. Most likely…', options: ['Use a bigger transaction', 'The design is wrong, or this should be a process with eventual consistency', 'Add a shared lock table', 'Merge all cases into one aggregate'], answer: 1, why: 'One transaction, one aggregate. Multi-aggregate changes indicate a boundary problem or a process (saga).' },
  ]);
})();
