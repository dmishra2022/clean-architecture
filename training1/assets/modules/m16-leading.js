(function () {
  const { code } = Course;
  Course.module({
    id: 'leading', num: 16, level: 'Leader', minutes: 60,
    title: 'Leading adoption: from a legacy service to clean rings',
    lead: 'Nobody gets to start with a clean slate. This module is about moving a real team and a real codebase toward Clean Architecture one safe step at a time – and about knowing when to stop.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Plan an incremental migration from a layered service to rings, with a working system after every step.</li>
<li>Write the ADRs and fitness functions that keep the decision alive.</li>
<li>Run the team programme in the facilitator guide and assess progress honestly.</li>
<li>Explain the trade-offs to product and engineering leadership in their terms.</li>
</ul></div>

<h3>Migration in seven safe steps</h3>
<p>Start from the typical service in module 1: a <code>CaseService</code> with rules, SQL, HTTP calls and Kafka; JPA entities serialised as JSON. Each step is releasable on its own.</p>
<ol>
<li><b>Freeze the damage.</b> Add <code>CleanArchitectureTest</code> with today's packages, using ArchUnit's <code>FreezingArchRule</code> so existing violations are recorded and new ones fail the build.</li>
<li><b>Pull out one value object.</b> Replace <code>String caseId</code> with <code>CaseId</code> along one path. Teams feel the benefit in a day.</li>
<li><b>Grow one aggregate.</b> Move closure and four-eyes checks from <code>CaseService</code> into <code>ScreeningCase</code> methods with tests. Remove the setters they replace.</li>
<li><b>Extract one interactor.</b> Pick the use case with the most churn (often "resolve match"). Give it a request model, a <code>CaseGateway</code> it owns, and an output boundary. The old service delegates to it.</li>
<li><b>Introduce the presenter.</b> Move status codes and labels from the controller into a presenter for that one use case.</li>
<li><b>Split modules.</b> When the first ring is clean, move it to its own Maven module. The compiler now guards it.</li>
<li><b>Repeat per use case</b>, ordered by change frequency. Leave stable, rarely touched code alone – the strangler fig does not need to finish.</li>
</ol>
<div class="callout pitfall"><strong>The big-bang rewrite</strong><p>"We'll rebuild it cleanly in a new repo" is how teams end up maintaining two systems for two years. Move the rules, keep the system running, and measure progress by frozen-violation count and cost per change – not by percentage rewritten.</p></div>

<h3>Decisions that last: ADRs and fitness functions</h3>
${code('text', `
ADR-014  Clean Architecture for the Screening Case service
Status   Accepted · 2026-10
Context  Compliance rules change by regulation; we have REST, batch and a planned CLI; tests need H2 today.
Decision Four Maven modules (entities, usecases, interface-adapters, app). Use cases own gateways and an output
         boundary per use-case family. Micronaut only in screening-app. Read models may bypass the entities.
Consequences
  + rules testable in ms; delivery mechanisms added without touching rings 1-2; build enforces the rule
  − ~40% more source files per feature than a hexagonal single module; onboarding takes one extra week
Fitness  CleanArchitectureTest (6 rules) in CI · rings 1-3 compile without Micronaut ·
         entity + interactor tests < 5 s · no new frozen violations
Revisit  When a second team joins, or if CRUD-only use cases exceed 50%.
`, 'docs/adr/ADR-014-clean-architecture.md')}
<p>The templates in <code>plan/templates</code> (ADR, RFC, risk register, NFR checklist) fit this directly.</p>

<h3>Talking to leadership</h3>
<table>
<tr><th>They ask</th><th>You answer with</th></tr>
<tr><td>"Why more classes?"</td><td>Cost per change over a year: the change-impact numbers from module 1 on your own backlog.</td></tr>
<tr><td>"Will it slow delivery?"</td><td>For two sprints, yes. Then test runtime drops and regressions in rules drop. Show the trend.</td></tr>
<tr><td>"Can we switch frameworks later?"</td><td>Rings 1–3 compile without Micronaut today. That is the evidence.</td></tr>
<tr><td>"Do all services need this?"</td><td>No. Core subdomains only; partial boundaries elsewhere (module 9).</td></tr>
</table>

<h3>Growing the team</h3>
<ul>
<li><b>Weeks 1–2:</b> modules 0–5, Event Storming on your own domain (facilitator guide).</li>
<li><b>Weeks 3–4:</b> modules 6–9, a fortnightly 45-minute kata: extract a use case from legacy code.</li>
<li><b>Weeks 5–6:</b> modules 10–13, pair on Mission Control, then the same missions against the real service.</li>
<li><b>Weeks 7–8:</b> modules 14–17, engineers lead a review session using the PR simulator.</li>
</ul>
<p>Assess where the team is, not where the slides are:</p>
<div data-sim="maturity"></div>

<div data-quiz="m16"></div>
`,
  });

  Course.quiz('m16', [
    { q: 'What is the safest first step when introducing Clean Architecture into a legacy service?', options: ['Rewrite it in a new repository', 'Add architecture tests that freeze existing violations and fail on new ones', 'Split into four modules immediately', 'Rename packages'], answer: 1, why: 'Stop the bleeding first; then improve one path at a time.' },
    { q: 'Which use case should you extract into an interactor first?', options: ['The most stable one', 'The one with the most churn and rule bugs', 'The simplest read', 'All at once'], answer: 1, why: 'Benefit is proportional to change frequency. Stable code can stay as it is.' },
    { q: 'A good ADR for this decision includes…', options: ['Only the decision', 'Context, decision, consequences (good and bad), fitness functions and when to revisit', 'A list of frameworks', 'The full class diagram'], answer: 1, why: 'Consequences and fitness functions are what keep the decision honest over time.' },
    { q: 'Leadership asks whether every service should use the full design. You say…', options: ['Yes, for consistency', 'No: core subdomains earn full boundaries; supporting and generic services use partial boundaries or the framework directly', 'No service needs it', 'Only microservices'], answer: 1, why: 'Architecture is about trade-offs per context.' },
  ]);
})();
