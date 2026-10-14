(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'why-architecture', num: 1, level: 'Foundation', minutes: 40,
    title: 'Why architecture: the cost of change',
    lead: 'The problem DDD, hexagonal architecture and Micronaut each solve – and why you need all three together.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Distinguish essential from accidental complexity, with screening examples.</li>
<li>Explain how a typical layered, database-centric codebase decays.</li>
<li>State in one sentence each what DDD, hexagonal architecture and Micronaut contribute.</li>
<li>Argue the business case for this architecture to a sceptical engineering manager.</li>
</ul></div>

<h3>Software is judged by the cost of the next change</h3>
<p>A screening service that works today is not the goal. Regulators publish new rules, the data team adds a risk category, a big client wants a different threshold, the platform team moves from one database or broker to another. The real question is: <b>how expensive, how risky and how slow is the next change?</b></p>
<p>Two kinds of complexity drive that cost:</p>
<table>
<tr><th></th><th>Essential complexity</th><th>Accidental complexity</th></tr>
<tr><td>Definition</td><td>Comes from the problem itself. Cannot be removed, only expressed well.</td><td>Comes from our choices: frameworks, structure, coupling. Can be removed.</td></tr>
<tr><td>Screening examples</td><td>Fuzzy name matching; four-eyes; a case cannot close with open matches; tenants must never see each other's data.</td><td>Business rules spread across controller, service and SQL; tests that need Kafka to check a closure rule; provider JSON fields used deep in business code.</td></tr>
<tr><td>Goal</td><td>Make it explicit, in one place, in business language.</td><td>Push it to the edges, or delete it.</td></tr>
</table>

<h3>How a typical codebase decays</h3>
${fig('01-layered-vs-hexagonal', 'Left: dependencies flow down to the database, so the database schema and frameworks shape everything. Right: dependencies point inward to the domain; technology plugs in at the edges.')}
<p>The classic three-layer design (controller → service → repository → database) is not wrong in itself. It decays in a predictable way:</p>
<ol>
<li><b>Entities become data bags.</b> Generated getters/setters, mapped to tables. No behaviour. This is the <i>anemic domain model</i>.</li>
<li><b>Rules move into services.</b> <code>CaseService.close()</code> checks matches. Then <code>BulkCloseJob</code> needs the same check and re-implements it, slightly differently.</li>
<li><b>Services grow.</b> They call SQL, HTTP clients and Kafka directly. A 1,800-line <code>CaseService</code> is normal in such systems.</li>
<li><b>Tests get slow.</b> Since rules sit next to infrastructure calls, the only way to test a rule is to start the database and the broker.</li>
<li><b>Fear sets in.</b> Changes are batched into risky releases. Teams stop refactoring. Every estimate grows.</li>
</ol>
<div class="callout pitfall"><strong>Where this hurts in compliance</strong><p>When the "can this case close?" rule exists in three places, one of them will be wrong. In screening, a wrong closure means a sanctioned party onboarded with a CLEAR outcome. That is a regulatory incident, not a bug ticket.</p></div>

<div data-sim="change-impact"></div>

<h3>Three ideas, three jobs</h3>
<table>
<tr><th>Idea</th><th>Job</th><th>Without it</th></tr>
<tr><td><b>Domain-Driven Design</b></td><td>Decides <i>what</i> the model is: the language, the boundaries, where each rule lives (aggregates, value objects, events).</td><td>Clean architecture around a model that does not match the business. Hexagons full of anemic objects.</td></tr>
<tr><td><b>Hexagonal architecture</b> (ports &amp; adapters)</td><td>Decides <i>how the model is protected</i>: dependencies point inward, technology is replaceable, the core is testable in isolation.</td><td>A good model slowly polluted by framework annotations, SQL and HTTP concerns.</td></tr>
<tr><td><b>Micronaut</b></td><td>Does the <i>wiring and the plumbing</i> at the edges: DI resolved at compile time, HTTP, data access, configuration, scheduling – fast and with little memory.</td><td>Hand-written plumbing, or a framework whose runtime reflection and annotations seep into the core.</td></tr>
</table>
<p>They fit because each respects the others' territory: DDD owns the centre, hexagonal architecture draws the border, Micronaut lives outside the border and never needs to be imported by the centre.</p>

<h3>What "good" looks like, measurably</h3>
<ul>
<li>A business-rule change touches the domain and its tests only. The code lab's closure rule lives in exactly one method: <code>ScreeningCase.close()</code>.</li>
<li>Domain tests run in milliseconds without Docker. In the code lab, 38 of the 46 tests (domain, application and architecture) start no framework at all.</li>
<li>Swapping a technology (log sink → Kafka, H2 → PostgreSQL) changes adapters and configuration, never the domain.</li>
<li>A new engineer can find any rule by its business name.</li>
<li>Architecture rules are tests: <code>HexagonalArchitectureTest</code> fails the build when someone breaks the dependency rule.</li>
</ul>

<h3>When this is overkill</h3>
<p>Not every part of a system deserves a rich model. A CRUD admin screen for reference lists, a reporting export, a feature flag table: use the simplest thing that works. DDD's own strategic tools (module 2) tell you <i>where</i> to invest: core subdomains get the full treatment, generic ones do not.</p>
<div class="callout lead"><strong>Leading the team</strong><p>Never sell this as "the right way to code". Sell the outcome: "rule changes in one place, tested in milliseconds, technology swaps without touching compliance logic". Then show it, using the change-impact simulator above on a real backlog item from your team.</p></div>

<div data-quiz="m01"></div>
`,
  });

  Course.quiz('m01', [
    { q: 'Which is <b>essential</b> complexity in a screening service?', options: ['Choosing between H2 and PostgreSQL', 'Mapping JSON from the provider API', 'Fuzzy matching of transliterated names', 'Configuring the HTTP thread pool'], answer: 2, why: 'Name variation is a property of the problem. The others are technical choices – accidental complexity to push to the edges.' },
    { q: 'What is the <b>anemic domain model</b>?', options: ['A model with too few classes', 'Objects with data and getters/setters but no behaviour, with rules living in services', 'A domain model without a database', 'A model that uses value objects'], answer: 1, why: 'Anemic models separate data from the rules that protect it, so the rules get duplicated and bypassed.' },
    { q: 'In one phrase, what does hexagonal architecture contribute?', options: ['Finding bounded contexts', 'Compile-time dependency injection', 'Protecting the core: dependencies point inward and technology plugs in at the edges', 'Event sourcing'], answer: 2, why: 'DDD shapes the model, hexagonal protects it, Micronaut wires the edges.' },
    { q: 'A rule change in a well-built hexagonal service should touch…', options: ['Controller, service, DAO and SQL', 'The domain class and its tests', 'Only application.yml', 'The adapters'], answer: 1, why: 'Business rules live in the domain. Configuration selects adapters; adapters translate; neither holds rules.' },
    { q: 'Where should you NOT apply rich DDD modelling?', options: ['Case remediation rules', 'Matching and scoring', 'A CRUD screen maintaining a list of country names', 'Ongoing monitoring decisions'], answer: 2, why: 'Generic or thin-rule areas do not repay the investment. Strategic design tells you where to spend effort.' },
  ]);
})();
