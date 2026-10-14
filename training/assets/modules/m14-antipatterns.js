(function () {
  const { code } = Course;
  Course.module({
    id: 'anti-patterns-review', num: 14, level: 'Expert', minutes: 70,
    title: 'Anti-patterns and design review',
    lead: 'Recognise the failure modes on sight, explain them without lecturing, and review pull requests like a principal engineer.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Name the common DDD, hexagonal and Micronaut anti-patterns, their symptoms and their fixes.</li>
<li>Run a structured design review with a checklist.</li>
<li>Write review comments that teach rather than block.</li>
</ul></div>

<h3>The catalogue</h3>
<table>
<tr><th>Anti-pattern</th><th>Symptom you can grep for</th><th>Why it hurts</th><th>Fix</th></tr>
<tr><td><b>Anemic domain model</b></td><td>Entities with only getters/setters; <code>*Service</code> classes with <code>if (x.getStatus() == …)</code></td><td>Rules duplicated and bypassed</td><td>Move behaviour into aggregates; delete setters</td></tr>
<tr><td><b>God aggregate</b></td><td>An aggregate holding unbounded collections (all cases of a client)</td><td>Slow loads, constant version conflicts</td><td>Split by true invariants; reference by id</td></tr>
<tr><td><b>Repository per table</b></td><td><code>MatchRepository</code> next to <code>CaseRepository</code></td><td>Children change without the root's invariants or version</td><td>One repository per aggregate root</td></tr>
<tr><td><b>Framework in the domain</b></td><td><code>@MappedEntity</code>, <code>@Serdeable</code>, <code>@Inject</code> in <code>domain</code></td><td>Schema/JSON changes force domain changes; slow tests</td><td>Separate rows/DTOs in adapters; ArchUnit rule</td></tr>
<tr><td><b>Leaky ports</b></td><td><code>Page&lt;CaseRow&gt; findAll(Specification)</code> on a port</td><td>Application depends on persistence concepts</td><td>Use-case-shaped ports returning domain types</td></tr>
<tr><td><b>Smart controllers</b></td><td>Business <code>if</code>s or <code>@Transactional</code> in controllers</td><td>Rules tied to HTTP; not reusable from queues/jobs</td><td>Controller translates only; use case decides</td></tr>
<tr><td><b>Dual writes</b></td><td><code>save(); kafka.send();</code> in the same method</td><td>Lost or phantom events (module 13)</td><td>Transactional outbox</td></tr>
<tr><td><b>Entity-shaped events</b></td><td><code>CaseUpdatedEvent(Case fullState)</code></td><td>Consumers couple to internals; no business meaning</td><td>Named business events with explicit, versioned payloads</td></tr>
<tr><td><b>Shared database integration</b></td><td>Another team's service reads your tables</td><td>Schema becomes a public API you cannot change</td><td>OHS/PL: API or events; ACL on their side</td></tr>
<tr><td><b>DDD everywhere</b></td><td>Aggregates and events for a reference-data CRUD screen</td><td>Cost with no benefit; team fatigue</td><td>Strategic classification first; CRUD for generic/supporting</td></tr>
<tr><td><b>Interfaces for everything</b></td><td><code>IPartyName</code>, <code>ScreeningCaseImpl</code></td><td>Noise; hides the real boundaries</td><td>Interfaces only for ports</td></tr>
<tr><td><b>Remote call in a transaction</b></td><td>HTTP client invoked inside <code>write(…)</code> / <code>@Transactional</code></td><td>Long locks, pool exhaustion under latency</td><td>Fetch first, then short write transaction</td></tr>
<tr><td><b>Missing annotation processors</b></td><td>Beans "not found", 404 on every route</td><td>Nothing generated at compile time</td><td>Fix <code>annotationProcessorPaths</code>; check <code>target/classes</code></td></tr>
<tr><td><b>Blocking the event loop</b></td><td>JDBC in a controller without <code>@ExecuteOn</code></td><td>Latency spikes for every request on that loop</td><td><code>@ExecuteOn(TaskExecutors.BLOCKING)</code> / virtual threads</td></tr>
</table>

<h3>Review simulator</h3>
<div data-sim="code-review"></div>

<h3>Design review checklist</h3>
<p>Use it for any pull request that touches the domain or adds an adapter. Paste it into your PR template.</p>
${code('text', `
LANGUAGE
[ ] New names match the glossary; no synonyms introduced
[ ] Events are past-tense business facts; commands are imperative

MODEL
[ ] New rules live in the aggregate/value object, with a test named as a business sentence
[ ] Aggregate invariants Javadoc updated
[ ] One transaction modifies one aggregate
[ ] Other aggregates/contexts referenced by id only
[ ] Value objects validate in their constructor; no setters

BOUNDARIES
[ ] Controller translates only (no business ifs, no @Transactional)
[ ] Ports named after needs, return domain types / views
[ ] No framework imports in domain/application (ArchUnit green)
[ ] Upstream models translated in an ACL adapter

CONSISTENCY & INTEGRATION
[ ] Events go through the outbox in the same transaction
[ ] No remote calls inside write transactions
[ ] Published payload changes are backward compatible (or versioned)
[ ] Consumers are idempotent; commands carry idempotency keys where retried

OPERATIONS & SECURITY
[ ] Tenant check on every load; test for cross-tenant access
[ ] Errors map to 400/404/409/422 with rule codes
[ ] Metrics/logs for new flows; no personal data in logs
[ ] Flyway migration is backward compatible with the running version`, 'docs/review-checklist.md')}

<h3>Writing review comments that teach</h3>
<table>
<tr><th>Instead of</th><th>Write</th></tr>
<tr><td>"This is wrong, not DDD."</td><td>"This check lets a case close while a POSSIBLE match is open if it is called from the bulk job. Could it move into <code>ScreeningCase.close()</code> so every caller gets it? Happy to pair."</td></tr>
<tr><td>"Use the outbox."</td><td>"If the commit fails after <code>send()</code>, monitoring sees a closure that never happened. The outbox appender gives us atomicity – see <code>OutboxEventAppender</code>. Blocking, because it affects audit."</td></tr>
<tr><td>"Rename this."</td><td>"Analysts call this a 'resolution', and the glossary has it. <code>updateStatus</code> → <code>resolveMatch</code>? Non-blocking."</td></tr>
</table>
<div class="callout lead"><strong>Label severity</strong><p>Prefix comments with <b>blocking</b>, <b>should</b> or <b>nit</b>. Block only for correctness, security, audit, or boundary violations. Everything else is teaching. A reviewer who blocks on style loses the authority to block on substance.</p></div>

<div data-quiz="m14"></div>
`,
  });

  Course.quiz('m14', [
    { q: 'You find <code>matchRepository.update(match.withResolution(...))</code> in a service. Main problem?', options: ['Naming', 'It bypasses the aggregate: four-eyes, rationale, closed-case checks and the root version are skipped', 'Performance', 'It uses records'], answer: 1, why: 'Children change only through the root, which enforces invariants and carries the optimistic-lock version.' },
    { q: 'Which is an entity-shaped event (anti-pattern)?', options: ['MatchResolved(matchId, previous, resolution, analyst)', 'CaseUpdatedEvent(fullCaseState)', 'CaseClosed(outcome, closedBy)', 'CaseScreened(newMatches, totalMatches)'], answer: 1, why: '"Updated" with the whole state carries no business meaning and couples consumers to internals.' },
    { q: 'A reviewer blocks a PR for a variable name. Effect over time?', options: ['Better code', 'Reviewers lose authority to block on substance; authors stop listening', 'Faster delivery', 'No effect'], answer: 1, why: 'Reserve blocking for correctness, security, audit and boundaries; label the rest.' },
    { q: 'An HTTP call to reference data inside a write transaction mainly risks…', options: ['Wrong JSON', 'Long-held locks and connection-pool exhaustion when the upstream is slow', 'Compile errors', 'Duplicate events'], answer: 1, why: 'Latency of the remote call becomes lock and connection hold time.' },
    { q: 'For a CRUD screen that maintains a list of supported languages, you should…', options: ['Build aggregates, events and an outbox', 'Use simple CRUD – it is a generic/supporting concern with thin rules', 'Put it in the screening aggregate', 'Use event sourcing'], answer: 1, why: 'DDD everywhere is an anti-pattern. Invest where the domain is complex and valuable.' },
  ]);
})();
