(function () {
  const { code } = Course;
  Course.module({
    id: 'final-assessment', num: 16, level: 'Leader', minutes: 120,
    title: 'Final assessment and capstone',
    lead: 'Twenty questions across the whole course, then a capstone feature built end-to-end in the code lab and reviewed against a rubric.',
    html: `
<h3>Part 1 – Knowledge check</h3>
<p>Twenty questions, mixed levels. 80% to pass. Explanations appear after submitting.</p>
<div data-quiz="final"></div>

<h3>Part 2 – Capstone: senior review for sanctions positives</h3>
<div class="callout wc"><strong>Business request</strong><p>"From next quarter, any case with a POSITIVE match in category SANCTIONS can only be closed by a <b>senior analyst</b>. Junior analysts can resolve matches but the closure must be done by a senior. We also need to know, in the case history, who the senior was."</p></div>
<h4>What to deliver (in the code lab)</h4>
<ol>
<li><b>Language</b>: add terms to a glossary file. Is "senior analyst" a role, a property of <code>AnalystId</code>, or something the caller asserts? Decide and document it in an ADR (one page).</li>
<li><b>Model</b>: new invariant in <code>ScreeningCase.close(...)</code> with a new rule code (e.g. <code>SENIOR_REQUIRED</code>). Update the invariants Javadoc. Domain tests for: junior blocked, senior allowed, non-sanctions positive unaffected.</li>
<li><b>Application</b>: how does the use case learn seniority? Hint: a driven port (e.g. <code>AnalystDirectory.isSenior(AnalystId)</code>) queried by the application service and passed into the domain as a value – the domain must not call ports.</li>
<li><b>Adapters</b>: an in-memory directory adapter selected with <code>@Requires</code>; REST maps the new rule to 422 automatically (verify).</li>
<li><b>Events</b>: decide whether <code>CaseClosed</code> gains a field (compatible change, keep <code>schemaVersion</code> 1) or a new event is needed. Update <code>EventPayloads</code> and the API test.</li>
<li><b>Architecture</b>: all five ArchUnit tests still pass; no framework import enters domain/application.</li>
<li><b>Review</b>: open a PR (or a diff) and review it with the checklist from module 14 together with a peer.</li>
</ol>
${code('java', String.raw`
// One possible domain signature – the application service resolves seniority through a port first.
public void close(AnalystId analyst, AnalystSeniority seniority, Instant now) {
    requireOpen("close");
    // ... existing checks ...
    boolean sanctionsPositive = matches.values().stream()
            .anyMatch(m -> m.resolution() == Resolution.POSITIVE && m.category() == RiskCategory.SANCTIONS);
    if (sanctionsPositive && seniority != AnalystSeniority.SENIOR) {
        throw new DomainException(SENIOR_REQUIRED, "Closing a case with a sanctions positive needs a senior analyst");
    }
    // ...
}`, 'hint – not the only valid design')}

<h4>Rubric</h4>
<table>
<tr><th>Criterion</th><th>1 – Needs work</th><th>3 – Competent</th><th>5 – Expert</th></tr>
<tr><td>Language</td><td>Technical names (<code>flag</code>, <code>level</code>)</td><td>Business terms, glossary updated</td><td>Ambiguity found and resolved with an expert; ADR explains it</td></tr>
<tr><td>Invariant placement</td><td>Check in controller or service</td><td>Check in aggregate with tests</td><td>Also reasons about rescreen/resolve interactions and four-eyes overlap</td></tr>
<tr><td>Ports &amp; dependencies</td><td>Domain calls a directory/HTTP</td><td>Port in application, value passed into domain</td><td>Port shaped by need; adapter swappable; failure mode of the directory considered</td></tr>
<tr><td>Contracts</td><td>Event/API broken silently</td><td>Compatible change, tests updated</td><td>Consumers identified; versioning strategy stated in the ADR</td></tr>
<tr><td>Tests</td><td>Only API tests</td><td>Domain + application + one API test</td><td>Cheapest test per behaviour; no mocks of value objects; ArchUnit green</td></tr>
<tr><td>Review</td><td>No review</td><td>Checklist applied</td><td>Peer review comments are labelled and teach</td></tr>
</table>
<p><b>Pass</b>: average ≥ 3 with no criterion at 1. <b>Ready to lead</b>: average ≥ 4 and you have facilitated one session from the facilitator guide.</p>

<h3>Part 3 – Certification checklist</h3>
<ul>
<li>☐ All 16 module quizzes passed (see the sidebar)</li>
<li>☐ Final assessment ≥ 80%</li>
<li>☐ Capstone reviewed against the rubric</li>
<li>☐ All ten Mission Control missions predicted and verified</li>
<li>☐ Explained the hexagon and the outbox to a colleague without notes</li>
<li>☐ Facilitated one Event Storming or kata session</li>
</ul>
<div class="callout lead"><strong>What next</strong><p>Use <code>facilitator-guide.md</code> to run this course with your team as an 8-week cohort, and <code>code-lab/README.md</code> for further exercises (Kafka sink, rescreen scheduler, work-queue read model, PostgreSQL with Test Resources).</p></div>
`,
  });

  Course.quiz('final', [
    { q: 'Which subdomain deserves the richest model and best engineers?', options: ['Generic', 'Supporting', 'Core', 'All equally'], answer: 2, why: 'Core subdomains are why clients pay; invest there.' },
    { q: 'The same word means different things to two teams. This suggests…', options: ['A naming convention is needed', 'A bounded-context boundary', 'A shared kernel', 'Merging the teams'], answer: 1, why: 'Language divergence is the primary boundary signal.' },
    { q: 'An unstable upstream model should be integrated via…', options: ['Conformist', 'Shared database', 'Anti-Corruption Layer', 'Partnership'], answer: 2, why: 'An ACL confines upstream change to one adapter.' },
    { q: 'In Event Storming, "Rescreen case" is a…', options: ['Domain event', 'Command', 'Policy', 'Read model'], answer: 1, why: 'Imperative intention: command (blue).' },
    { q: 'Value objects should be…', options: ['Mutable with setters', 'Immutable and self-validating', 'Annotated for persistence', 'Compared by identity'], answer: 1, why: 'Records with compact-constructor validation.' },
    { q: 'Why are Match mutators package-private?', options: ['Style', 'Only the aggregate root may change matches, so it can enforce case-level invariants', 'Serialization', 'Performance'], answer: 1, why: 'All changes go through the root.' },
    { q: 'One transaction should modify…', options: ['As many aggregates as needed', 'One aggregate instance', 'All aggregates of a tenant', 'Only read models'], answer: 1, why: 'Multi-aggregate changes indicate boundary problems or a process.' },
    { q: 'Optimistic locking detects concurrent change by…', options: ['Row locks held for the whole user session', 'A version column checked in UPDATE … WHERE version = ?', 'Timestamps in logs', 'Distributed locks'], answer: 1, why: 'Zero rows updated → conflict → 409.' },
    { q: 'Where does name scoring belong?', options: ['Party', 'Controller', 'Domain service NameMatchingPolicy', 'Repository'], answer: 2, why: 'Behaviour across two concepts owned by neither.' },
    { q: 'The application service should contain…', options: ['Business rules', 'Orchestration: load, tenant check, call one domain method, save, outbox, view', 'SQL', 'HTTP status codes'], answer: 1, why: 'Rules belong to the domain; HTTP to adapters.' },
    { q: 'In hexagonal architecture, a JUnit test calling a use-case interface is…', options: ['A driven adapter', 'A driving adapter', 'Part of the domain', 'Forbidden'], answer: 1, why: 'Anything that drives a port.in is a driving adapter.' },
    { q: 'Who declares the CaseRepository interface?', options: ['Micronaut Data', 'The JDBC adapter', 'The application (port.out)', 'The controller'], answer: 2, why: 'Dependency inversion: the inner ring owns the port.' },
    { q: 'Closing a case with an UNRESOLVED match returns…', options: ['400', '404', '409', '422 MATCHES_AWAITING_REVIEW'], answer: 3, why: 'Valid request, disallowed action.' },
    { q: 'Micronaut generates bean definitions…', options: ['By scanning the classpath at startup', 'At compile time with annotation processors', 'On first request via reflection', 'Only for native images'], answer: 1, why: 'That is Micronaut\'s defining design.' },
    { q: 'A typo in a <code>@Requires</code> property value results in…', options: ['A silent fallback', 'No matching bean → NoSuchBeanException when resolved', 'A compile error', 'Both beans created'], answer: 1, why: 'Conditions are evaluated at startup; no candidate means a resolution error.' },
    { q: 'Why fetch reference data outside the write transaction?', options: ['Micronaut requires it', 'To avoid holding locks and connections during a slow remote call', 'For caching', 'To skip validation'], answer: 1, why: 'Optimistic locking covers the gap.' },
    { q: 'The cheapest test for "four-eyes" is…', options: ['API test', 'Domain unit test', 'Adapter test', 'Manual test'], answer: 1, why: 'Pure domain logic.' },
    { q: 'The outbox guarantees…', options: ['Exactly-once delivery', 'State change and event record commit atomically; delivery is at-least-once', 'Global ordering', 'No duplicates'], answer: 1, why: 'Consumers must still de-duplicate.' },
    { q: 'A breaking change to a published event should be handled by…', options: ['Changing the field in place', 'Expand and contract with schemaVersion and a deprecation period', 'Deleting the topic', 'Telling consumers on Slack'], answer: 1, why: 'Keep consumers working while they migrate.' },
    { q: 'The best way to start adopting these ideas in a team is…', options: ['A big-bang rewrite', 'A training slide deck', 'One valuable flow done end to end, enforced by tests, used as the reference', 'Mandating DDD in all code'], answer: 2, why: 'A visible win and a reference implementation spread practices faster than mandates.' },
  ]);
})();
