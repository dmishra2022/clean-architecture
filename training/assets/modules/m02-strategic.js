(function () {
  const { fig } = Course;
  Course.module({
    id: 'strategic-ddd', num: 2, level: 'Foundation', minutes: 60,
    title: 'Strategic DDD: subdomains, language, bounded contexts, context maps',
    lead: 'Before any class is written: where is the value, what do words mean, and where are the boundaries between models?',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Classify subdomains as core, supporting or generic, and justify the investment level for each.</li>
<li>Build and maintain a ubiquitous language with domain experts.</li>
<li>Identify bounded contexts using language and ownership heuristics.</li>
<li>Name and apply every context-map pattern, and pick one for a given relationship.</li>
</ul></div>

<h3>Domain and subdomains</h3>
<p>The <b>domain</b> is the area of business the software serves: here, financial-crime risk screening. It is too large for one model, so we split the <i>problem space</i> into <b>subdomains</b> and classify each by how much it differentiates the business.</p>
${fig('02-subdomains', 'Subdomains of a World-Check-style landscape. Core gets the best people and the richest model; generic gets bought or reused.')}
<table>
<tr><th>Type</th><th>Test question</th><th>Investment</th><th>Example</th></tr>
<tr><td><b>Core</b></td><td>Would clients leave if we were only average at this?</td><td>Rich DDD, best engineers, deep tests, in-house.</td><td>Screening &amp; matching, case remediation, ongoing monitoring.</td></tr>
<tr><td><b>Supporting</b></td><td>Needed and specific to us, but not why clients pay?</td><td>Simpler model; CRUD is acceptable where rules are thin.</td><td>Batch file ingestion, entitlements, reporting.</td></tr>
<tr><td><b>Generic</b></td><td>Does every company have this problem?</td><td>Buy, use open source or a platform team; integrate behind an ACL.</td><td>Identity/SSO, email delivery, billing.</td></tr>
</table>
<div class="callout pitfall"><strong>Common mistake</strong><p>Spending three sprints building a beautiful aggregate model for user preferences while the matching rules live in a stored procedure. Classify first; invest accordingly.</p></div>

<h3>Ubiquitous language</h3>
<p>A ubiquitous language is the shared, precise vocabulary used by domain experts and engineers <i>and</i> in the code, tests, APIs and events. It is "ubiquitous" inside one bounded context – not across the whole company.</p>
<ul>
<li>If analysts say "resolve a match", the method is <code>resolveMatch</code>, the event is <code>MatchResolved</code>, the endpoint is <code>PUT …/matches/{id}/resolution</code>. Not <code>updateStatus</code>.</li>
<li>If a term is ambiguous, the team resolves it explicitly and writes it down. Example: "client" was used for both the bank and the screened person. The team agreed: <b>client group</b> = tenant, <b>party</b> = screened entity.</li>
<li>When the code disagrees with how experts speak, the code is wrong. Rename it.</li>
</ul>
<div class="callout lead"><strong>Practical routine</strong><p>Keep a glossary file in the repository next to the code (<code>docs/glossary.md</code>). Each entry: term, definition, examples, counter-examples, owner. Review it in refinement whenever a story introduces a new word. Reject pull requests that introduce synonyms.</p></div>

<h3>Bounded contexts</h3>
<p>A <b>bounded context</b> is the boundary inside which a model and its language are consistent. Outside it, the same word can mean something else – and that is fine, as long as the boundary is explicit.</p>
<p>The test: does a single definition of the term serve every team? Use the simulator to see why "Profile", "Match" or "Client" cannot have one shared class across the company.</p>
<div data-sim="context-map"></div>

<h4>Heuristics for finding boundaries</h4>
<ol>
<li><b>Language changes.</b> When a word changes meaning, you are crossing a boundary.</li>
<li><b>Different rules for the same data.</b> Screening needs 5 profile fields to score; Risk Intelligence needs 60 to research. Two models.</li>
<li><b>Different rates of change and owners.</b> Editorial workflow changes weekly; matching rules change per regulatory cycle. Separate teams → separate contexts (Conway's law).</li>
<li><b>Different consistency needs.</b> A case must be consistent in one transaction; reporting can be minutes behind.</li>
<li><b>Business capabilities, not entities.</b> "Screening" and "Monitoring" are capabilities. A "Customer service" context organised around an entity usually becomes a dumping ground.</li>
</ol>
<div class="callout expert"><strong>Bounded context ≠ microservice</strong><p>A bounded context is a <i>model</i> boundary. It can be a module in a monolith, one service, or (rarely) several services. Start with a modular monolith per context when the team is small; split deployment later when scaling or team autonomy requires it (module 13).</p></div>

<h3>Context maps: the relationships between contexts</h3>
${fig('03-context-map', 'The screening landscape with a pattern on every edge. Each pattern is a decision about who adapts to whom.')}
<table>
<tr><th>Pattern</th><th>What it means</th><th>Use when</th><th>Screening example</th></tr>
<tr><td><b>Partnership</b></td><td>Two teams succeed or fail together; plan jointly.</td><td>Tightly linked delivery, high trust.</td><td>Screening and Monitoring during a joint launch.</td></tr>
<tr><td><b>Shared Kernel</b></td><td>A small shared model both teams own; changes need agreement.</td><td>Tiny, stable, truly shared concepts.</td><td>A shared <code>RiskCategory</code> enum library. Keep it very small.</td></tr>
<tr><td><b>Customer / Supplier</b></td><td>Downstream needs are negotiated into upstream's backlog.</td><td>Upstream is willing to serve downstream.</td><td>Monitoring (customer) sends <code>RescreenCase</code> to Screening (supplier).</td></tr>
<tr><td><b>Conformist</b></td><td>Downstream adopts upstream's model as-is.</td><td>Upstream will not change for you and translation is not worth it.</td><td>Audit stores our published events exactly; we conform to the OIDC provider's claims.</td></tr>
<tr><td><b>Anti-Corruption Layer (ACL)</b></td><td>Downstream translates the upstream model at its border.</td><td>Upstream's model is foreign, unstable or messy.</td><td><code>HttpReferenceDataSource</code> translates "SAN"/"P"/partial dates into <code>ReferenceProfile</code>.</td></tr>
<tr><td><b>Open Host Service (OHS)</b></td><td>Upstream offers one well-defined protocol for many consumers.</td><td>Many consumers; one-off integrations do not scale.</td><td>The screening REST API v1 used by all banks and the UI.</td></tr>
<tr><td><b>Published Language (PL)</b></td><td>A documented, versioned exchange format.</td><td>Paired with OHS or events.</td><td><code>EventPayloads</code> with <code>schemaVersion</code>; OpenAPI spec.</td></tr>
<tr><td><b>Separate Ways</b></td><td>No integration; duplicate instead.</td><td>Integration cost exceeds benefit.</td><td>An internal tool keeps its own country list.</td></tr>
<tr><td><b>Big Ball of Mud</b></td><td>No clear model; mark it and contain it.</td><td>Legacy you must live with.</td><td>A legacy case DB accessed only through an ACL (strangler, module 13).</td></tr>
</table>
<div class="callout wc"><strong>World-Check reality check</strong><p>Your first useful architect deliverable is often an honest context map of what exists today, including the ugly edges: shared databases, undocumented feeds, a "common" library everyone depends on. You cannot improve boundaries you have not drawn. Do this in your first 30 days (see <code>plan/</code>).</p></div>

<h3>From strategy to code</h3>
<p>Strategic choices show up directly in the code lab:</p>
<ul>
<li>The <b>Screening &amp; Case</b> context is one deployable with its own schema. No other context reads its tables.</li>
<li>The <b>ACL</b> to Risk Intelligence is <code>adapter/out/reference/HttpReferenceDataSource</code>. Nothing else imports provider DTOs.</li>
<li>The <b>OHS/PL</b> is <code>adapter/in/rest/ApiModels</code> plus <code>adapter/out/events/EventPayloads</code>, both versioned.</li>
</ul>

<div data-quiz="m02"></div>
`,
  });

  Course.quiz('m02', [
    { q: 'The data team renames upstream fields and changes category codes every quarter. Screening should integrate via…', options: ['Conformist – use their DTOs directly', 'Shared Kernel', 'An Anti-Corruption Layer that translates into Screening\'s own model', 'Separate Ways'], answer: 2, why: 'An unstable or foreign upstream model is the textbook case for an ACL: changes stay in one adapter.' },
    { q: 'Which is the strongest signal of a bounded-context boundary?', options: ['Two tables have a foreign key', 'The same word means different things to two groups of people', 'Two classes are in different packages', 'A service has more than 10 endpoints'], answer: 1, why: 'Language divergence is the primary signal. Technical structure follows the model, not the other way round.' },
    { q: 'Identity/SSO is a…', options: ['Core subdomain', 'Supporting subdomain', 'Generic subdomain', 'Bounded context of Screening'], answer: 2, why: 'Every company needs it; buy or reuse, integrate as Conformist or through an ACL.' },
    { q: 'Open Host Service + Published Language is the right choice when…', options: ['One downstream needs a quick integration', 'Many consumers need the same capability through a stable, documented contract', 'Two teams share a database', 'Downstream refuses to integrate'], answer: 1, why: 'OHS/PL scales to many consumers: one versioned contract instead of N custom integrations.' },
    { q: 'Is a bounded context the same thing as a microservice?', options: ['Yes, always one-to-one', 'No: it is a model boundary; it may be a module in a monolith or a service', 'Yes, but only in Micronaut', 'No: a bounded context is a database schema'], answer: 1, why: 'Deployment is a separate decision. Modular monoliths per context are often the right start.' },
  ]);
})();
