(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'mission-control', num: 13, level: 'Expert', minutes: 90,
    title: 'Mission Control: run, trace and break the whole system',
    lead: 'Everything from modules 5–12, running together. Ten missions take you through the service the way production will: happy path, retries, tenants, races, outages. For each one, predict the ring that answers before you click.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Drive a case through its full lifecycle via the HTTP API and read every response.</li>
<li>For any response, name the ring and the class that decided it.</li>
<li>Reproduce and explain an idempotent replay, a tenant-isolation 404, a 409 race and an outbox backlog.</li>
<li>Reproduce the same behaviour against the real service on port 8081.</li>
</ul></div>

<h3>The system you are about to run</h3>
${fig('09-request-sequence', 'Keep this open: every request in Mission Control follows this path. Failures leave it at a predictable step.')}
<p>Mission Control runs the browser model of all four Maven modules. The tables on the right are the same four tables Flyway creates in <code>V1__screening_schema.sql</code>: <code>screening_case</code>, <code>case_match</code>, <code>outbox_event</code>, <code>idempotency_key</code>. The relay button does what <code>ScheduledOutboxRelay</code> does every two seconds.</p>
<div data-sim="mission-control"></div>

<h3>Missions</h3>
<table>
<tr><th>#</th><th>Mission</th><th>Predict, then check</th></tr>
<tr><td>1</td><td>Open "Viktor Albescu", screen, resolve each match, close.</td><td>Which status codes, which events, in what order? (201, 200…, <code>CaseOpened</code> → <code>CaseScreened</code> → <code>MatchResolved</code>… → <code>CaseClosed</code>)</td></tr>
<tr><td>2</td><td>Open with <code>Idempotency-Key: onboarding-42</code> twice.</td><td>Second call: 200 not 201, no Location, same caseId, one <code>CaseOpened</code>. Which interactor decided?</td></tr>
<tr><td>3</td><td>Switch the client group to <code>globex-bank</code> and view acme's case.</td><td>404 "Case not found" – identical to a missing case. Which class guarantees that?</td></tr>
<tr><td>4</td><td>Close straight after screening.</td><td>422 <code>MATCHES_AWAITING_REVIEW</code>. Did a row change? (No – rolled back before the presenter ran.)</td></tr>
<tr><td>5</td><td>As Anna resolve POSITIVE, then as Anna downgrade to FALSE_POSITIVE. Then as Ben.</td><td>422 <code>FOUR_EYES</code> for Anna; 200 for Ben.</td></tr>
<tr><td>6</td><td>Open an organisation with a date of birth.</td><td>400 <code>INVALID_VALUE</code> from ring 1, not <code>MALFORMED_REQUEST</code> from ring 3. Why the difference?</td></tr>
<tr><td>7</td><td>Send an empty name and country "ROU".</td><td>400 <code>MALFORMED_REQUEST</code> with two field errors, and no use case ran (no transaction in the trace).</td></tr>
<tr><td>8</td><td>Tick "next save meets a concurrent writer", then resolve.</td><td>409 <code>CONCURRENT_UPDATE</code>; follow the exception through rings 4 → 3 → 2 → 3.</td></tr>
<tr><td>9</td><td>Tick "broker down", do three actions, run the relay, untick, run again.</td><td>Relay stops at the first failure, keeps order, catches up. No event lost.</td></tr>
<tr><td>10</td><td>Move the threshold slider to 95 and screen a new case.</td><td>Fewer matches. Which ring owns the threshold value, and which ring owns the rule that uses it?</td></tr>
</table>

<h3>Two analysts, one case</h3>
<p>Mission 8 used a switch. Here is the race in slow motion, with the version check on and off:</p>
<div data-sim="concurrency"></div>

<h3>Now do it for real</h3>
${code('shell', `
cd plan/training1/code-lab
../../../mvnw -q clean install && ../../../mvnw -q -pl screening-app exec:java

BASE=localhost:8081/api/v1/client-groups/acme-bank/cases

# mission 1 – open, screen
ID=$(curl -s -X POST $BASE -H 'Content-Type: application/json' -H 'Idempotency-Key: onboarding-42' \\
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}' | jq -r .caseId)
curl -s -X POST $BASE/$ID/screenings | jq '{status, statusLabel, allowedActions, matches: [.matches[] | {matchId, profileId, score}]}'

# mission 2 – replay: 200, same caseId
curl -s -i -X POST $BASE -H 'Content-Type: application/json' -H 'Idempotency-Key: onboarding-42' \\
  -d '{"name":"Viktor Albescu","entityType":"INDIVIDUAL","dateOfBirth":"1961-03-14","country":"RO"}' | head -1

# mission 3 – other tenant: 404
curl -s localhost:8081/api/v1/client-groups/globex-bank/cases/$ID | jq

# mission 4 – too early: 422
curl -s -X POST $BASE/$ID/closure -H 'Content-Type: application/json' -d '{"analystId":"analyst-anna"}' | jq

# the triage view (ListWorkQueueInteractor)
curl -s "localhost:8081/api/v1/client-groups/acme-bank/work-queue?limit=10" | jq
`, 'terminal')}
<p>The code-lab README has a complete, verified session with every response body.</p>
<div class="callout lead"><strong>Facilitator tip</strong><p>Run missions 4, 6 and 7 back to back and ask the group to explain why one is 422 and two are 400 with different rule codes. If they can name <code>ScreeningCase</code>, a value object and <code>Forms</code>, they understand the rings.</p></div>

<div data-quiz="m13"></div>
`,
  });

  Course.quiz('m13', [
    { q: 'You POST the same body twice with the same Idempotency-Key. The second response is…', options: ['201 with a new caseId', '200 with the same caseId and no Location header', '409 Conflict', '422 DUPLICATE'], answer: 1, why: 'OpenCaseInteractor finds the key and calls presentOpened(response, false); CasePresenter chooses 200 without Location.' },
    { q: 'Close fails with 422 MATCHES_AWAITING_REVIEW. What is in outbox_event afterwards?', options: ['A CaseClosed row', 'A CaseCloseFailed row', 'Nothing new – the transaction rolled back before the presenter ran', 'A half-written row'], answer: 2, why: 'The DomainException rolled the transaction back; Outcomes then called presentRuleViolation.' },
    { q: 'An organisation with a date of birth returns 400 INVALID_VALUE, but an empty name returns 400 MALFORMED_REQUEST. Why?', options: ['Random', 'The empty name fails a shape check in Forms (ring 3, no use case runs); the organisation DOB fails a meaning check in Party (ring 1)', 'Both come from the database', 'MALFORMED_REQUEST is for organisations only'], answer: 1, why: 'Shape vs meaning: two rings, two rule codes, same status.' },
    { q: 'The broker is down for ten minutes. What happens to CaseClosed events produced meanwhile?', options: ['Lost', 'Published twice immediately', 'They wait in outbox_event; the relay stops at the first failure and publishes them in order when the broker is back', 'The close requests fail with 503'], answer: 2, why: 'The transactional outbox decouples the request from delivery: delay, not loss.' },
    { q: 'Which ring owns the <i>value</i> 80 for the matching threshold, and which owns the rule that uses it?', options: ['Both ring 1', 'Value: ring 4 (application.yml via MainWiring); rule: ring 1 (NameMatchingPolicy)', 'Value: ring 2; rule: ring 3', 'Both ring 4'], answer: 1, why: 'Configuration is a detail read at the edge; the policy that interprets it is an enterprise rule.' },
  ]);
})();
