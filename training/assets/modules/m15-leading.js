(function () {
  const { code } = Course;
  Course.module({
    id: 'leading-the-team', num: 15, level: 'Leader', minutes: 75,
    title: 'Leading the team: adoption, rituals, decisions and measurement',
    lead: 'Knowing the patterns is half the job. The other half is getting a team of busy engineers to adopt them – without a rewrite and without dogma.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Plan a phased adoption that delivers value in every phase.</li>
<li>Run the core rituals: glossary sessions, Event Storming, design reviews, katas, ADRs.</li>
<li>Handle the common objections with evidence.</li>
<li>Measure progress with a small set of meaningful metrics.</li>
</ul></div>

<h3>Principles</h3>
<ol>
<li><b>Outcomes over patterns.</b> Talk about fewer production incidents, faster rule changes, test time. Never "we need to do DDD properly".</li>
<li><b>One flow, end to end.</b> Pick one valuable core flow (e.g. case closure) and do it well. A visible win beats a framework document.</li>
<li><b>Strangle, do not rewrite.</b> New rules go into the new model; old code is migrated when touched.</li>
<li><b>Make the right thing the easy thing.</b> Templates, ArchUnit rules, PR checklist, a reference module (the code lab) to copy from.</li>
<li><b>Teach by pairing.</b> An hour of pairing on a real ticket teaches more than a day of slides.</li>
</ol>

<h3>A phased adoption plan</h3>
<table>
<tr><th>Phase</th><th>Duration</th><th>Do</th><th>Evidence of success</th></tr>
<tr><td><b>1. Listen &amp; map</b></td><td>Weeks 1–4</td><td>Read code, shadow analysts, draw the current context map (honestly), start the glossary, list hotspots.</td><td>Map and glossary reviewed by team and domain experts; top 5 risks agreed.</td></tr>
<tr><td><b>2. First slice</b></td><td>Weeks 5–10</td><td>Event Storm one flow; build its aggregate with invariant tests; put it behind ports; add ArchUnit with freezing.</td><td>One rule change shipped touching only the domain; tests run in seconds.</td></tr>
<tr><td><b>3. Spread</b></td><td>Months 3–6</td><td>Reference module, PR checklist, fortnightly katas, ADRs for every significant decision; outbox for the first event flow.</td><td>Frozen ArchUnit violations trending down; 2+ engineers leading sessions.</td></tr>
<tr><td><b>4. Platform</b></td><td>Months 6–12</td><td>Context contracts (OpenAPI, event schemas), contract tests, read models, team-owned contexts.</td><td>Teams release independently; integration incidents down.</td></tr>
</table>
<p>This aligns with your personal roadmap in <code>plan/30-day.md</code> through <code>plan/12-month.md</code>.</p>

<h3>Rituals that work</h3>
<table>
<tr><th>Ritual</th><th>Cadence</th><th>Format</th><th>Template</th></tr>
<tr><td>Glossary review</td><td>In refinement, whenever a story adds a term</td><td>5 minutes; one owner per term</td><td><code>plan/templates/glossary.md</code></td></tr>
<tr><td>Event Storming</td><td>Per new flow or major change</td><td>Process level, 3 hours (module 3)</td><td>–</td></tr>
<tr><td>Design review</td><td>Weekly, 45 minutes</td><td>One RFC or risky PR; checklist from module 14</td><td><code>plan/templates/rfc-template.md</code></td></tr>
<tr><td>Architecture Decision Records</td><td>Every decision that is costly to reverse</td><td>One page: context, decision, consequences, alternatives</td><td><code>plan/templates/adr-template.md</code></td></tr>
<tr><td>Modelling kata</td><td>Fortnightly, 45 minutes</td><td>Small groups model a scenario, compare (see below)</td><td><code>facilitator-guide.md</code></td></tr>
<tr><td>Context map refresh</td><td>Quarterly</td><td>Redraw with neighbouring teams</td><td><code>plan/templates/context-map.md</code></td></tr>
</table>

<h4>Example ADR</h4>
${code('text', `
# ADR-007: Publish case events through a transactional outbox

Status: Accepted (2026-10-11)

Context
  Screening publishes CaseClosed for Monitoring and Audit. Today CaseService saves and then calls
  Kafka directly. Two incidents in Q3 lost CaseClosed events after commit (broker timeout).

Decision
  Domain events are appended to outbox_event in the same transaction as the aggregate.
  A relay publishes with FOR UPDATE SKIP LOCKED; key = caseId; at-least-once.
  Consumers de-duplicate by eventId (inbox table).

Consequences
  + No lost or phantom events; replay possible from the table
  + Domain and application stay broker-agnostic (port: DomainEventOutbox)
  - Publication latency up to relay interval (2s); acceptable for Monitoring (SLO 60s)
  - Outbox retention job and lag alert required

Alternatives considered
  CDC with Debezium (lower latency; rejected for now: no Kafka Connect in our platform)
  Publish-then-commit (rejected: phantom events on rollback)`, 'docs/adr/ADR-007-outbox.md')}

<h4>Kata catalogue (screening-flavoured)</h4>
<ol>
<li>Add a <b>"senior review"</b> rule: POSITIVE matches in SANCTIONS need a senior analyst to close. Where does it live? What changes?</li>
<li>Model <b>watchlist suppression</b>: a client marks a profile as "known, approved" for a party. Aggregate or not? Which events?</li>
<li>Design the <b>analyst work queue</b> read model. Which events feed it? What lag is acceptable?</li>
<li>A provider changes date formats. Prove that only the ACL changes.</li>
<li>Split <b>batch screening</b> into its own context. Draw the map. Which pattern on each edge?</li>
<li>Two analysts collide on the same case daily. Is the aggregate too big, or is this correct behaviour?</li>
</ol>

<h3>Handling objections</h3>
<table>
<tr><th>Objection</th><th>Response with evidence</th></tr>
<tr><td>"This is too much code – mapping everywhere."</td><td>Show the change-impact simulator on a real backlog item. Mapping code is cheap to write and costs nothing to read; coupling costs every sprint. Offer CRUD for generic areas.</td></tr>
<tr><td>"We do not have time to refactor."</td><td>Agree – no big refactor. New rules go into the new model; touched code moves. Track frozen ArchUnit violations shrinking.</td></tr>
<tr><td>"Just put @Transactional on the service."</td><td>Fine as a team decision – record it in an ADR and add an ArchUnit rule restricting it to application services. Consistency matters more than purity.</td></tr>
<tr><td>"Microservices will fix it."</td><td>Distribution makes bad boundaries worse. Prove boundaries inside a modular monolith first (module 13).</td></tr>
<tr><td>"Domain experts have no time."</td><td>Ask for 3 hours once (Event Storming) and 5 minutes per refinement. Show them their words in the code and tests – they usually come back.</td></tr>
</table>

<h3>Metrics that matter</h3>
<ul>
<li><b>DORA</b>: deployment frequency, lead time for changes, change failure rate, time to restore.</li>
<li><b>Test feedback time</b>: domain + application tests should run in under a minute.</li>
<li><b>Architecture drift</b>: frozen ArchUnit violation count, trend only.</li>
<li><b>Rule locality</b>: for the last 10 business-rule changes, how many files outside <code>domain</code> changed?</li>
<li><b>Integration health</b>: outbox lag p95, consumer DLQ count, contract-test failures caught in CI vs production.</li>
<li><b>People</b>: number of engineers who have led a kata, an Event Storming or a design review.</li>
</ul>
<div class="callout pitfall"><strong>Do not</strong><p>Turn metrics into targets for individuals, or report "DDD adoption %". Metrics are for the team to steer, shown as trends.</p></div>

<h3>Assess where your team is</h3>
<div data-sim="maturity"></div>

<div class="callout lead"><strong>Your role as architect</strong><p>Hold the map, the language and the boundaries. Let the team own the solutions inside them. The best sign that you are succeeding is a design review you did not need to attend, where the team used the checklist, cited an ADR and corrected a boundary violation themselves.</p></div>

<div data-quiz="m15"></div>
`,
  });

  Course.quiz('m15', [
    { q: 'Best first technical move in a legacy screening codebase?', options: ['Rewrite in Micronaut from scratch', 'Event Storm one valuable flow, build its aggregate with invariant tests behind ports, add ArchUnit with freezing', 'Introduce microservices', 'Rename all packages'], answer: 1, why: 'One visible slice delivers value and becomes the reference for everything else.' },
    { q: 'When should you write an ADR?', options: ['For every PR', 'For decisions that are costly to reverse', 'Only for technology choices', 'Never; use Slack'], answer: 1, why: 'ADRs capture context and alternatives for significant, hard-to-reverse decisions.' },
    { q: 'The team insists on <code>@Transactional</code> in application services. A good architect…', options: ['Forbids it', 'Accepts it if recorded in an ADR and constrained by an ArchUnit rule', 'Ignores it', 'Escalates to management'], answer: 1, why: 'Consistency and enforcement matter more than purity.' },
    { q: 'Which metric best shows architecture improving?', options: ['Lines of code', 'Number of classes', 'Trend of frozen ArchUnit violations and rule-change locality', 'Hours worked'], answer: 2, why: 'They measure the property you care about: boundaries holding and rules being local.' },
    { q: 'The strongest sign your leadership is working?', options: ['You approve every design', 'The team catches boundary violations in reviews without you', 'Everyone uses the same IDE', 'Documentation is long'], answer: 1, why: 'Leadership scales when the team owns the practices.' },
  ]);
})();
