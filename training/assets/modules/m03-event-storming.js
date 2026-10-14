(function () {
  const { fig } = Course;
  Course.module({
    id: 'event-storming', num: 3, level: 'Foundation', minutes: 50,
    title: 'Event Storming: discovering the model with the business',
    lead: 'The fastest way to get engineers and domain experts to the same understanding – and to find aggregates, events and boundaries.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain the three levels of Event Storming and when to run each.</li>
<li>Use the colour grammar correctly.</li>
<li>Facilitate a 3-hour process-level session, in person or remote.</li>
<li>Turn a board into aggregates, commands, events, policies and open questions.</li>
</ul></div>

<h3>What it is</h3>
<p>Event Storming (Alberto Brandolini) is a workshop where domain experts and engineers place sticky notes for <b>domain events</b> – things that happened, in the past tense – on a long timeline, then progressively add what causes them and what they cause. It works because everyone can contribute an event ("Case Closed") without knowing any modelling notation.</p>

<h3>Three levels</h3>
<table>
<tr><th>Level</th><th>Question</th><th>Who</th><th>Output</th></tr>
<tr><td><b>Big picture</b></td><td>How does the whole business flow, end to end?</td><td>15–25 people across departments</td><td>Timeline, pivotal events, hotspots, candidate bounded contexts.</td></tr>
<tr><td><b>Process level</b></td><td>How does one process work, rule by rule?</td><td>5–10: experts, engineers, product</td><td>Commands, actors, policies, read models, external systems.</td></tr>
<tr><td><b>Design level</b></td><td>Which aggregate accepts each command and protects which rule?</td><td>The delivery team + 1–2 experts</td><td>Aggregates, invariants, event payloads – ready to code.</td></tr>
</table>

<h3>The colour grammar</h3>
${fig('04-event-storming', 'A process-level board for screening a party. Each colour has exactly one meaning.')}
<table>
<tr><th>Colour</th><th>Element</th><th>Rule</th></tr>
<tr><td style="background:#F4A261">Orange</td><td>Domain event</td><td>Past tense, business language: "Match Resolved". Never "Match updated in DB".</td></tr>
<tr><td style="background:#7EC8E3">Blue</td><td>Command</td><td>Imperative intention: "Resolve match". Can be rejected.</td></tr>
<tr><td style="background:#FFF3B0">Pale yellow (small)</td><td>Actor</td><td>Who issues the command: "Compliance analyst".</td></tr>
<tr><td style="background:#FFE066">Yellow (large)</td><td>Aggregate</td><td>Accepts or rejects the command, emits events: "Screening Case".</td></tr>
<tr><td style="background:#C3AED6">Lilac</td><td>Policy</td><td>"Whenever X, then Y": reactive logic, automatic or manual.</td></tr>
<tr><td style="background:#9BE7A0">Green</td><td>Read model</td><td>Information a person needs to decide: "Analyst work queue".</td></tr>
<tr><td style="background:#F7A1C4">Pink</td><td>External system</td><td>Another context or third party: "Risk data corpus".</td></tr>
<tr><td style="background:#E76F6F;color:#fff">Red</td><td>Hotspot</td><td>Question, conflict, risk. Never resolve it on the spot; mark it.</td></tr>
</table>

<div data-sim="event-storming"></div>

<h3>Running a process-level session (3 hours)</h3>
<ol class="step-list" style="cursor:default">
<li><b>Prepare (before).</b> Pick one process ("screen and remediate a party"). Invite 2–3 analysts, a compliance SME, product, 3–4 engineers. Book a room with 6 m of wall, or a Miro board with the colour legend pre-built.</li>
<li><b>Chaotic exploration (25 min).</b> Everyone writes orange events silently, places them roughly in time. No discussion yet. Quantity over quality.</li>
<li><b>Enforce the timeline (20 min).</b> Walk left to right. Merge duplicates, discuss names. This is where language conflicts surface: mark them red.</li>
<li><b>Pivotal events (10 min).</b> Mark the few events that change everything ("Case Screened", "Case Closed"). They often border sub-processes.</li>
<li><b>Commands and actors (30 min).</b> For each event: who or what caused it? Add blue commands and actors.</li>
<li><b>Policies and external systems (30 min).</b> Where does something happen automatically? "Whenever a profile is updated → rescreen affected cases".</li>
<li><b>Read models (15 min).</b> What did the actor need to see to decide?</li>
<li><b>Hotspot triage (20 min).</b> Vote on the top 3 hotspots; assign an owner and a date to each.</li>
<li><b>Aggregates (20 min, design level preview).</b> Group commands that must be consistent together. Name the aggregate after the business concept, not a table.</li>
</ol>
<div class="callout lead"><strong>Facilitator rules</strong><ul>
<li>You hold the markers' grammar, not the content. Correct colours; never correct the business.</li>
<li>Domain experts talk, engineers ask. If engineers start designing tables, park it.</li>
<li>Photograph the board every 30 minutes. Transcribe within 24 hours into the repo (<code>docs/event-storming/YYYY-MM-DD-process.md</code>).</li>
<li>Hotspots are the most valuable output. A board with no red notes means people were not honest.</li>
</ul></div>

<h3>From board to code</h3>
<p>The board in the diagram produced these design decisions in the code lab:</p>
<table>
<tr><th>On the board</th><th>In the code</th></tr>
<tr><td>Aggregate "Screening Case" receives all four commands</td><td>One aggregate root <code>ScreeningCase</code> with <code>open</code>, <code>screen</code>, <code>resolveMatch</code>, <code>close</code></td></tr>
<tr><td>Events Case Opened / Screened / Match Resolved / Closed</td><td>Records in <code>domain/event</code>, permitted by a sealed <code>DomainEvent</code></td></tr>
<tr><td>Hotspot "Who may downgrade a positive?"</td><td>Invariant + rule code <code>FOUR_EYES</code> and a test</td></tr>
<tr><td>External system "Risk data corpus"</td><td>Driven port <code>ReferenceDataSource</code> and an ACL adapter</td></tr>
<tr><td>Policy "Whenever closed with risk → notify client"</td><td>Integration event via outbox; another context reacts (module 13)</td></tr>
<tr><td>Read model "Analyst work queue"</td><td>Not built in the lab – a CQRS projection exercise (module 13)</td></tr>
</table>
<div class="callout expert"><strong>Design-level tip</strong><p>For each aggregate, list its invariants as sentences experts agree with ("A case can only close after at least one screening, with no UNRESOLVED or POSSIBLE matches"). If you cannot write any invariant, it probably is not an aggregate – it may be a read model or plain data.</p></div>

<div data-quiz="m03"></div>
`,
  });

  Course.quiz('m03', [
    { q: 'Which sticky is a correct <b>domain event</b>?', options: ['Resolve match', 'Match table updated', 'Match Resolved', 'Analyst'], answer: 2, why: 'Domain events are past-tense business facts. "Table updated" is technical; "Resolve match" is a command.' },
    { q: '"Whenever a sanctions profile changes, rescreen affected cases" is a…', options: ['Command', 'Policy', 'Read model', 'Aggregate'], answer: 1, why: 'Whenever-then reactive logic is a policy (lilac).' },
    { q: 'What should a facilitator do when two experts disagree about a rule?', options: ['Decide for them', 'Ask engineers to vote', 'Mark a red hotspot, note both views, and move on', 'Remove the stickies'], answer: 2, why: 'Hotspots capture conflict without derailing the session; they get an owner during triage.' },
    { q: 'Which level is best for discovering candidate bounded contexts across the business?', options: ['Design level', 'Big picture', 'Process level', 'Code review'], answer: 1, why: 'Big picture spans departments and reveals where language and ownership change.' },
    { q: 'A design-level aggregate is identified by…', options: ['A database table', 'A set of commands that must be consistent together, protecting named invariants', 'A REST resource', 'The largest group of events'], answer: 1, why: 'Aggregates are consistency boundaries around invariants, not tables or resources.' },
  ]);
})();
