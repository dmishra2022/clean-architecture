(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'components', num: 3, level: 'Foundation', minutes: 60,
    title: 'Component principles: cohesion, coupling and the main sequence',
    lead: 'SOLID tells you how to arrange classes. The six component principles tell you how to group classes into jars and how those jars may depend on each other. They explain why the lab has exactly four Maven modules.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Use REP, CCP and CRP to decide which classes belong in the same component – and explain the tension between them.</li>
<li>Use ADP, SDP and SAP to judge whether a dependency between components is healthy.</li>
<li>Compute instability (I), abstractness (A) and distance from the main sequence (D) for a module.</li>
<li>Read the lab's numbers and say why the entities can sit in the "zone of pain" safely.</li>
</ul></div>

<h3>What is a component?</h3>
<p>A component is the smallest unit you can deploy and version on its own – in Java, a jar, which in the lab is a Maven module. Components are where the dependency rule stops being a convention and becomes something the compiler enforces: <code>screening-entities</code> has no dependency on <code>screening-usecases</code> in its <code>pom.xml</code>, so it <i>cannot</i> import a use case.</p>
${fig('05-module-graph', 'The lab\'s four Maven modules. Arrows are &lt;dependency&gt; entries. Every arrow points inward; the graph has no cycles.')}

<h3>Cohesion: which classes go together?</h3>
<table>
<tr><th>Principle</th><th>Says</th><th>In the lab</th></tr>
<tr><td><b>REP</b> – Reuse/Release Equivalence</td><td>The unit of reuse is the unit of release. Classes in a component should make sense to release together, under one version number.</td><td>Each ring is released as one jar; you cannot take <code>ScreeningCase</code> without <code>MatchScore</code>.</td></tr>
<tr><td><b>CCP</b> – Common Closure</td><td>Gather classes that change for the same reasons at the same time. SRP for components.</td><td><code>WorkQueueGateway</code>, <code>WorkQueueEntry</code> and <code>ListWorkQueueInteractor</code> share the <code>workqueue</code> package.</td></tr>
<tr><td><b>CRP</b> – Common Reuse</td><td>Don't force users of a component to depend on things they don't need. ISP for components.</td><td>The web adapters never depend on the entities jar's internals – they see only <code>CaseResponse</code>.</td></tr>
</table>
<p>The three pull against each other. REP and CCP make components bigger (convenient to release and change); CRP makes them smaller (fewer unneeded dependencies). Early in a project, CCP dominates – you want each change in as few places as possible. As others start to reuse your code, REP and CRP gain weight. The lab's four modules are a deliberate CCP-first choice: one module per <i>reason to change</i> – enterprise rules, application rules, format conversion, technology.</p>

<h3>Coupling: which dependencies are allowed?</h3>
${fig('04-component-principles', 'Left: the cohesion tension triangle. Right: the four modules on the A/I chart – entities in the zone of pain, the framework near the zone of uselessness, both for good reasons.')}
<ul>
<li><b>ADP – Acyclic Dependencies.</b> No cycles in the component graph. Maven enforces it for you: a cycle fails the reactor build.</li>
<li><b>SDP – Stable Dependencies.</b> Depend in the direction of stability. A component that many others depend on is hard to change; it must not depend on something volatile.</li>
<li><b>SAP – Stable Abstractions.</b> A component should be as abstract as it is stable, so stability does not prevent extension.</li>
</ul>

<h3>The metrics</h3>
<table>
<tr><th>Metric</th><th>Formula</th><th>Meaning</th></tr>
<tr><td>Fan-in <b>Ca</b></td><td>components that depend on this one</td><td>responsibility</td></tr>
<tr><td>Fan-out <b>Ce</b></td><td>components this one depends on</td><td>dependence</td></tr>
<tr><td>Instability <b>I</b></td><td>Ce / (Ca + Ce)</td><td>0 = maximally stable, 1 = maximally unstable</td></tr>
<tr><td>Abstractness <b>A</b></td><td>abstract types / all types</td><td>0 = all concrete, 1 = all interfaces</td></tr>
<tr><td>Distance <b>D</b></td><td>|A + I − 1|</td><td>0 = on the main sequence</td></tr>
</table>
<p>The real numbers for the code lab:</p>
<table class="metric-table">
<tr><th>Module</th><th>Types</th><th>Abstract</th><th>Ca</th><th>Ce</th><th>I</th><th>A</th><th>D</th></tr>
<tr><td><span class="ring-tag ring-entity">1</span> screening-entities</td><td class="num">29</td><td class="num">1</td><td class="num">3</td><td class="num">0</td><td class="num">0.00</td><td class="num">0.03</td><td class="num">0.97</td></tr>
<tr><td><span class="ring-tag ring-usecase">2</span> screening-usecases</td><td class="num">37</td><td class="num">14</td><td class="num">2</td><td class="num">1</td><td class="num">0.33</td><td class="num">0.38</td><td class="num">0.29</td></tr>
<tr><td><span class="ring-tag ring-iadapter">3</span> screening-interface-adapters</td><td class="num">32</td><td class="num">4</td><td class="num">1</td><td class="num">2</td><td class="num">0.67</td><td class="num">0.13</td><td class="num">0.21</td></tr>
<tr><td><span class="ring-tag ring-framework">4</span> screening-app</td><td class="num">25</td><td class="num">5</td><td class="num">0</td><td class="num">3</td><td class="num">1.00</td><td class="num">0.20</td><td class="num">0.20</td></tr>
</table>
<div class="callout expert"><strong>Why the entities are allowed to be in the zone of pain</strong><p>D = 0.97 looks alarming: a concrete module everything depends on. The zone of pain hurts only for <b>volatile</b> code – a database schema, a framework. Enterprise rules change rarely and on purpose (a regulator, a policy decision), so being concrete and stable is acceptable – the same reason <code>java.lang.String</code> lives there without causing trouble. If your entities change every sprint, they are not entities: some application or presentation logic has leaked in.</p></div>
<p>Use cases sit closest to the main sequence: 14 of 37 types are interfaces (input boundaries, the output boundaries, gateways), so other rings can extend them without editing them. That is SAP in action.</p>

<h3>Try it: add a bad dependency</h3>
<p>Each checkbox is a dependency someone has proposed in a real review. Predict which principle it breaks, then tick it.</p>
<div data-sim="component-metrics"></div>

<h3>How the lab's poms encode it</h3>
${code('xml', String.raw`
<!-- screening-usecases/pom.xml: ring 2 sees ring 1 and nothing else -->
<dependencies>
    <dependency>
        <groupId>training.clean</groupId>
        <artifactId>screening-entities</artifactId>
    </dependency>
</dependencies>

<!-- screening-interface-adapters/pom.xml: ring 3 sees ring 2 (and ring 1 transitively) -->
<dependencies>
    <dependency>
        <groupId>training.clean</groupId>
        <artifactId>screening-usecases</artifactId>
    </dependency>
</dependencies>`, 'pom.xml')}
<p>No Micronaut dependency appears in either pom. Rings 1–3 compile with nothing but the JDK, which is the strongest possible proof that the business rules do not depend on the framework.</p>

<div data-quiz="m03"></div>
`,
  });

  Course.quiz('m03', [
    { q: 'Which principle does Maven enforce automatically when it refuses to build a reactor with a cyclic reference?', options: ['ADP', 'SDP', 'SAP', 'CRP'], answer: 0, why: 'The Acyclic Dependencies Principle: the component graph must be a DAG.' },
    { q: 'screening-usecases has Ca = 2 and Ce = 1. What is its instability I?', options: ['0.67', '0.50', '0.33', '1.00'], answer: 2, why: 'I = Ce / (Ca + Ce) = 1 / 3 ≈ 0.33.' },
    { q: 'An interactor injects a Micronaut <code>@ConfigurationProperties</code> bean from screening-app. Which principle breaks first?', options: ['REP', 'SDP (and the dependency rule): a stable module depends on the most unstable one, and Maven sees a cycle', 'CCP', 'None, it is just configuration'], answer: 1, why: 'screening-app has I = 1. The fix in the lab: MainWiring reads the property and passes plain values in.' },
    { q: 'Why is it acceptable that screening-entities sits in the "zone of pain"?', options: ['It is not acceptable; add interfaces', 'Enterprise rules are non-volatile, so being concrete and heavily depended on does not cause painful changes', 'Because it has no tests', 'Because Maven ignores it'], answer: 1, why: 'The zone of pain hurts only for volatile code. Stable, rarely changing rules can be concrete.' },
    { q: 'Common Closure (CCP) is to components what … is to classes.', options: ['ISP', 'LSP', 'OCP', 'SRP'], answer: 3, why: 'Both say: group things that change for the same reason, separate things that change for different reasons.' },
  ]);
})();
