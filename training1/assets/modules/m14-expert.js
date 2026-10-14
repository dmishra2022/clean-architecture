(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'expert', num: 14, level: 'Expert', minutes: 100,
    title: 'Expert topics: outbox, processes, versioning, tenancy, performance',
    lead: 'The hard problems of a real screening platform – events that must not be lost, processes that span services, contracts that evolve, tenants that must never see each other – and where each solution sits in the rings.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain the dual-write problem and why the outbox spans rings 2, 3 and 4 the way it does.</li>
<li>Design a process manager between two Clean services with idempotent steps and no distributed transaction.</li>
<li>Version request models, view models and the published language independently.</li>
<li>Defend the tenancy design and know the next step (row-level security, per-tenant keys).</li>
<li>Find and remove the performance costs Clean Architecture is accused of.</li>
</ul></div>

<h3>1 · The transactional outbox, ring by ring</h3>
${fig('13-outbox', 'Ring 2 says what must be atomic; ring 3 writes the published language and runs the relay policy; ring 4 provides the transaction, the table and the schedule.')}
<table>
<tr><th>Ring</th><th>Knows</th><th>Class</th></tr>
<tr><td><span class="ring-tag ring-usecase">2</span></td><td>State and events must commit together</td><td><code>TransactionRunner</code>, <code>EventOutboxGateway</code> (Javadoc: "must write in the caller's transaction")</td></tr>
<tr><td><span class="ring-tag ring-iadapter">3</span></td><td>Event → JSON v1; relay policy: oldest first, batch 100, stop at first failure</td><td><code>OutboxEventGateway</code>, <code>EventJson</code>, <code>OutboxRelay</code></td></tr>
<tr><td><span class="ring-tag ring-framework">4</span></td><td>JDBC transaction, <code>outbox_event</code> table, every 2 s, where events go</td><td><code>MicronautTransactionRunner</code>, <code>MicronautOutboxRecords</code>, <code>ScheduledOutboxRelay</code>, <code>LoggingEventSink</code></td></tr>
</table>
${code('java', String.raw`
/** Returns how many events were delivered. Stops at the first failure so ordering is preserved. */
public synchronized int publishPending() {
    List<OutboxRecord> batch = records.findUnpublished(BATCH);
    int delivered = 0;
    for (OutboxRecord row : batch) {
        try {
            sink.publish(new IntegrationEvent(row.id(), row.eventType(), row.aggregateId(), row.clientGroupId(),
                    row.occurredAt(), row.payload()));
        } catch (RuntimeException e) {
            LOG.log(System.Logger.Level.WARNING, "Outbox delivery failed for event " + row.id() + "; will retry", e);
            break;
        }
        records.markPublished(row.id(), clock.instant());
        delivered++;
    }
    return delivered;
}`, 'screening-interface-adapters/…/events/OutboxRelay.java')}
<div data-sim="outbox-crash"></div>
<div class="callout expert"><strong>Scaling the relay</strong><p>With several instances, two relays would publish the same rows. Claim rows with <code>SELECT … FOR UPDATE SKIP LOCKED</code> inside <code>OutboxRecords.findUnpublished</code> (ring 4) – the relay policy in ring 3 does not change. Or replace the relay with change-data capture (Debezium) reading <code>outbox_event</code>: then the relay and scheduler disappear and only ring 4 changes.</p></div>

<h3>2 · Processes across services: a process manager</h3>
<p>When a reference profile changes, Ongoing Monitoring must rescreen every affected case and alert clients about new matches. That spans two bounded contexts, so it cannot be one transaction. It is a <b>process manager</b>: a use case of the Monitoring service that keeps its own state and reaches Screening through a gateway.</p>
${fig('16-process-manager', 'Each service keeps its own rings. Monitoring\'s use case calls Screening through a gateway; Screening\'s answer comes back as a published event.')}
<ul>
<li><b>Inbox de-duplication:</b> store processed event ids; a redelivered <code>ProfileUpdated</code> is acknowledged and ignored.</li>
<li><b>Idempotent commands:</b> rescreening the same case twice is harmless (invariant 2: one match per profile, earlier resolutions kept).</li>
<li><b>Business refusals are outcomes:</b> a CLOSED case answers <code>CASE_CLOSED</code>; the process manager records it and decides – perhaps "reopen review" is a new use case, not a retry.</li>
<li><b>Retries with backoff</b> for technical failures only; the state (<code>RescreenRun</code>: pending, done, failed) survives restarts.</li>
</ul>
<div data-sim="saga"></div>

<h3>3 · Versioning: three contracts, three speeds</h3>
<table>
<tr><th>Contract</th><th>Ring</th><th>Changes when</th><th>Strategy</th></tr>
<tr><td>Request / response models</td><td>2</td><td>a use case changes</td><td>Internal: refactor freely; all callers compile together.</td></tr>
<tr><td>REST view models (<code>CaseJson</code>, <code>ProblemJson</code>)</td><td>3</td><td>clients need new fields</td><td>Additive changes in v1; a v2 presenter + controller for breaking ones. Both presenters call the same interactors.</td></tr>
<tr><td>Published language (<code>EventJson</code>)</td><td>3</td><td>consumers need more</td><td>Add fields freely; breaking changes bump <code>schemaVersion</code> and are published side by side until consumers move.</td></tr>
</table>
<p>This is a concrete benefit of response models: <code>CaseJson v2</code> can rename <code>statusLabel</code> without touching the interactor, and the entities can rename a field without breaking <code>CaseJson v1</code>.</p>

<h3>4 · Multi-tenancy</h3>
<p>The client group comes from the URL into every request model; <code>CaseLookup</code> makes another tenant's case indistinguishable from a missing one (no existence oracle); idempotency keys are scoped per client group; the work-queue query filters by client group in SQL. Next steps on a real platform:</p>
<ul>
<li>Take the client group from the authenticated principal in ring 4, not from the URL, and pass it in the request model – ring 2 does not change.</li>
<li>Add database row-level security as defence in depth; the gateway keeps filtering.</li>
<li>Never cache presenters or view models across requests (module 11's tenant leak).</li>
</ul>

<h3>5 · "Clean Architecture is slow" – what actually costs</h3>
<table>
<tr><th>Claimed cost</th><th>Reality in the lab</th><th>If it matters</th></tr>
<tr><td>Mapping objects ring to ring</td><td>Microseconds per request; the database round trip is milliseconds.</td><td>Measure first. Records and <code>List.copyOf</code> are cheap.</td></tr>
<tr><td>Rehydrating aggregates for lists</td><td>Avoided: <code>JdbcWorkQueueGateway</code> reads two queries straight into a read model.</td><td>Reads may bypass the entities; writes never do.</td></tr>
<tr><td><code>SqlCaseGateway.save</code> re-reads matches</td><td>One extra query per write – fine at analyst speed.</td><td>Track dirty matches in the snapshot, or batch upserts in ring 4.</td></tr>
<tr><td>Interface dispatch</td><td>JIT inlines monomorphic calls.</td><td>Never the bottleneck.</td></tr>
</table>

<div data-quiz="m14"></div>
`,
  });

  Course.quiz('m14', [
    { q: 'Which ring decides that state and events must be committed atomically?', options: ['Ring 1, the aggregate', 'Ring 2: the interactor writes both inside transactions.write, and EventOutboxGateway\'s contract requires the caller\'s transaction', 'Ring 3, the relay', 'Ring 4, H2'], answer: 1, why: 'Atomicity is an application rule. How it is achieved (JDBC, one connection) is ring 4.' },
    { q: 'The relay crashes after sink.publish but before markPublished. On restart…', options: ['The event is lost', 'The event is published again; consumers de-duplicate on eventId', 'The case is rolled back', 'The relay skips it'], answer: 1, why: 'The outbox gives at-least-once delivery. Idempotent consumers make it effectively once.' },
    { q: 'You run three instances of the service. What changes to stop double publishing?', options: ['OutboxRelay\'s policy', 'The interactors', 'OutboxRecords.findUnpublished in ring 4 claims rows with FOR UPDATE SKIP LOCKED', 'Nothing can be done'], answer: 2, why: 'The claim mechanism is a database detail; the ring-3 policy stays the same.' },
    { q: 'Monitoring asks Screening to rescreen a CLOSED case and gets CASE_CLOSED. The process manager should…', options: ['Retry with backoff forever', 'Record it as a business outcome and decide (e.g. skip, or start a separate "reopen" use case)', 'Delete the case', 'Ignore the profile update'], answer: 1, why: 'Business refusals are outcomes, not technical failures. Retries are for technical failures only.' },
    { q: 'Clients need a breaking change to the case JSON. The cleanest approach is…', options: ['Change CaseResponse and ScreeningCase', 'Add a v2 presenter and controller in ring 3 and a v2 endpoint in ring 4, calling the same interactors', 'Change EventJson', 'Add a flag to every entity'], answer: 1, why: 'View models are owned by ring 3; the use cases and entities do not change.' },
  ]);
})();
