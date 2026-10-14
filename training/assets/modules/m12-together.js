(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'putting-it-together', num: 12, level: 'Practitioner', minutes: 90,
    title: 'Putting it all together: one request through the whole system',
    lead: 'DDD decides the model, the hexagon protects it, Micronaut wires and runs it. Here you operate the complete service and follow every hop.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Narrate a screening request from HTTP to database to published event, naming every class.</li>
<li>Predict the HTTP status, stored rows and events for any action – and verify it in Mission Control.</li>
<li>Explain where each of the three ideas does its work in a single request.</li>
</ul></div>

<h3>The sequence for "screen a case"</h3>
${fig('07-request-sequence', 'POST /screenings: read outside the transaction, remote call outside the transaction, then one short write transaction that saves the aggregate and the outbox rows together.')}
<table>
<tr><th>#</th><th>Step</th><th>Class (ring)</th><th>Idea at work</th></tr>
<tr><td>1</td><td>Netty receives <code>POST /api/v1/client-groups/acme-bank/cases/{id}/screenings</code>; compile-time router selects the method; request moves to the blocking executor.</td><td>Micronaut runtime</td><td>Micronaut</td></tr>
<tr><td>2</td><td>Binds path variables, builds <code>ClientGroupId</code> and <code>CaseId</code> (value objects validate), creates <code>ScreenCaseCommand</code>, calls the port.</td><td><code>CaseController</code> (adapter.in)</td><td>Hexagonal: driving adapter → port.in</td></tr>
<tr><td>3</td><td>Read transaction: load the case, check tenant, take the party.</td><td><code>CaseApplicationService</code> → <code>UnitOfWork.read</code> → <code>JdbcCaseRepository</code></td><td>Hexagonal: driven ports</td></tr>
<tr><td>4</td><td>Fetch candidate profiles – no transaction open.</td><td><code>ReferenceDataSource</code> → in-memory or HTTP adapter (ACL)</td><td>DDD: context map / ACL</td></tr>
<tr><td>5</td><td>Write transaction begins; load the case again (fresh version).</td><td><code>JdbcUnitOfWork</code> → <code>TransactionOperations</code></td><td>Micronaut Data</td></tr>
<tr><td>6</td><td><code>screeningCase.screen(candidates, policy, now)</code>: policy scores, aggregate keeps one match per profile, preserves resolutions, derives status, raises <code>CaseScreened</code>.</td><td><code>ScreeningCase</code>, <code>NameMatchingPolicy</code> (domain)</td><td>DDD: aggregate, domain service, event</td></tr>
<tr><td>7</td><td>Save: <code>UPDATE screening_case … WHERE version = ?</code>, upsert matches.</td><td><code>JdbcCaseRepository</code> + <code>CaseRowMapper</code></td><td>Optimistic locking</td></tr>
<tr><td>8</td><td>Append pulled events to <code>outbox_event</code> in the same transaction; commit.</td><td><code>OutboxEventAppender</code></td><td>Transactional outbox</td></tr>
<tr><td>9</td><td><code>CaseView</code> → <code>CaseResponse</code> → JSON via Serde; 200 OK.</td><td><code>CaseController</code></td><td>Hexagonal: views out</td></tr>
<tr><td>10</td><td>Seconds later: relay reads unpublished rows, publishes, marks <code>published_at</code>.</td><td><code>OutboxRelay</code> (<code>@Scheduled</code>) → <code>IntegrationEventSink</code></td><td>Micronaut scheduling; eventual consistency</td></tr>
</table>
${code('java', String.raw`
/**
 * The reference-data call can be slow and is remote, so it runs outside the database transaction.
 * Optimistic locking on save catches anyone who changed the case meanwhile.
 */
@Override
public CaseView screen(ScreenCaseCommand command) {
    Party party = unitOfWork.read(() -> load(command.clientGroup(), command.caseId()).party());
    List<ReferenceProfile> candidates = referenceData.candidatesFor(party);
    return unitOfWork.write(() -> {
        ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
        screeningCase.screen(candidates, matchingPolicy, clock.instant());
        return commit(screeningCase);
    });
}`, 'application/CaseApplicationService.java')}

<h3>Mission Control</h3>
<p>Below is the complete service. The left panel is the API client; the hexagon shows where the request is; the dark panels show the exact HTTP exchange and the trace through the rings; the bottom shows what is stored.</p>
<div data-sim="mission-control"></div>

<h3>Missions – predict first, then verify</h3>
<p>Write your prediction (status code, rule, rows, events) before clicking. Each mission targets one concept from an earlier module.</p>
<table>
<tr><th>#</th><th>Mission</th><th>Expected</th><th>Concept</th></tr>
<tr><td>1</td><td>Open "Viktor Albescu 1961-03-14 RO", screen it.</td><td>201 then 200, <code>PENDING_REVIEW</code>, one match WC-1001 score 100; the namesake WC-1010 is evaluated but below threshold.</td><td>Domain service, secondary identifiers</td></tr>
<tr><td>2</td><td>Close it immediately.</td><td>422, rule <code>MATCHES_AWAITING_REVIEW</code>; trace shows ROLLBACK; version unchanged; no new outbox row.</td><td>Invariant 6, unit of work</td></tr>
<tr><td>3</td><td>As analyst-anna resolve POSITIVE, then (still anna) resolve FALSE_POSITIVE.</td><td>200, then 422 <code>FOUR_EYES</code>. Switch to analyst-ben: 200.</td><td>Invariant 5</td></tr>
<tr><td>4</td><td>Resolve with rationale "ok".</td><td>400 <code>INVALID_VALUE</code> – the value object, before the use case runs.</td><td>Validation layers</td></tr>
<tr><td>5</td><td>Switch client group to globex-bank, GET the case.</td><td>404 – not 403. Tenants cannot learn the case exists.</td><td>Multi-tenancy in the application service</td></tr>
<tr><td>6</td><td>Open twice with Idempotency-Key <code>onboarding-42</code>.</td><td>Same caseId both times; one row in <code>idempotency_key</code>; one <code>CaseOpened</code>.</td><td>Idempotency</td></tr>
<tr><td>7</td><td>Open "Viktor Albescu" with no DOB/country, screen, then lower the threshold to 60 and screen again.</td><td>First two matches; then more candidates match (e.g. Sofia Albescu at 67); earlier resolutions preserved, no duplicates.</td><td>Invariant 2, configuration</td></tr>
<tr><td>8</td><td>Open the organisation preset with a DOB.</td><td>400 – "An organisation has no date of birth" from <code>Party</code>.</td><td>Composite value objects</td></tr>
<tr><td>9</td><td>Watch <code>outbox_event</code>, then click "Run OutboxRelay".</td><td>Pending rows get <code>published_at</code>; events appear in "published events" in order.</td><td>Outbox</td></tr>
<tr><td>10</td><td>Close a fully resolved case, then try to screen it.</td><td>Close 200 with outcome; screen 422 <code>CASE_CLOSED</code>.</td><td>Invariant 1</td></tr>
</table>

<h3>Where each idea did its job</h3>
<div class="two-col">
<div class="card"><h4>DDD</h4><ul>
<li>The words: case, match, resolution, rationale, client group.</li>
<li>The rules: all seven invariants in one aggregate.</li>
<li>The boundaries: Risk Intelligence behind an ACL; published events as the language for others.</li></ul></div>
<div class="card"><h4>Hexagonal</h4><ul>
<li>Controller only translates; never decides.</li>
<li>Transactions, persistence, reference data, events: all ports.</li>
<li>Adapters swap by configuration; tests drive the same ports with fakes.</li></ul></div>
<div class="card"><h4>Micronaut</h4><ul>
<li>Compile-time DI wiring ports to adapters via <code>@Factory</code> and <code>@Requires</code>.</li>
<li>HTTP routing, Serde, validation, problem handlers.</li>
<li>Data JDBC with optimistic locking, Flyway, transactions, <code>@Scheduled</code> relay.</li></ul></div>
<div class="card"><h4>Together</h4><ul>
<li>Rule change → one domain class + tests.</li>
<li>Technology change → one adapter + config.</li>
<li>Contract change → API models / event payloads, versioned.</li></ul></div>
</div>

<div class="callout lead"><strong>Team exercise (60 minutes)</strong><p>Project Mission Control in a team session. One person drives; everyone else writes predictions on sticky notes before each click. Discuss every wrong prediction – each one is a misunderstanding that would otherwise appear in code review months later.</p></div>

<div data-quiz="m12"></div>
`,
  });

  Course.quiz('m12', [
    { q: 'During <code>screen</code>, why is the case loaded twice?', options: ['A bug', 'Once in a read transaction to get the party for the remote call; again inside the short write transaction so the save uses the latest version', 'For caching', 'Micronaut requires it'], answer: 1, why: 'The remote call happens with no transaction open. Optimistic locking on the second load/save protects against concurrent changes in between.' },
    { q: 'Closing a case with open matches: what is stored afterwards?', options: ['Case CLOSED, outbox row written', 'Nothing changes: the domain exception rolls back the unit of work', 'Case REVIEWED', 'A CaseCloseFailed event'], answer: 1, why: 'The aggregate throws before changing state; the transaction rolls back; no event is appended.' },
    { q: 'Calling as another client group returns…', options: ['403 Forbidden', '404 Not Found', '422', '200 with empty body'], answer: 1, why: 'Returning 404 avoids leaking existence of other tenants\' cases.' },
    { q: 'Which component turns domain events into published messages?', options: ['ScreeningCase', 'CaseController', 'OutboxEventAppender writes rows; OutboxRelay publishes them asynchronously', 'Micronaut Data'], answer: 2, why: 'Appender: same transaction as the state change. Relay: later, at-least-once.' },
    { q: 'A rule changes: POSSIBLE no longer blocks closure. What changes?', options: ['Controller and SQL', '<code>Resolution.blocksClosure()</code> (domain) and its tests', 'application.yml', 'The outbox relay'], answer: 1, why: 'Business rules live in the domain; nothing else needs to know.' },
  ]);
})();
