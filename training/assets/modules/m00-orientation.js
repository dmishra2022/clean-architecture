(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'orientation', num: 0, level: 'Start', minutes: 25,
    title: 'Orientation: the course, the domain, the system',
    lead: 'What you will build, how the course works, and the screening vocabulary every later module relies on.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain what a screening service does, in business words, in two minutes.</li>
<li>Use the core vocabulary correctly: party, reference profile, match, resolution, false positive, four-eyes, client group.</li>
<li>Run the code lab locally and open the API.</li>
<li>Find your way around this course: modules, simulators, quizzes, diagrams.</li>
</ul></div>

<h3>How this course works</h3>
<p>The course goes from zero to expert in five levels. Each module has an explanation, real code from the code lab, at least one interactive simulator and a quiz. Passing the quiz (80%) marks the module complete; progress is saved in your browser.</p>
<table>
<tr><th>Level</th><th>Modules</th><th>You will be able to</th></tr>
<tr><td><span class="chip level-Foundation">Foundation</span></td><td>1–6</td><td>Model a domain with DDD: language, contexts, aggregates, events.</td></tr>
<tr><td><span class="chip level-Practitioner">Practitioner</span></td><td>7–12</td><td>Build it as a hexagon with Micronaut, test it, and run it end-to-end.</td></tr>
<tr><td><span class="chip level-Expert">Expert</span></td><td>13–14</td><td>Handle distributed consistency, versioning, multi-tenancy; review code like a principal.</td></tr>
<tr><td><span class="chip level-Leader">Leader</span></td><td>15–16</td><td>Drive adoption in a team and assess people fairly.</td></tr>
</table>
<div class="callout rule"><strong>One system, all the way through</strong><p>Every example, simulator and line of code is about the same service: a <b>screening case service</b> in the style of World-Check. You will not switch to a toy "Order/Customer" example. That way each new idea lands on something you already understand.</p></div>

<h3>The business problem in plain words</h3>
<p>A bank must not do business with sanctioned people, and must apply extra checks to politically exposed persons (PEPs) and people linked to crime. Before onboarding a customer, and regularly afterwards, the bank <b>screens</b> them: it compares the customer's name and details against a large database of risk profiles researched by the data provider.</p>
<p>Names are messy: different spellings ("Viktor"/"Victor"), word order ("Reyes Quintanar Marisol"), accents ("Faldström"/"Faldstrom"), company suffixes ("Ltd"/"Limited"). So matching is fuzzy, and fuzzy matching produces <b>false positives</b>: a namesake who is not the listed person. A human <b>analyst</b> reviews each potential match and records a decision with a reason that an auditor can read years later.</p>

<h3>Vocabulary you must use precisely</h3>
<table>
<tr><th>Term</th><th>Meaning in this course</th><th>In code</th></tr>
<tr><td>Client group</td><td>The tenant: the bank (or business unit) that owns the case. Never the screened person.</td><td><code>ClientGroupId</code></td></tr>
<tr><td>Party</td><td>The individual or organisation being screened: name, entity type, optional date of birth and country.</td><td><code>Party</code>, <code>PartyName</code></td></tr>
<tr><td>Reference profile</td><td>A researched risk record: primary name, aliases, category (sanctions, PEP, law enforcement, adverse media), DOB, country.</td><td><code>ReferenceProfile</code></td></tr>
<tr><td>Screening case</td><td>One unit of screening work for one party: its matches, status and outcome.</td><td><code>ScreeningCase</code></td></tr>
<tr><td>Match</td><td>A profile that scored at or above the threshold for this party, waiting for or carrying a decision.</td><td><code>Match</code></td></tr>
<tr><td>Score / threshold</td><td>0–100 similarity after secondary-identifier adjustments; matches need score ≥ threshold (default 80).</td><td><code>MatchScore</code>, <code>NameMatchingPolicy</code></td></tr>
<tr><td>Resolution</td><td>The analyst's decision on a match: POSITIVE (it is them), POSSIBLE (needs more information), FALSE_POSITIVE (not them).</td><td><code>Resolution</code></td></tr>
<tr><td>Rationale</td><td>The written reason for a resolution, required for audit.</td><td><code>ResolutionRationale</code></td></tr>
<tr><td>Four-eyes</td><td>A confirmed POSITIVE may only be downgraded by a <i>different</i> analyst.</td><td>rule <code>FOUR_EYES</code></td></tr>
<tr><td>Outcome</td><td>Result of a closed case: CLEAR or RISK_CONFIRMED.</td><td><code>CaseOutcome</code></td></tr>
<tr><td>Ongoing monitoring</td><td>Rescreening existing cases when profiles change, and alerting on new matches.</td><td>module 13</td></tr>
</table>
<div class="callout wc"><strong>World-Check context</strong><p>The real product has many more concepts (secondary-ID types, media-check, batch screening, watchlists per client). All names and profiles in this course are fictional training data. The <i>shape</i> of the problem is realistic; the specific rules are a teaching model you should validate against your team's actual domain experts.</p></div>

<h3>The life of a case</h3>
<ol>
<li><b>Open</b> – a client submits a party. Status <span class="status-pill status-CREATED">CREATED</span>.</li>
<li><b>Screen</b> – the party is compared with candidate profiles. Matches are recorded as UNRESOLVED. Status <span class="status-pill status-PENDING_REVIEW">PENDING_REVIEW</span> if any match needs a decision, otherwise <span class="status-pill status-REVIEWED">REVIEWED</span>.</li>
<li><b>Resolve</b> – an analyst decides each match, with a rationale.</li>
<li><b>Close</b> – allowed only when screened and no match is UNRESOLVED or POSSIBLE. Outcome is RISK_CONFIRMED if any match is POSITIVE, else CLEAR. Status <span class="status-pill status-CLOSED">CLOSED</span>.</li>
</ol>
<p>Each step raises a <b>domain event</b>: <code>CaseOpened</code>, <code>CaseScreened</code>, <code>MatchResolved</code>, <code>CaseClosed</code>. Other parts of the business (audit, monitoring, notifications) listen to those events.</p>

<h3>The whole system on one page</h3>
${fig('06-hexagon-ports-adapters', 'The service you will understand completely by module 12: domain in the middle, application ports around it, adapters outside, Micronaut wiring it together.')}
<p>Do not worry if this picture means little today. By module 7 you will be able to draw it from memory, and by module 12 you will have watched a request travel through every box.</p>

<h3>Set up the code lab</h3>
<p>The code lab in <code>plan/training/code-lab</code> is a complete, tested Micronaut 4 service (46 tests). You need Java 21.</p>
${code('shell', `
cd plan/training/code-lab
../../../mvnw test                       # domain, application, adapter, API and architecture tests
../../../mvnw compile exec:java          # starts on http://localhost:8080

# in another terminal
curl -s -X POST localhost:8080/api/v1/client-groups/acme-bank/cases \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}'
`, 'terminal')}
<p>If you cannot run Java right now, nothing is lost: the simulators run a rule-for-rule JavaScript port of the same domain in your browser.</p>

<h3>How to study</h3>
<ul>
<li><b>Read, then play.</b> Each simulator is designed to make you predict an outcome. Predict before you click.</li>
<li><b>Open the code lab file</b> named in each section. The course quotes it, but navigating the real project is the skill.</li>
<li><b>Teach it back.</b> At the end of each module, explain the key idea to a colleague in five minutes. If you cannot, retake the module.</li>
<li><b>Leaders:</b> the <code>facilitator-guide.md</code> turns this course into an 8-week team programme.</li>
</ul>

<div data-quiz="m00"></div>
`,
  });

  Course.quiz('m00', [
    { q: 'In this domain, what is a <b>client group</b>?', options: ['The person being screened', 'The tenant (bank or business unit) that owns the case', 'A group of related reference profiles', 'The analysts working a case'], answer: 1, why: 'A client group is the tenant. Confusing it with the screened party is a classic language bug: they are different concepts with different rules.' },
    { q: 'A match is resolved as <b>FALSE_POSITIVE</b>. What does that mean?', options: ['The matching algorithm crashed', 'The profile is the party; risk confirmed', 'The profile is not the party; a namesake or coincidence', 'The analyst needs more information'], answer: 2, why: 'FALSE_POSITIVE means the potential match is not the same person/organisation. POSSIBLE means more information is needed; POSITIVE means it is them.' },
    { q: 'When can a case be closed?', options: ['Any time an analyst decides', 'After screening, when no match is UNRESOLVED or POSSIBLE', 'Only when there are no matches', 'Only after every match is FALSE_POSITIVE'], answer: 1, why: 'Closure requires at least one screening and no blocking resolutions. Positives are allowed; they make the outcome RISK_CONFIRMED.' },
    { q: 'What is the <b>four-eyes</b> rule here?', options: ['Two analysts must review every match', 'A confirmed POSITIVE can only be downgraded by a different analyst', 'Every case needs two screenings', 'Analysts must work in pairs'], answer: 1, why: 'Only downgrading a POSITIVE needs a second person, which protects against one analyst quietly clearing a real hit.' },
    { q: 'Why do analysts exist at all, if the algorithm scores names?', options: ['Regulation forbids algorithms', 'Fuzzy name matching produces false positives that need human judgement and an auditable rationale', 'The algorithm is too slow', 'To enter the party details'], answer: 1, why: 'Names collide. The score finds candidates; humans decide, and the rationale is the audit evidence.' },
  ]);
})();
