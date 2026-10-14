(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'boundaries', num: 9, level: 'Practitioner', minutes: 75,
    title: 'Crossing boundaries: control flow vs source dependencies',
    lead: 'The defining trick of Clean Architecture: at runtime, calls go outward to the database and the presenter; at compile time, every arrow points inward. Polymorphism is how both are true at once.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Draw the flow of control and the source-code dependencies of a request and show where they point in opposite directions.</li>
<li>Explain what a boundary is made of: an interface on the inner side, an implementation on the outer side, plain data across.</li>
<li>Choose between a full boundary and the three partial boundaries – and know what each costs and risks.</li>
<li>Follow one request through the four rings in the simulator, with three different delivery mechanisms.</li>
</ul></div>

<h3>The picture in the corner of the book</h3>
<p>In the bottom-right corner of Uncle Bob's famous diagram is a small sketch: Controller → Use Case Input Port → Use Case Interactor → Use Case Output Port → Presenter. The flow of control goes from the controller, through the interactor, out to the presenter. But the interactor does not know the presenter: it calls an <b>interface it owns</b>, which the presenter implements.</p>
${fig('02-control-vs-dependency', 'Orange: what calls what at runtime. Black: what imports what at compile time. At both outward calls – to the gateway and to the presenter – the source dependency is inverted.')}
<div class="callout rule"><strong>The rule of the boundary</strong><p>Whenever control must flow from an inner ring to an outer ring, the inner ring declares an interface and the outer ring implements it. Data that crosses is a simple structure in the form the <b>inner</b> ring finds convenient.</p></div>

<h3>Try it: three designs, one build</h3>
<div data-sim="control-vs-dependency"></div>

<h3>What a boundary is made of in the lab</h3>
<table>
<tr><th>Crossing</th><th>Inner side declares</th><th>Outer side implements / calls</th><th>Data</th></tr>
<tr><td>3 → 2 (driving)</td><td><code>CloseCase</code> input boundary</td><td><code>CaseController</code> calls it</td><td><code>CloseCaseRequest</code></td></tr>
<tr><td>2 → 3 (presenting)</td><td><code>CaseOutputBoundary</code></td><td><code>CasePresenter</code> implements it</td><td><code>CaseResponse</code>, rule codes</td></tr>
<tr><td>2 → 3 (storing)</td><td><code>CaseGateway</code></td><td><code>SqlCaseGateway</code></td><td>the aggregate (ring 1, allowed: inward)</td></tr>
<tr><td>3 → 4 (storing)</td><td><code>CaseRecords</code></td><td><code>MicronautCaseRecords</code></td><td><code>CaseRecord</code>, <code>MatchRecord</code></td></tr>
<tr><td>2 → 4 (transactions)</td><td><code>TransactionRunner</code></td><td><code>MicronautTransactionRunner</code></td><td>a <code>Supplier</code></td></tr>
<tr><td>3 → 4 (publishing)</td><td><code>IntegrationEventSink</code></td><td><code>LoggingEventSink</code> (or Kafka)</td><td><code>IntegrationEvent</code></td></tr>
</table>
<p>Notice the gateway passes the aggregate. That is allowed: <code>SqlCaseGateway</code> is in ring 3 and may depend on ring 1. What is not allowed is the reverse – an entity accepting a <code>CaseRecord</code>.</p>

<h3>Follow one request, three ways</h3>
<p>The simulator below runs the browser model of the lab. Pick a delivery mechanism and a request, then step through. Watch the ring tags, and the <b>DIP</b> badge every time control crosses outward through an interface. The same interactor runs for the web, a CLI and a unit test.</p>
<div data-sim="clean-flow"></div>
${fig('09-request-sequence', 'POST …/closure through every ring. The presenter runs after commit or rollback; the endpoint only copies the view model.')}

<h3>Partial boundaries</h3>
<p>A full boundary – reciprocal interfaces, request and response models, a separate module – is expensive to build and maintain. Uncle Bob describes three cheaper ways to keep the option open:</p>
${fig('15-partial-boundaries', 'Four levels of boundary, from the lab\'s full boundary to a facade. Pick per context, not per company.')}
<table>
<tr><th>Option</th><th>What you keep</th><th>What you risk</th><th>Good for</th></tr>
<tr><td><b>Full boundary</b> (the lab)</td><td>Everything: independent compile, deploy, test</td><td>Most code</td><td>Core domain, several delivery mechanisms, regulated rules</td></tr>
<tr><td><b>Skip the last step</b></td><td>All interfaces and models, one module</td><td>Erosion: nothing stops an import except ArchUnit</td><td>A new service whose boundaries still move</td></tr>
<tr><td><b>One-dimensional boundary</b></td><td>A Strategy interface for one direction only (<code>ReferenceDataGateway</code>)</td><td>No reciprocal boundary; return values instead of presenters</td><td>A seam for testing or one swap</td></tr>
<tr><td><b>Facade</b></td><td>One class in front of the use cases</td><td>Clients still depend transitively on everything behind it</td><td>Supporting subdomains</td></tr>
</table>
<div class="callout lead"><strong>Architects decide boundaries; they do not decide "always"</strong><p>Uncle Bob is explicit: anticipating every boundary is expensive, ignoring them is too. Watch for the first sign of friction – a second delivery mechanism, a test that needs a database, two teams editing one module – and then pay for the boundary. The lab has a full boundary everywhere because it is a teaching system.</p></div>

<h3>Services are not boundaries</h3>
<p>"We use microservices, so we are decoupled" is the <b>decoupling fallacy</b>. Two services that share a data model, change together and break each other's deploys are one component split over the network. Architectural boundaries run <i>through</i> services as well as between them: a well-designed service has its own rings inside (module 14 connects two of them).</p>

<div data-quiz="m09"></div>
`,
  });

  Course.quiz('m09', [
    { q: 'At runtime, ScreenCaseInteractor calls SqlCaseGateway. Which way does the source-code dependency point?', options: ['From the interactor to SqlCaseGateway', 'From SqlCaseGateway to CaseGateway, an interface owned by the use cases ring', 'There is none', 'From the entities to SqlCaseGateway'], answer: 1, why: 'Control flows outward; the dependency is inverted through the gateway interface ring 2 declares.' },
    { q: 'Which of these may cross from ring 2 to ring 3 through the output boundary?', options: ['The ScreeningCase aggregate', 'A DomainException', 'CaseResponse and plain rule codes', 'A Micronaut HttpResponse'], answer: 2, why: 'Only plain data structures cross outward. Entities and their exceptions stay inside.' },
    { q: 'Your team builds the interfaces and models but keeps everything in one Maven module. Which partial boundary is this, and what is the main risk?', options: ['Facade; transitive dependencies', 'Skip the last step; erosion, because nothing but ArchUnit stops a wrong import', 'One-dimensional; no reciprocity', 'Full boundary; no risk'], answer: 1, why: 'All the parts exist, but the compiler no longer enforces the rule.' },
    { q: 'Why may <code>SqlCaseGateway.save</code> take a <code>ScreeningCase</code>?', options: ['It may not', 'Ring 3 may depend on ring 1 – the dependency points inward', 'Because it is in the same module', 'Because the aggregate is serialisable'], answer: 1, why: 'Depending inward is always fine. The aggregate taking a CaseRecord would be the violation.' },
    { q: 'Two microservices share a "Case" JSON model and must be deployed together. This shows…', options: ['Good decoupling', 'The decoupling fallacy: a network boundary is not an architectural boundary', 'Clean Architecture', 'A partial boundary'], answer: 1, why: 'Coupling through shared data and coordinated releases makes them one component.' },
  ]);
})();
