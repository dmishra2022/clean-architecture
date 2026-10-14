(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'orientation', num: 0, level: 'Start', minutes: 25,
    title: 'Orientation: the course, the domain, the four rings',
    lead: 'What you will build, how the course works, the screening vocabulary, and a first look at the four rings of Clean Architecture.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain what a screening service does, in business words, in two minutes.</li>
<li>Use the core vocabulary correctly: party, reference profile, match, resolution, false positive, four-eyes, client group.</li>
<li>Name the four rings of Clean Architecture and the one rule that connects them.</li>
<li>Build and run the four-module code lab and call its API.</li>
</ul></div>

<h3>How this course works</h3>
<p>This is the companion of the hexagonal course in <code>plan/training</code>. Same domain, same business rules, same Micronaut stack – but built the way Robert C. Martin describes in <i>Clean Architecture</i>: four concentric rings, one Maven module each, with boundaries made of interfaces and plain data structures. Doing both courses shows you which ideas are shared (most of them) and where the two styles really differ.</p>
<table>
<tr><th>Level</th><th>Modules</th><th>You will be able to</th></tr>
<tr><td><span class="chip level-Foundation">Foundation</span></td><td>1–5</td><td>Explain why architecture exists, apply SOLID and the component principles, model the domain with DDD inside the entities ring.</td></tr>
<tr><td><span class="chip level-Practitioner">Practitioner</span></td><td>6–12</td><td>Build use cases, controllers, presenters, gateways and the Main component; enforce the rule; wire it with Micronaut; test every ring.</td></tr>
<tr><td><span class="chip level-Expert">Expert</span></td><td>13–14</td><td>Trace and break a running system, handle concurrency, outbox and long-running processes across Clean services.</td></tr>
<tr><td><span class="chip level-Leader">Leader</span></td><td>15–17</td><td>Review code like a principal, drive adoption without ceremony, and pass the final assessment.</td></tr>
</table>
<p>Each module has an explanation, real code from the code lab, at least one simulator and a quiz. Passing a quiz (80%) marks the module complete; progress is saved in your browser.</p>
<div class="callout rule"><strong>One system, all the way through</strong><p>Every example, simulator and line of code is about one service: a <b>screening case service</b> in the style of World-Check. No "Order/Customer" toy. Each new idea lands on something you already understand.</p></div>

<h3>The business problem in plain words</h3>
<p>A bank must not do business with sanctioned people, and must apply extra checks to politically exposed persons (PEPs) and people linked to crime. Before onboarding a customer, and regularly afterwards, the bank <b>screens</b> them: it compares the customer's name and details against a large database of researched risk profiles.</p>
<p>Names are messy – "Viktor"/"Victor", "Reyes Quintanar Marisol", "Faldström"/"Faldstrom", "Ltd"/"Limited". Matching is therefore fuzzy, and fuzzy matching produces <b>false positives</b>: namesakes who are not the listed person. A human <b>analyst</b> reviews each potential match and records a decision with a reason an auditor can read years later.</p>

<h3>Vocabulary you must use precisely</h3>
<table>
<tr><th>Term</th><th>Meaning in this course</th><th>In code (ring 1)</th></tr>
<tr><td>Client group</td><td>The tenant: the bank or business unit that owns the case. Never the screened person.</td><td><code>ClientGroupId</code></td></tr>
<tr><td>Party</td><td>The individual or organisation being screened: name, entity type, optional date of birth and country.</td><td><code>Party</code>, <code>PartyName</code></td></tr>
<tr><td>Reference profile</td><td>A researched risk record: names, aliases, category (sanctions, PEP, law enforcement, adverse media), DOB, country.</td><td><code>ReferenceProfile</code></td></tr>
<tr><td>Screening case</td><td>One unit of screening work for one party: its matches, status and outcome.</td><td><code>ScreeningCase</code></td></tr>
<tr><td>Match</td><td>A profile that scored at or above the threshold for this party.</td><td><code>Match</code></td></tr>
<tr><td>Score / threshold</td><td>0–100 similarity after secondary-identifier adjustments; a match needs score ≥ threshold (default 80).</td><td><code>MatchScore</code>, <code>NameMatchingPolicy</code></td></tr>
<tr><td>Resolution</td><td>POSITIVE (it is them), POSSIBLE (need more information), FALSE_POSITIVE (not them).</td><td><code>Resolution</code></td></tr>
<tr><td>Rationale</td><td>The written reason for a resolution, required for audit.</td><td><code>ResolutionRationale</code></td></tr>
<tr><td>Four-eyes</td><td>A confirmed POSITIVE may only be downgraded by a <i>different</i> analyst.</td><td>rule <code>FOUR_EYES</code></td></tr>
<tr><td>Outcome</td><td>Result of a closed case: CLEAR or RISK_CONFIRMED.</td><td><code>CaseOutcome</code></td></tr>
<tr><td>Work queue</td><td>The analyst team's triage list: open cases ordered HIGH, MEDIUM, LOW. New in this course.</td><td><code>ListWorkQueueInteractor</code> (ring 2)</td></tr>
</table>
<div class="callout wc"><strong>World-Check context</strong><p>The real product has many more concepts (secondary-ID types, media check, batch screening, watchlists). All names and profiles here are fictional training data. The <i>shape</i> of the problem is realistic; the specific rules are a teaching model to validate against your own domain experts.</p></div>

<h3>The life of a case</h3>
<ol>
<li><b>Open</b> – a client submits a party. Status <span class="status-pill status-CREATED">CREATED</span>.</li>
<li><b>Screen</b> – the party is compared with candidate profiles; matches are recorded as UNRESOLVED. Status <span class="status-pill status-PENDING_REVIEW">PENDING_REVIEW</span> if any match needs a decision, otherwise <span class="status-pill status-REVIEWED">REVIEWED</span>.</li>
<li><b>Resolve</b> – an analyst decides each match, with a rationale.</li>
<li><b>Close</b> – only when screened and no match is UNRESOLVED or POSSIBLE. Outcome RISK_CONFIRMED if any match is POSITIVE, else CLEAR. Status <span class="status-pill status-CLOSED">CLOSED</span>.</li>
</ol>
<p>Each step raises a <b>domain event</b> – <code>CaseOpened</code>, <code>CaseScreened</code>, <code>MatchResolved</code>, <code>CaseClosed</code> – which reaches other systems through a transactional outbox.</p>

<h3>The four rings on one page</h3>
${fig('01-clean-rings', 'The four rings. Source-code dependencies point inward only; the Main component (purple) is the one place that knows everyone.')}
<table>
<tr><th>Ring</th><th>Holds</th><th>Maven module in the lab</th></tr>
<tr><td><span class="ring-tag ring-entity">1 · ENTITIES</span></td><td>Enterprise business rules: the aggregate, value objects, events, the matching policy. Would be true even without this application.</td><td><code>screening-entities</code></td></tr>
<tr><td><span class="ring-tag ring-usecase">2 · USE CASES</span></td><td>Application business rules: one interactor per user intention, with its input boundary, request/response models and the gateways it needs.</td><td><code>screening-usecases</code></td></tr>
<tr><td><span class="ring-tag ring-iadapter">3 · INTERFACE ADAPTERS</span></td><td>Controllers, presenters, view models, gateway implementations. Convert between the use cases' format and the outside's format.</td><td><code>screening-interface-adapters</code></td></tr>
<tr><td><span class="ring-tag ring-framework">4 · FRAMEWORKS &amp; DRIVERS</span></td><td>Micronaut, HTTP, JDBC, H2, the scheduler – and the Main component that wires it all.</td><td><code>screening-app</code></td></tr>
</table>
<div class="callout rule"><strong>The dependency rule</strong><p>Source-code dependencies can only point inwards. Nothing in an inner ring can know anything at all about something in an outer ring – not a class name, not an annotation, not a data format. You will meet this sentence in every module.</p></div>

<h3>Set up the code lab</h3>
<p>The code lab in <code>plan/training1/code-lab</code> is a complete, tested Micronaut 4 service split into four Maven modules (79 tests). You need Java 21. It runs on port <b>8081</b>, so it can run next to the hexagonal lab on 8080.</p>
${code('shell', `
cd plan/training1/code-lab
../../../mvnw clean install                        # 79 tests across the four rings
../../../mvnw -pl screening-app exec:java          # http://localhost:8081

# in another terminal
curl -s -X POST localhost:8081/api/v1/client-groups/acme-bank/cases \\
  -H 'Content-Type: application/json' -H 'Idempotency-Key: onboarding-1' \\
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}'
`, 'terminal')}
<p>If you cannot run Java right now, nothing is lost: the simulators run a rule-for-rule JavaScript model of the same four rings in your browser, down to the status codes.</p>

<h3>How to study</h3>
<ul>
<li><b>Predict, then click.</b> Every simulator asks you to predict an outcome. The surprise is where the learning is.</li>
<li><b>Open the file</b> named on each code block. Navigating the real modules is the skill.</li>
<li><b>Compare with the hexagon.</b> If you did the first course, keep <code>clean-vs-hexagonal.md</code> open.</li>
<li><b>Teach it back.</b> After each module, explain the key idea to a colleague in five minutes.</li>
</ul>

<div data-quiz="m00"></div>
`,
  });

  Course.quiz('m00', [
    { q: 'In this domain, what is a <b>client group</b>?', options: ['The person being screened', 'A group of related reference profiles', 'The tenant (bank or business unit) that owns the case', 'The analysts working a case'], answer: 2, why: 'A client group is the tenant. Confusing it with the screened party is a classic language bug.' },
    { q: 'Which ring holds <b>enterprise</b> business rules such as "a case cannot close with a POSSIBLE match"?', options: ['Entities', 'Use cases', 'Interface adapters', 'Frameworks & drivers'], answer: 0, why: 'Rules that would be true for any application over screening cases are enterprise rules and live in the entities ring.' },
    { q: 'The dependency rule says…', options: ['Calls may only go inward', 'Source-code dependencies may only point inward; inner rings know nothing of outer rings', 'Each ring may depend on the next ring out', 'Only the entities may be tested'], answer: 1, why: 'It is about source-code dependencies (imports, names, formats), not about the direction of calls. Calls go both ways; module 9 shows how.' },
    { q: 'When can a case be closed?', options: ['Any time an analyst decides', 'Only when there are no matches', 'Only after every match is FALSE_POSITIVE', 'After screening, when no match is UNRESOLVED or POSSIBLE'], answer: 3, why: 'Closure needs at least one screening and no blocking resolutions. Positives are allowed and give RISK_CONFIRMED.' },
    { q: 'Where does Micronaut appear in the code lab?', options: ['In every ring, as annotations', 'Only in screening-app, the frameworks & drivers ring', 'In the entities, for validation', 'In the use cases, for transactions'], answer: 1, why: 'Rings 1–3 are plain Java. Even JSON bindings are generated from the outside with @SerdeImport.' },
  ]);
})();
