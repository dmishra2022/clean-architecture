(function () {
  const { code } = Course;
  Course.module({
    id: 'antipatterns', num: 15, level: 'Leader', minutes: 70,
    title: 'Anti-patterns and code review: keeping the rings clean',
    lead: 'Architectures rot one reasonable-looking pull request at a time. Learn the recurring Clean Architecture anti-patterns, the review comment that fixes each, and practise on five real PRs.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Spot the ten most common Clean Architecture anti-patterns in a diff.</li>
<li>Write review comments that explain the rule, the risk and the fix – not just "wrong ring".</li>
<li>Recognise over-engineering as an anti-pattern too, and know when to propose a partial boundary.</li>
</ul></div>

<h3>Anti-patterns that break the rule</h3>
<table>
<tr><th>Anti-pattern</th><th>Symptom in a diff</th><th>Fix</th></tr>
<tr><td><b>Framework in the core</b></td><td><code>@Serdeable</code>, <code>@MappedEntity</code>, <code>@Singleton</code> or <code>jakarta.*</code> in rings 1–3</td><td>Annotations stay in ring 4: <code>@SerdeImport</code>, <code>*Row</code> records, <code>MainWiring</code>.</td></tr>
<tr><td><b>Entities across the boundary</b></td><td>A presenter or view model reads <code>ScreeningCase</code></td><td>Response models of plain data; ArchUnit <code>webAdaptersSeeResponseModelsNotEntities</code>.</td></tr>
<tr><td><b>Interface in the wrong ring</b></td><td><code>CaseGateway</code> moved into <code>adapters.persistence</code></td><td>Interfaces belong to their client. Ring 2 owns its gateways.</td></tr>
<tr><td><b>Use case returns HTTP</b></td><td><code>HttpResponse</code>, status codes or <code>ResponseEntity</code> in an interactor</td><td>Output boundary + presenter.</td></tr>
<tr><td><b>Controller logic</b></td><td>try/catch on domain exceptions in a controller; business ifs in a controller</td><td>Controllers check shape and build requests; <code>Outcomes</code> turns failures into presenter calls.</td></tr>
<tr><td><b>Endpoint skips the controller</b></td><td><code>CaseEndpoint</code> calls an input boundary directly</td><td>Endpoint is humble: plain values to the controller, view model back.</td></tr>
<tr><td><b>Use case calls use case</b></td><td><code>CloseCaseInteractor</code> injects <code>ViewCase</code></td><td>Shared logic in <code>usecases.shared</code>; ArchUnit slices rule.</td></tr>
<tr><td><b>Configuration inside</b></td><td>An interactor injects <code>MatchingProperties</code></td><td>Main reads configuration and passes plain values.</td></tr>
</table>

<h3>Anti-patterns that waste the rule</h3>
<table>
<tr><th>Anti-pattern</th><th>Symptom</th><th>Fix</th></tr>
<tr><td><b>Anemic entities, fat interactors</b></td><td>Interactors full of <code>if (status == …)</code>; entities with setters</td><td>Move enterprise rules into the aggregate (module 5). Interactors orchestrate.</td></tr>
<tr><td><b>Ceremony everywhere</b></td><td>Four modules and presenters for a notifications CRUD service</td><td>Partial boundaries (module 9). Spend ceremony in the core.</td></tr>
<tr><td><b>Interface per class</b></td><td><code>ICasePresenter</code>, <code>ICaseMapper</code>, <code>IClock</code> with one implementation and no boundary</td><td>Interfaces at boundaries, owned by the inner side. Not elsewhere.</td></tr>
<tr><td><b>Mapper explosion</b></td><td>Six near-identical DTOs per case, generated mappers nobody reads</td><td>Each model must exist for a <i>reason</i> (a ring or a contract). The lab has exactly one per crossing.</td></tr>
<tr><td><b>Mock-only tests</b></td><td>Every gateway mocked with <code>when(...).thenReturn(...)</code>; tests break on every refactor</td><td>Contract-honouring fakes (<code>TestWorld</code>), assertions on presenter calls.</td></tr>
</table>
<div class="callout lead"><strong>How to write the comment</strong><p>A good architecture review comment has three parts: <b>the rule</b> ("presenters receive response models, not entities"), <b>the risk</b> ("the API changes whenever the aggregate does, and the UI can call domain methods"), and <b>the fix</b> ("add the field to CaseResponse and map it in CasePresenter"). Link the module of this course or the ADR. Never just write "wrong layer".</p></div>

<h3>Practise: five pull requests</h3>
<div data-sim="code-review"></div>

<h3>A review checklist for Clean services</h3>
${code('text', `
□ No framework import in entities / usecases / adapters (compile + ArchUnit)
□ New gateway interface declared in the ring that uses it, in its language
□ Request model holds plain values; response model holds plain values
□ Interactor: values → transaction → one aggregate method → save → outbox → response → present
□ Every outcome goes through the output boundary (no exceptions to the controller)
□ Presenter is the only place with status codes, labels, actions
□ New concrete class wired in MainWiring, exposed by its interface
□ Tests at the lowest ring that can catch the bug; fakes honour contracts
□ Published-language change? schemaVersion and consumers considered
□ Is this the core domain? If not, is the full boundary worth it?
`, 'review-checklist.txt')}

<div data-quiz="m15"></div>
`,
  });

  Course.quiz('m15', [
    { q: 'A PR adds <code>try { … } catch (DomainException e) { return 422 }</code> in CaseController. Best review comment?', options: ['"Wrong layer"', '"Failures are outcomes of the use case: Outcomes.presentingFailures already calls presentRuleViolation, and the presenter is the single place for status codes. This duplicates it and misses 409."', '"Use a global exception handler"', 'Approve'], answer: 1, why: 'Rule, risk and fix. The duplicated mapping also drifts – it forgot ConcurrentCaseUpdateException.' },
    { q: 'Which is an anti-pattern of <b>wasting</b> Clean Architecture rather than breaking it?', options: ['@Serdeable on ScreeningCase', 'An interface for every class, with one implementation and no boundary', 'An interactor returning HttpResponse', 'CaseGateway in adapters.persistence'], answer: 1, why: 'Interfaces belong at boundaries. Elsewhere they are cost without benefit.' },
    { q: 'An interactor contains five <code>if (status == …)</code> checks before calling setters on the case. The fix is…', options: ['Move the checks into the controller', 'Move the enterprise rules into ScreeningCase methods; the interactor orchestrates', 'Add more tests', 'Split the interactor into five'], answer: 1, why: 'Anemic entities with fat interactors put enterprise rules in ring 2, where other use cases can bypass them.' },
    { q: 'A team proposes the full four-module design for an internal notifications service. Your response?', options: ['Approve – consistency matters most', 'Suggest a partial boundary or the framework directly: it is a generic subdomain and the ceremony will not pay back', 'Reject Clean Architecture entirely', 'Ask for six modules'], answer: 1, why: 'Architects choose boundaries per context. Ceremony belongs in the core.' },
  ]);
})();
