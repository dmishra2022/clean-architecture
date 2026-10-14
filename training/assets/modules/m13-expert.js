(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'expert-patterns', num: 13, level: 'Expert', minutes: 120,
    title: 'Expert patterns: consistency across boundaries, evolution and scale',
    lead: 'What separates a working service from a platform that survives years of change, crashes and growth.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Prove why dual writes fail and implement a production-grade outbox with multiple relay instances.</li>
<li>Build idempotent APIs and idempotent consumers.</li>
<li>Design a process manager for a long-running, cross-context flow.</li>
<li>Introduce CQRS read models where queries outgrow the aggregate.</li>
<li>Version events and APIs without breaking consumers.</li>
<li>Choose multi-tenancy, migration (strangler + ACL) and deployment strategies deliberately.</li>
</ul></div>

<h3>1. The transactional outbox, properly</h3>
${fig('09-outbox', 'State change and event row commit together. A relay publishes afterwards, at least once. Consumers de-duplicate by eventId.')}
<p>A service that writes to its database and to a broker performs a <b>dual write</b>: two systems, no shared transaction. Some crash point will always leave them disagreeing. Prove it to yourself:</p>
<div data-sim="outbox-crash"></div>
<h4>Relay with several instances</h4>
<p>The lab's relay is a single <code>synchronized</code> method. With N instances, claim rows so each is published by one instance at a time:</p>
${code('sql', `
-- inside a short transaction, per batch
SELECT id, event_type, payload
FROM outbox_event
WHERE published_at IS NULL
ORDER BY occurred_at
LIMIT 100
FOR UPDATE SKIP LOCKED;          -- PostgreSQL / MySQL 8 / Oracle: other instances skip claimed rows

-- publish each row, then
UPDATE outbox_event SET published_at = now() WHERE id = ?;`)}
<table>
<tr><th>Option</th><th>Pros</th><th>Cons</th></tr>
<tr><td>Polling relay + <code>SKIP LOCKED</code></td><td>Simple, no extra infrastructure</td><td>Polling latency; ordering only per batch unless partitioned by aggregate</td></tr>
<tr><td>Leader-elected single relay</td><td>Strict global order</td><td>Throughput limited to one instance; needs leader election</td></tr>
<tr><td>Change data capture (Debezium reading the outbox table)</td><td>Low latency, no polling load</td><td>Kafka Connect to operate; another moving part</td></tr>
</table>
<div class="callout expert"><strong>Ordering</strong><p>Consumers usually need order <i>per aggregate</i>, not globally. Publish with the case id as the partition/message key: all events of one case go to one partition in order, while different cases scale out in parallel.</p></div>
<p>Operational must-haves: a metric for pending outbox rows and age of the oldest pending row (alert when it grows), a retention job deleting published rows after N days, and a runbook for poison messages.</p>

<h3>2. Idempotency everywhere</h3>
<h4>Idempotent commands (API side)</h4>
<p>Networks time out after the server committed. Clients retry. Without protection, a retried "open case" creates a duplicate case – and a duplicate audit trail. The lab stores <code>(client group, Idempotency-Key) → case id</code> in the same transaction as the new case:</p>
${code('java', String.raw`
@Override
public CaseView open(OpenCaseCommand command) {
    return unitOfWork.write(() -> {
        if (command.idempotencyKey() != null) {
            Optional<CaseId> existing = idempotency.find(command.clientGroup(), command.idempotencyKey());
            if (existing.isPresent()) {
                return CaseView.of(load(command.clientGroup(), existing.get()));
            }
        }
        ScreeningCase opened = ScreeningCase.open(CaseId.newId(), command.clientGroup(), command.party(),
                clock.instant());
        CaseView view = commit(opened);
        if (command.idempotencyKey() != null) {
            idempotency.remember(command.clientGroup(), command.idempotencyKey(), opened.id());
        }
        return view;
    });
}`, 'application/CaseApplicationService.java')}
<p>Production hardening: a unique constraint on the key (two concurrent first requests → one wins, the other retries and finds it), an expiry policy, and optionally a hash of the request body so the same key with a different body returns 422.</p>
<h4>Idempotent consumers (event side)</h4>
<p>At-least-once delivery means duplicates are normal. A consumer records processed event ids in an <b>inbox</b> table in the same transaction as its own state change:</p>
${code('java', String.raw`
public void on(IntegrationEvent event) {
    unitOfWork.write(() -> {
        if (!inbox.markProcessed(event.eventId())) {    // INSERT … ON CONFLICT DO NOTHING → false if seen
            return null;                                // duplicate: acknowledge and ignore
        }
        // react: update read model, start a process, send a command ...
        return null;
    });
}`, 'consumer side (exercise)')}
<p>Some operations are naturally idempotent and need no inbox: rescreening is (invariant 2 keeps one match per profile and preserves resolutions).</p>

<h3>3. Long-running processes: sagas and process managers</h3>
${fig('13-ongoing-monitoring-saga', 'Ongoing monitoring as a process manager: each step is a local transaction; events and commands connect them; failures are handled by retries and explicit business decisions.')}
<p>When a business flow spans aggregates or contexts, there is no single transaction. Two styles:</p>
<table>
<tr><th></th><th>Choreography</th><th>Orchestration (process manager)</th></tr>
<tr><td>How</td><td>Each context reacts to others' events</td><td>One component holds the process state and sends commands</td></tr>
<tr><td>Good for</td><td>Simple, few steps, loosely related reactions</td><td>Multi-step flows with timeouts, compensation, visibility needs</td></tr>
<tr><td>Risk</td><td>Nobody can see the whole flow; cyclic event chains</td><td>The orchestrator grows into a god service if it absorbs domain rules</td></tr>
</table>
<div data-sim="saga"></div>
<div class="callout rule"><strong>Process manager rules</strong><ul>
<li>It owns <i>process</i> state (which cases still need rescreening), not domain rules (whether a case may be screened).</li>
<li>Every command it sends is idempotent or carries an idempotency key.</li>
<li>Every wait has a timeout and an explicit business decision for "it never came".</li>
<li>Compensation is a business action ("open a new review case"), not a database rollback.</li>
</ul></div>

<h3>4. CQRS: read models for queries the aggregate should not serve</h3>
<p>The analyst work queue needs: all open cases for a client group with at least one POSITIVE or POSSIBLE match, sorted by highest score, filtered by category, paginated. Loading aggregates for that is slow and couples the screen to the aggregate's shape.</p>
<p><b>Command Query Responsibility Segregation</b>: writes go through aggregates; reads come from a separate model shaped for the screen, kept up to date by events.</p>
${code('java', String.raw`
// adapter.in.events: projection, fed by the same integration events
void on(IntegrationEvent e) {
    switch (e.type()) {
        case "CaseScreened"  -> workQueue.upsertCounts(e.caseId(), e.payload());
        case "MatchResolved" -> workQueue.updateResolution(e.caseId(), e.payload());
        case "CaseClosed"    -> workQueue.remove(e.caseId());
        default -> { }
    }
}

// port.in: a query, no aggregate involved
interface WorkQueueQuery {
    Page<WorkItem> pending(ClientGroupId group, RiskCategory category, Pageable page);
}`, 'exercise: analyst work queue')}
<p>Trade-off: the read model is eventually consistent (milliseconds to seconds behind). Show "last updated" in the UI, and read your own writes from the command response when a user needs to see their change immediately. CQRS does <b>not</b> require event sourcing or two databases; a projection table in the same schema is a fine start.</p>

<h3>5. Evolving contracts: events and APIs</h3>
<table>
<tr><th>Change</th><th>Compatible?</th><th>How</th></tr>
<tr><td>Add an optional field</td><td>Yes</td><td>Consumers ignore unknown fields (tolerant reader). Keep <code>schemaVersion</code>.</td></tr>
<tr><td>Rename or remove a field</td><td>No</td><td>Add the new field, publish both for a deprecation period, then bump <code>schemaVersion</code> and remove.</td></tr>
<tr><td>Change meaning of a field</td><td>No – the worst kind</td><td>New field or new event type. Never change semantics silently.</td></tr>
<tr><td>New event type</td><td>Yes</td><td>Consumers must ignore types they do not know.</td></tr>
<tr><td>API: new endpoint / optional request field</td><td>Yes</td><td>Same <code>/v1</code>.</td></tr>
<tr><td>API: breaking response change</td><td>No</td><td><code>/v2</code> alongside <code>/v1</code>, with a published sunset date.</td></tr>
</table>
<p>Because the code lab maps domain events to an explicit payload (<code>EventPayloads</code>), refactoring the domain never changes the published language by accident. Add consumer-driven contract tests (e.g. Pact) or JSON-schema checks in CI for events other teams rely on.</p>

<h3>6. Multi-tenancy</h3>
<table>
<tr><th>Strategy</th><th>Isolation</th><th>Cost</th><th>When</th></tr>
<tr><td>Shared schema, tenant column (the lab)</td><td>Logical – enforced by code</td><td>Lowest</td><td>Many tenants, uniform requirements</td></tr>
<tr><td>Schema per tenant</td><td>Stronger; per-tenant backup/restore</td><td>Medium; migrations × N</td><td>Tens to hundreds of tenants, contractual isolation</td></tr>
<tr><td>Database per tenant</td><td>Strongest; data residency per region</td><td>Highest</td><td>Few large tenants, regulatory residency</td></tr>
</table>
<p>With a shared schema, isolation is a domain-visible rule: <code>ScreeningCase.belongsTo(clientGroup)</code>, checked in every application-service load, returning 404 for other tenants. Defend in depth: tenant id in every index and query, row-level security in PostgreSQL as a safety net, and a test like <code>casesAreInvisibleToOtherClientGroups</code> for every endpoint.</p>
<div class="callout wc"><strong>Regulated context</strong><p>Screening data is sensitive personal data. Tenant leakage is a reportable incident. Treat the tenant check as an invariant with tests at three levels (domain <code>belongsTo</code>, application service, API), not as a filter someone might forget in a new query.</p></div>

<h3>7. Migrating legacy: strangler fig + ACL</h3>
<ol>
<li><b>Map</b> the legacy system as a context (often a Big Ball of Mud). Identify one capability to extract – e.g. case closure.</li>
<li><b>Intercept</b>: route that capability's traffic through a facade (API gateway rule or the new service in front).</li>
<li><b>Build</b> the new model behind an ACL that translates legacy data and codes; the legacy model never leaks into the new domain.</li>
<li><b>Sync</b> during transition: the new service publishes events; a legacy adapter updates old tables (or the reverse), never both writing the same data.</li>
<li><b>Cut over</b> per tenant or per feature flag; measure; retire the legacy path.</li>
</ol>
<div class="callout pitfall"><strong>Avoid</strong><p>Shared database integration during migration ("the new service just reads the old tables"). It couples you to the legacy schema forever – the opposite of what the ACL is for.</p></div>

<h3>8. Modular monolith or microservices?</h3>
<table>
<tr><th>Start with a modular monolith when…</th><th>Split into services when…</th></tr>
<tr><td>
<ul><li>One team, or boundaries still moving</li><li>Strong consistency across modules is still common</li><li>Operational maturity (tracing, on-call, CD per service) is not there yet</li></ul>
</td><td>
<ul><li>Teams need independent release cadence</li><li>A module has very different scaling (batch screening spikes)</li><li>Different availability/security requirements</li><li>Boundaries have been stable for months</li></ul>
</td></tr>
</table>
<p>Hexagonal modules with ArchUnit-enforced boundaries, separate schemas and event-based integration make the later split mechanical: the module already talks to others only through ports.</p>

<h3>9. Performance and runtime</h3>
<ul>
<li><b>Blocking first.</b> The matching pass is CPU-bound and the store is JDBC. Virtual threads + a right-sized pool beat reactive complexity for this workload.</li>
<li><b>Blocking keys.</b> The real cost of screening is candidate generation. The lab's 3-letter prefix blocking stands in for a search index (phonetic keys, n-grams) in the reference-data context.</li>
<li><b>Batch screening.</b> Chunk input files, open cases with idempotency keys derived from file + line, process chunks in parallel, and make every step restartable.</li>
<li><b>GraalVM native image.</b> Micronaut's compile-time approach makes native builds practical: millisecond startup and low memory for scale-to-zero jobs. Cost: longer builds and reflection configuration for some libraries. Measure before committing.</li>
<li><b>Observability.</b> Micrometer timers per use case (<code>screening.screen.duration</code>), outbox lag gauges, OpenTelemetry tracing propagated through the relay (put the trace id in the outbox row).</li>
</ul>

<div data-quiz="m13"></div>
`,
  });

  Course.quiz('m13', [
    { q: 'The process crashes after COMMIT but before <code>broker.publish</code> in a dual write. Result?', options: ['Consistent', 'State changed, event lost forever', 'Event published, state rolled back', 'The broker retries'], answer: 1, why: 'There is no record of the pending publish. The outbox stores it with the state change so a relay can deliver it later.' },
    { q: 'With the outbox, the relay crashes after publishing but before marking the row. Consumers will…', options: ['Never see the event', 'See it twice and must de-duplicate by eventId', 'See it out of order', 'Receive a corrupted event'], answer: 1, why: 'At-least-once delivery: duplicates are expected, so consumers are idempotent (inbox table).' },
    { q: 'Three relay instances poll the same outbox. How do you avoid publishing each row three times?', options: ['synchronized keyword', 'SELECT … FOR UPDATE SKIP LOCKED, or a single leader', 'Bigger batch size', 'Disable two instances in config only'], answer: 1, why: 'synchronized works within one JVM only. Row claiming or leader election works across instances.' },
    { q: 'A process manager should own…', options: ['Domain invariants of the cases it touches', 'Process state, timeouts and the decision of what to do when a step fails', 'The database transactions of other services', 'The UI'], answer: 1, why: 'Domain rules stay in aggregates; the process manager coordinates.' },
    { q: 'You must rename <code>closedBy</code> to <code>closedByAnalystId</code> in a published event. Correct approach?', options: ['Rename it; consumers will adapt', 'Add the new field, publish both during deprecation, then bump schemaVersion and remove the old one', 'Create a new topic immediately and delete the old', 'Change the meaning of closedBy instead'], answer: 1, why: 'Expand-and-contract keeps consumers working while they migrate.' },
    { q: 'Why return 404 rather than 403 for another tenant\'s case?', options: ['403 is deprecated', 'To avoid revealing that the case exists', 'Micronaut cannot send 403', 'Because of CORS'], answer: 1, why: 'Existence itself is information. 404 leaks nothing.' },
  ]);
})();
