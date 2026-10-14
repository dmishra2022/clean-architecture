(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'strategic', num: 4, level: 'Foundation', minutes: 60,
    title: 'Strategic DDD: subdomains, bounded contexts and where the rings go',
    lead: 'Clean Architecture says how to arrange one system. Domain-Driven Design says where one system ends and the next begins. Get the boundaries wrong and perfect rings will not save you.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Classify subdomains as core, supporting or generic and decide where to invest Clean Architecture's ceremony.</li>
<li>Find bounded-context boundaries by following how the meaning of a word changes.</li>
<li>Use context-map patterns (ACL, open host service, published language, customer/supplier, conformist) and point to the ring-3 class that implements each one.</li>
<li>Run a short Event Storming and map each sticky colour to a ring.</li>
</ul></div>

<h3>Why DDD and Clean Architecture fit together</h3>
<p>Uncle Bob is precise about the <i>inside</i> of a system and deliberately vague about the domain model: an entity is "an object with methods, or a set of data structures and functions" that holds enterprise business rules. DDD fills that gap. It gives ring 1 a vocabulary (aggregate, value object, domain event, domain service) and gives the whole system its <b>outer boundary</b>: one bounded context, one ubiquitous language, one set of rings.</p>
<table>
<tr><th>DDD concept</th><th>Lands in</th></tr>
<tr><td>Ubiquitous language, aggregates, value objects, domain events, domain services</td><td><span class="ring-tag ring-entity">1 · ENTITIES</span></td></tr>
<tr><td>Application services, commands, queries, read models, process managers</td><td><span class="ring-tag ring-usecase">2 · USE CASES</span> (interactors, request models, response models)</td></tr>
<tr><td>Anti-corruption layer, open host service, published language, repositories (implementation)</td><td><span class="ring-tag ring-iadapter">3 · INTERFACE ADAPTERS</span></td></tr>
<tr><td>Message brokers, databases, HTTP, schedulers</td><td><span class="ring-tag ring-framework">4 · FRAMEWORKS &amp; DRIVERS</span></td></tr>
<tr><td>Bounded context</td><td>the whole four-ring system (one deployable or one module set)</td></tr>
</table>

<h3>Subdomains: where is the money?</h3>
${fig('06-subdomains-components', 'World-Check-style subdomains. Core subdomains earn full Clean Architecture; supporting and generic ones often deserve partial boundaries or a bought product.')}
<ul>
<li><b>Core</b> – the reason customers pay: Screening &amp; Case, Risk Intelligence Data, Ongoing Monitoring. Invest the best people, full rings, rich models.</li>
<li><b>Supporting</b> – necessary, specific to us, not a differentiator: Client &amp; Entitlements, Audit &amp; Reporting. Simpler designs; a partial boundary is often enough (module 9).</li>
<li><b>Generic</b> – everyone has it: Notifications, identity. Buy, or use the framework directly.</li>
</ul>
<div class="callout lead"><strong>Architect's rule of thumb</strong><p>The full ceremony – four modules, request/response models, presenters – is a cost you pay in the core. Spending it on a notifications service is how teams learn to hate Clean Architecture.</p></div>

<h3>Bounded contexts: follow the words</h3>
<p>A bounded context is the boundary inside which one model and one language are consistent. You find it by noticing that a word means something different on the other side. "Match" in Screening is an entity with a resolution; in Monitoring it is an alert trigger; in Risk Intelligence the word is not used at all. One shared <code>Match</code> class would be wrong for at least two teams.</p>
<div data-sim="context-map"></div>

<h3>Context-map patterns, implemented in ring 3</h3>
<p>In Clean Architecture every integration pattern becomes an <b>interface adapter</b>. The use cases see only the gateway interface they declared; the shape of the outside world stops at ring 3.</p>
<table>
<tr><th>Pattern</th><th>Meaning</th><th>Lab class</th></tr>
<tr><td>Anti-corruption layer</td><td>Translate the upstream model into ours at the border.</td><td><code>ProfileTranslator</code>, <code>RemoteReferenceData</code></td></tr>
<tr><td>Open host service</td><td>A well-defined protocol others can use.</td><td><code>CaseController</code> + <code>CaseEndpoint</code> (<code>/api/v1</code>)</td></tr>
<tr><td>Published language</td><td>A documented, versioned exchange format.</td><td><code>EventJson</code> (schemaVersion 1), <code>CaseJson</code></td></tr>
<tr><td>Customer / supplier</td><td>Downstream needs drive upstream priorities.</td><td>would be a new gateway, e.g. <code>EntitlementsGateway</code></td></tr>
<tr><td>Conformist</td><td>Downstream adopts upstream's model as-is.</td><td>Audit consumes our events unchanged</td></tr>
</table>
${code('java', String.raw`
/** Gateway to the remote reference-data service: call the API, translate every record at the border. */
public final class RemoteReferenceData implements ReferenceDataGateway {

    private final ReferenceDataApi api;
    private final ProfileTranslator translator;

    @Override
    public List<ReferenceProfile> candidatesFor(Party party) {
        return api.candidates(party.name().value(), ProfileTranslator.upstreamTypeOf(party.type())).stream()
                .map(translator::translate)
                .flatMap(Optional::stream)
                .toList();
    }
}`, 'screening-interface-adapters/…/reference/RemoteReferenceData.java')}
<p>Note what is <i>not</i> here: no Micronaut <code>@Client</code>. <code>ReferenceDataApi</code> is a plain interface in ring 3; ring 4 implements it with Micronaut's declarative HTTP client. The translation is unit-tested in <code>ReferenceDataTest</code> without a server.</p>

<h3>Event Storming: discovering the model</h3>
<p>Event Storming is a workshop where domain experts and developers put orange sticky notes – domain events, past tense – on a long wall, then add the commands that cause them, the aggregates that decide, the policies that react and the read models people look at. It is the fastest way to find aggregates and context boundaries. Each colour later maps to a ring:</p>
<table>
<tr><th>Sticky</th><th>Becomes</th></tr>
<tr><td style="background:#F4A261">Domain event</td><td>sealed <code>DomainEvent</code> record in ring 1, then a published-language row in the outbox (ring 3)</td></tr>
<tr><td style="background:#7EC8E3">Command</td><td>request model + input boundary in ring 2 (<code>ResolveMatchRequest</code>, <code>ResolveMatch</code>)</td></tr>
<tr><td style="background:#FFE066">Aggregate</td><td>aggregate root in ring 1 (<code>ScreeningCase</code>)</td></tr>
<tr><td style="background:#C3AED6">Policy</td><td>interactor or process manager in ring 2</td></tr>
<tr><td style="background:#9BE7A0">Read model</td><td>query interactor + response model in ring 2 (<code>ListWorkQueue</code>)</td></tr>
<tr><td style="background:#F7A1C4">External system</td><td>gateway interface in ring 2, adapter in ring 3</td></tr>
</table>
<div data-sim="event-storming"></div>

<div data-quiz="m04"></div>
`,
  });

  Course.quiz('m04', [
    { q: 'Where does an anti-corruption layer live in Clean Architecture?', options: ['In the entities', 'In the interface adapters ring, behind a gateway interface declared by the use cases', 'In the Micronaut configuration', 'In the database'], answer: 1, why: 'ProfileTranslator and RemoteReferenceData are ring-3 classes implementing ReferenceDataGateway.' },
    { q: 'How do you usually discover a bounded-context boundary?', options: ['One per database table', 'One per team member', 'A word changes meaning, so one model cannot serve both sides', 'One per REST endpoint'], answer: 2, why: 'Language is the signal. When "Match" means different things, you have two models and need a boundary.' },
    { q: 'Notifications is a generic subdomain. What is the most sensible architecture?', options: ['Full four-ring Clean Architecture with presenters', 'Buy a product or use the framework directly; keep it thin', 'Put it inside ScreeningCase', 'Share the Screening entities jar'], answer: 1, why: 'Spend the ceremony in the core. Generic subdomains are better bought or kept simple.' },
    { q: 'An orange sticky "Match Resolved" maps to…', options: ['A sealed DomainEvent record in ring 1', 'A controller method', 'A database trigger', 'A presenter'], answer: 0, why: 'Domain events are business facts raised by the aggregate in ring 1.' },
    { q: 'What is one bounded context in Clean Architecture terms?', options: ['One ring', 'One class', 'One whole four-ring system with its own language', 'One Maven module'], answer: 2, why: 'Rings structure a context internally; the context is the outer boundary of the language.' },
  ]);
})();
