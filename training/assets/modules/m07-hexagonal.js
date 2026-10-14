(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'hexagonal', num: 7, level: 'Practitioner', minutes: 70,
    title: 'Hexagonal architecture: ports, adapters and the dependency rule',
    lead: 'How to put a wall around the domain model so that frameworks, databases and protocols can change without touching it.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Draw the hexagon from memory and name every part for the screening service.</li>
<li>Distinguish driving (primary) and driven (secondary) ports and adapters.</li>
<li>Apply the dependency rule and dependency inversion.</li>
<li>Design use-case-shaped ports and explain the UnitOfWork port trade-off.</li>
<li>Compare hexagonal, onion and clean architecture without dogma.</li>
</ul></div>

<h3>The idea in one sentence</h3>
<p>Alistair Cockburn (2005): <i>"Allow an application to equally be driven by users, programs, automated test or batch scripts, and to be developed and tested in isolation from its eventual run-time devices and databases."</i> The application talks to the outside world only through <b>ports</b> (interfaces it owns); <b>adapters</b> plug technology into those ports.</p>
${fig('06-hexagon-ports-adapters', 'The screening service as a hexagon. Driving adapters on the left call port.in interfaces; the application calls port.out interfaces on the right, implemented by driven adapters.')}
<p>The shape has no meaning – six sides just leave room to draw many ports. What matters is <b>inside vs outside</b>.</p>

<h3>Driving and driven</h3>
<table>
<tr><th></th><th>Driving side (primary, left)</th><th>Driven side (secondary, right)</th></tr>
<tr><td>Who starts the conversation</td><td>The outside world calls the application</td><td>The application calls the outside world</td></tr>
<tr><td>Port</td><td><code>port.in</code>: use-case interfaces, e.g. <code>OpenCaseUseCase</code></td><td><code>port.out</code>: needs, e.g. <code>CaseRepository</code>, <code>ReferenceDataSource</code></td></tr>
<tr><td>Who implements the port</td><td>The application (<code>CaseApplicationService</code>)</td><td>An adapter (<code>JdbcCaseRepository</code>)</td></tr>
<tr><td>Adapters in the lab</td><td><code>CaseController</code> (REST), tests, a scheduler</td><td>JDBC repository, outbox appender, unit of work, reference-data clients, event sinks</td></tr>
</table>

<h3>The dependency rule</h3>
<div class="callout rule"><strong>Source-code dependencies point inward only</strong><p>Adapters depend on the application; the application depends on the domain; the domain depends on nothing but the JDK. Nothing inside may name anything outside – no class, no annotation, no exception type.</p></div>
<p>How can the application call a database if it may not depend on it? <b>Dependency inversion</b>: the application declares the interface it needs; the adapter implements it; something at startup (the composition root) connects them.</p>
${code('java', String.raw`
// INSIDE: application/port/out – owned by the application, in its language
/**
 * Driven port to the risk-intelligence corpus (another bounded context). Returns a short list of
 * candidates worth scoring; the domain decides which of them are matches.
 */
public interface ReferenceDataSource {

    List<ReferenceProfile> candidatesFor(Party party);
}

// OUTSIDE: adapter/out/reference – depends inward on the port and the domain
@Singleton
@Requires(property = "screening.reference-data.mode", value = "http")
class HttpReferenceDataSource implements ReferenceDataSource {
    private final ReferenceDataClient client;           // Micronaut declarative HTTP client
    @Override
    public List<ReferenceProfile> candidatesFor(Party party) {
        String type = party.type() == EntityType.INDIVIDUAL ? "P" : "E";
        return client.candidates(party.name().value(), type).stream()
                .map(this::translate)                    // anti-corruption layer
                .filter(Objects::nonNull)
                .toList();
    }
}`)}

<h3>Watch it work, then swap adapters</h3>
<p>Run a use case, step through the trace, then change the driving adapter or the configuration. Count how many domain and application files change.</p>
<div data-sim="hex-flow"></div>

<h3>Designing ports well</h3>
<h4>Driving ports: one per use case, with commands</h4>
${code('java', String.raw`
/** Driving port: open a new screening case for a party. */
public interface OpenCaseUseCase {

    CaseView open(OpenCaseCommand command);

    record OpenCaseCommand(ClientGroupId clientGroup, Party party, String idempotencyKey) {
        public OpenCaseCommand {
            Objects.requireNonNull(clientGroup, "client group");
            Objects.requireNonNull(party, "party");
            idempotencyKey = idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.strip();
        }
    }
}`, 'application/port/in/OpenCaseUseCase.java')}
<ul>
<li><b>Commands</b> carry domain types (value objects), already validated. The adapter builds them.</li>
<li><b>Views</b> (<code>CaseView</code>) go back out: read-only data for adapters, so adapters never hold the live aggregate and cannot call its methods.</li>
<li>Small, use-case-named interfaces (<code>OpenCaseUseCase</code>, <code>CloseCaseUseCase</code>) instead of one <code>CaseService</code> interface: each adapter depends only on what it uses (interface segregation), and tests read like the business.</li>
</ul>
<h4>Driven ports: shaped by the need, not the technology</h4>
<ul>
<li><code>ReferenceDataSource.candidatesFor(Party)</code> – not <code>HttpGet(url)</code>, not <code>searchIndex(query)</code>.</li>
<li><code>DomainEventOutbox.append(List&lt;DomainEvent&gt;)</code> – not <code>KafkaProducer.send</code>.</li>
<li>Exceptions are part of the port: <code>ConcurrentCaseUpdateException</code> lives in <code>port.out</code>, so the application can handle it without knowing about JDBC's <code>OptimisticLockException</code>.</li>
</ul>

<h4>The UnitOfWork port – a deliberate trade-off</h4>
${code('java', String.raw`
/**
 * Driven port for transaction boundaries. The application layer decides where a transaction starts and
 * ends; the adapter decides how (JDBC, JTA, nothing at all in unit tests).
 */
public interface UnitOfWork {
    <T> T write(Supplier<T> work);
    <T> T read(Supplier<T> work);
}`, 'application/port/out/UnitOfWork.java')}
<p>Many teams put <code>@Transactional</code> on the application service. That couples the application ring to the framework, and hides an important design decision in an annotation. The code lab makes the boundary explicit and testable: <code>CaseApplicationServiceTest</code> proves that reference data is fetched <i>outside</i> the write transaction and that a rule violation rolls back the outbox rows too.</p>
<div class="callout expert"><strong>When @Transactional is acceptable</strong><p>If your team accepts framework annotations in the application ring (a pragmatic choice in many shops), <code>@Transactional</code> on use-case methods is fine – but then encode it as an ArchUnit rule ("only application services may be @Transactional") so it does not spread into adapters and the domain.</p></div>

<h3>The composition root</h3>
<p>Someone must know every concrete class to connect them. In the lab that is one Micronaut <code>@Factory</code> in <code>config</code> – the only package allowed to see every ring:</p>
${code('java', String.raw`
@Factory
public class ApplicationWiring {

    @Singleton
    Clock clock() {
        return Clock.systemUTC();
    }

    @Singleton
    NameMatchingPolicy nameMatchingPolicy(MatchingProperties properties) {
        return new NameMatchingPolicy(properties.threshold());
    }

    @Singleton
    CaseApplicationService caseApplicationService(CaseRepository cases, IdempotencyStore idempotency,
                                                  ReferenceDataSource referenceData, DomainEventOutbox outbox,
                                                  UnitOfWork unitOfWork, NameMatchingPolicy policy, Clock clock) {
        return new CaseApplicationService(cases, idempotency, referenceData, outbox, unitOfWork, policy, clock);
    }
}`, 'config/ApplicationWiring.java')}
<p>Micronaut finds an implementation for each port parameter (adapters are <code>@Singleton</code>, chosen by <code>@Requires</code>) and registers the returned service under all five use-case interfaces it implements. Module 9 explains exactly how.</p>

<h3>Hexagonal, onion, clean – same idea, different drawings</h3>
<table>
<tr><th></th><th>Hexagonal (Cockburn 2005)</th><th>Onion (Palermo 2008)</th><th>Clean (Martin 2012)</th></tr>
<tr><td>Emphasis</td><td>Inside vs outside; symmetric ports for driving and driven sides</td><td>Concentric rings: domain model → domain services → application services → infrastructure</td><td>Entities → use cases → interface adapters → frameworks; one use case per class</td></tr>
<tr><td>Shared rule</td><td colspan="3">Dependencies point inward; infrastructure is a detail behind interfaces owned by the inner rings.</td></tr>
</table>
<p>The code lab uses hexagonal vocabulary for the edges and onion rings for the inside (domain → application). ArchUnit's <code>onionArchitecture()</code> checks it. Do not waste team energy arguing which drawing is "correct"; agree on the dependency rule and enforce it.</p>

<div class="callout pitfall"><strong>Common mistakes</strong><ul>
<li><b>Ports that mirror technology</b>: <code>JdbcPort</code>, <code>KafkaPort</code>. Name ports after the need.</li>
<li><b>Adapters calling adapters</b>: controller → repository directly. Everything goes through a use case.</li>
<li><b>Returning the aggregate to the controller</b>: the adapter can now call <code>close()</code> outside a transaction. Return views.</li>
<li><b>Interfaces for everything</b>: the domain's own classes (value objects, the aggregate, the policy) need no interfaces. Ports exist only at the boundary.</li>
</ul></div>

<div data-quiz="m07"></div>
`,
  });

  Course.quiz('m07', [
    { q: 'Who owns (declares) the <code>CaseRepository</code> interface?', options: ['The JDBC adapter', 'Micronaut Data', 'The application (port.out)', 'The domain model'], answer: 2, why: 'Driven ports are owned by the application and expressed in its language; adapters implement them.' },
    { q: 'A JUnit test calling <code>service.open(command)</code> directly is…', options: ['Not allowed in hexagonal architecture', 'A driving adapter', 'A driven adapter', 'Part of the domain'], answer: 1, why: 'Anything that drives the application through a port.in is a driving adapter – tests included. That is Cockburn\'s original motivation.' },
    { q: 'Why does the application service return <code>CaseView</code> instead of <code>ScreeningCase</code>?', options: ['Views are faster to serialise', 'So adapters cannot call aggregate behaviour outside the use case and its transaction', 'Micronaut cannot serialise classes', 'Because ScreeningCase is package-private'], answer: 1, why: 'Views are read-only data. Handing out the live aggregate invites changes that bypass the use case.' },
    { q: 'Which port name is best?', options: ['KafkaPort', 'DomainEventOutbox.append(events)', 'MessagingAdapterInterface', 'EventDao'], answer: 1, why: 'Ports are named after what the application needs, not the technology behind them.' },
    { q: 'Where is the only place allowed to reference every ring?', options: ['The controller', 'The domain', 'The composition root (config.ApplicationWiring)', 'The application service'], answer: 2, why: 'The composition root wires concrete classes; ArchUnit explicitly exempts config.' },
  ]);
})();
