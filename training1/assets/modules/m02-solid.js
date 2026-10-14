(function () {
  const { code } = Course;
  Course.module({
    id: 'solid', num: 2, level: 'Foundation', minutes: 55,
    title: 'SOLID: the design principles under every ring',
    lead: 'Clean Architecture is SOLID applied at the scale of components. Learn the five principles as Uncle Bob means them – with the screening code that obeys or breaks each one.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>State each SOLID principle in its precise, actor-based form.</li>
<li>Point to the code-lab class that applies each principle and say what would break without it.</li>
<li>Recognise SOLID violations in a code review and name the fix.</li>
<li>Explain why the Dependency Inversion Principle is the one that makes the rings possible.</li>
</ul></div>

<h3>S – Single Responsibility: one actor per module</h3>
<blockquote>"A module should be responsible to one, and only one, actor."</blockquote>
<p>Not "a class should do one thing" – that is a rule for functions. SRP is about <b>who asks for changes</b>. In screening there are at least four actors: compliance (matching rules, four-eyes), the analyst team lead (triage order), the UI team (labels, actions) and operations (exports, monitoring). Code that serves two actors will be broken by one while the other is changing it.</p>
<p>The lab separates them on purpose:</p>
<table>
<tr><th>Actor</th><th>Asks for</th><th>Changes only</th></tr>
<tr><td>Compliance</td><td>"POSSIBLE matches must block closure"</td><td><code>ScreeningCase</code>, <code>Resolution.blocksClosure()</code></td></tr>
<tr><td>Analyst team lead</td><td>"HIGH from score 90"</td><td><code>ListWorkQueueInteractor.HIGH_PRIORITY_SCORE</code></td></tr>
<tr><td>UI team</td><td>"Show 'Waiting for analyst review'"</td><td><code>CasePresenter.STATUS_LABELS</code></td></tr>
<tr><td>Operations</td><td>"Publish to Kafka"</td><td>a new <code>IntegrationEventSink</code> + <code>MainWiring</code></td></tr>
</table>
${code('java', String.raw`
/**
 * Application-specific business rule: how the analyst team triages its work. It is not an enterprise rule (another
 * application over the same cases, such as a regulator report, would order them differently), so it lives here
 * and not in the entities.
 */
public final class ListWorkQueueInteractor implements ListWorkQueue {

    public static final int HIGH_PRIORITY_SCORE = 95;
    public static final int MAX_LIMIT = 100;`, 'screening-usecases/…/workqueue/ListWorkQueueInteractor.java')}

<h3>O – Open/Closed: extend without editing</h3>
<blockquote>"A software artifact should be open for extension but closed for modification."</blockquote>
<p>At architecture scale, OCP means: <b>higher-level components are protected from changes in lower-level ones</b>. The interactors are the most protected code in the lab after the entities. Adding a CLI, a CSV report or a Kafka sink adds new classes in rings 3 and 4 and changes nothing in rings 1 and 2. The output boundary is what makes this work – an interactor calls <code>presenter.presentCase(response)</code> and never learns what a presenter does with it.</p>

<h3>L – Liskov Substitution: honour the contract</h3>
<p>Any implementation of an interface must be usable wherever the interface is expected, <b>including the parts of the contract written in Javadoc</b>. <code>CaseGateway.save</code> promises to throw <code>ConcurrentCaseUpdateException</code> if a newer version was saved first. A test fake that ignores versions compiles and passes tests – and lets a 409 bug ship. That is why the lab's <code>InMemoryCaseRecords</code> checks versions exactly like the database.</p>
${code('java', String.raw`
public interface CaseGateway {

    Optional<ScreeningCase> findById(CaseId id);

    /**
     * Inserts a new case or updates an existing one.
     *
     * @throws ConcurrentCaseUpdateException if another transaction saved a newer version first
     */
    void save(ScreeningCase screeningCase);
}`, 'screening-usecases/…/gateway/CaseGateway.java')}

<h3>I – Interface Segregation: depend only on what you use</h3>
<p>Fat interfaces create unnecessary coupling: a change to a method you never call still forces a recompile and a redeploy. The lab splits by client:</p>
<ul>
<li><code>WorkQueueGateway</code> has one method and lives in the <code>workqueue</code> package, next to the only interactor that uses it – not on <code>CaseGateway</code>.</li>
<li><code>WorkQueueOutputBoundary</code> is separate from <code>CaseOutputBoundary</code>, so a case presenter never implements <code>presentWorkQueue</code>.</li>
<li><code>TransactionRunner</code> has <code>read</code> and <code>write</code> – nothing about JDBC, isolation levels or connections.</li>
</ul>

<h3>D – Dependency Inversion: the principle behind the rings</h3>
<blockquote>"The most flexible systems are those in which source code dependencies refer only to abstractions, not to concretions."</blockquote>
<p>The use case needs to store a case. Naively, <code>ScreenCaseInteractor</code> would import <code>SqlCaseGateway</code> – policy depending on detail. DIP flips it: ring 2 <b>declares</b> the interface it needs in its own language, ring 3 <b>implements</b> it. The call still goes outward at runtime; the source dependency now points inward.</p>
${code('java', String.raw`
// ring 2 owns the abstraction
public interface CaseGateway { Optional<ScreeningCase> findById(CaseId id); void save(ScreeningCase c); }

// ring 3 implements it – the arrow points inward
public final class SqlCaseGateway implements CaseGateway { /* records ↔ snapshot */ }

// ring 4 is the only place that chooses the concretion
@Singleton
CaseGateway caseGateway(CaseRecords records) {
    return new SqlCaseGateway(records);
}`, 'rings 2, 3 and 4')}
<div class="callout rule"><strong>DIP has one exception: the Main component</strong><p>Something must call <code>new SqlCaseGateway(...)</code>. Uncle Bob concentrates every such call in one place – <code>MainWiring</code> – so the rest of the system can depend only on abstractions. Module 8 covers it.</p></div>
<div class="callout pitfall"><strong>Stable concretions are fine</strong><p>DIP does not mean "wrap <code>String</code>, <code>List</code> and <code>Instant</code>". Depend freely on concrete things that almost never change. Wrap the <b>volatile</b> concretions: databases, frameworks, remote services, the clock (that is why interactors take a <code>Clock</code>).</p></div>

<h3>Try it: name the principle</h3>
<div data-sim="solid-detector"></div>

<div data-quiz="m02"></div>
`,
  });

  Course.quiz('m02', [
    { q: 'Uncle Bob\'s SRP says a module should…', options: ['Do exactly one thing', 'Have fewer than 200 lines', 'Be responsible to one, and only one, actor', 'Have one public method'], answer: 2, why: '"Do one thing" is a rule for functions. SRP is about the people whose requests change the code.' },
    { q: 'Why does <code>WorkQueueGateway</code> live in the <code>workqueue</code> package instead of being methods on <code>CaseGateway</code>?', options: ['Interface Segregation (and common closure): only ListWorkQueueInteractor uses it, so others should not depend on it', 'Liskov substitution', 'Java requires one interface per package', 'Performance'], answer: 0, why: 'Clients should not depend on methods they do not use; a change to triage queries then touches one package.' },
    { q: 'A test fake for <code>CaseGateway</code> never throws ConcurrentCaseUpdateException. Which principle is at risk?', options: ['SRP', 'OCP', 'ISP', 'LSP'], answer: 3, why: 'The fake weakens the documented contract, so code that works with the fake may fail with the real implementation.' },
    { q: 'Which statement describes Dependency Inversion in the lab?', options: ['Interactors create their gateways with new', 'Ring 2 declares CaseGateway; ring 3 implements it; ring 4 chooses the implementation', 'Ring 3 declares interfaces that ring 2 implements', 'Micronaut injects into the entities'], answer: 1, why: 'The interface is owned by the policy side, so the source dependency points from detail to policy.' },
    { q: 'Adding a CSV export presenter requires editing which interactors?', options: ['All of them', 'Only CloseCaseInteractor', 'None – the output boundary keeps interactors closed for modification', 'ViewCaseInteractor only'], answer: 2, why: 'A new implementation of CaseOutputBoundary extends the system without changing ring 2. That is OCP at the architecture level.' },
  ]);
})();
