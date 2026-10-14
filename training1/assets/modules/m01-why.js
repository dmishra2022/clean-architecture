(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'why', num: 1, level: 'Foundation', minutes: 45,
    title: 'Why architecture: policy, details and the cost of change',
    lead: 'The goal of architecture is to minimise the human resources needed to build and maintain a system. Clean Architecture gets there by separating policy from details – and making details depend on policy.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>State the goal of software architecture in one sentence and defend it to a product manager.</li>
<li>Distinguish <b>policy</b> (business rules) from <b>details</b> (database, web, frameworks, devices).</li>
<li>Explain the two values of software – behaviour and structure – and why structure usually wins.</li>
<li>Compare Clean Architecture with layered and hexagonal styles and say what each one optimises.</li>
</ul></div>

<h3>The goal</h3>
<blockquote>"The goal of software architecture is to minimize the human resources required to build and maintain the required system." – Robert C. Martin</blockquote>
<p>Everything else follows. A system whose cost per feature rises every quarter has a bad architecture, however modern its frameworks. A system where the cost per feature stays flat has a good one, however boring it looks.</p>
<p>Software has two values. <b>Behaviour</b> – it does what the bank needs today. <b>Structure</b> – it can be changed to do what the bank needs tomorrow. Product owners see only the first. Architects are paid to protect the second, because a system that works but cannot change soon stops working (new regulation, new provider, new client) – while a system that is easy to change but broken can be fixed.</p>

<h3>Policy and details</h3>
<p>Every system is made of two kinds of thing:</p>
<table>
<tr><th>Policy – the reason the system exists</th><th>Details – how it touches the world</th></tr>
<tr><td>A case cannot close while a match is POSSIBLE.<br>A confirmed POSITIVE needs a second analyst to downgrade.<br>Reference data is fetched outside the write transaction.<br>Opening twice with the same key returns the same case.<br>HIGH priority means an unresolved match scoring ≥ 95.</td>
<td>H2 today, PostgreSQL tomorrow.<br>HTTP + JSON, maybe a CLI and a batch file.<br>Micronaut 4, maybe something else in 2030.<br>Log sink today, Kafka next quarter.<br>The reference-data provider's field names.</td></tr>
</table>
<p>Policy is what compliance officers care about and what auditors check. Details are necessary, but they are <i>replaceable</i> and they are where most change comes from. A good architecture lets you <b>defer decisions about details</b> – choose the database after you understand the access patterns – and <b>replace details</b> without touching policy.</p>
<div class="callout rule"><strong>The one sentence to remember</strong><p>Details depend on policy, never the other way round. The database is a detail. The web is a detail. The framework is a detail.</p></div>

<p>Here is the opposite: the kind of service most teams start from. Policy and details are woven into one method, so every change to either touches the same class. Modules 6–7 take it apart and module 16 migrates it step by step.</p>
${code('java', `
@Controller("/cases")                                  // a detail
public class CaseService {
    @Inject JdbcTemplate jdbc;                         // a detail
    @Inject KafkaProducer<String, String> kafka;       // a detail

    @Put("/{id}/matches/{matchId}/resolution")
    public HttpResponse<?> resolve(String id, String matchId, @Body Map<String, String> body) {
        CaseEntity c = jdbc.queryForObject("SELECT * FROM cases WHERE id = ?", CASE_MAPPER, id);
        if (c.getStatus().equals("CLOSED")) return HttpResponse.unprocessableEntity();     // policy
        MatchEntity m = c.getMatches().stream().filter(x -> x.getId().equals(matchId)).findFirst().orElseThrow();
        if (m.getResolution().equals("POSITIVE") && m.getResolvedBy().equals(body.get("analystId"))
                && !body.get("resolution").equals("POSITIVE"))
            return HttpResponse.unprocessableEntity();                                      // policy: four eyes
        m.setResolution(body.get("resolution"));                                            // setters everywhere
        m.setResolvedBy(body.get("analystId"));
        jdbc.update("UPDATE matches SET resolution = ?, resolved_by = ? WHERE id = ?", …);  // a detail
        kafka.send(new ProducerRecord<>("cases", id, "{\\"type\\":\\"MatchResolved\\"}")); // dual write
        return HttpResponse.ok(c);                                                          // JPA-style entity as JSON
    }
}`, 'legacy/CaseService.java – the starting point for the extract-a-use-case kata')}
<p>Count the reasons this class changes: a new rule, a new column, a new HTTP status, a new topic, a new JSON field. That is five actors behind one class – the opposite of the single-responsibility principle you meet in module 2.</p>

<h3>Try it: what does a change cost?</h3>
<p>Seven change requests from a real screening backlog. On the left a typical layered service with an anemic model; on the right the code lab. Predict how many places each change touches before you select it.</p>
<div data-sim="change-impact"></div>
<p>Notice the third number: in the Clean build, a change only recompiles its own ring <i>and the rings outside it</i>. Changing the presenter never rebuilds the entities. That is the dependency rule showing up in your build times.</p>

<h3>Clean, hexagonal, onion, layered</h3>
${fig('03-architecture-mapping', 'The same service drawn three ways. Clean and hexagonal agree on the essential rule; Clean adds explicit request/response models, presenters and one module per ring.')}
<p>Clean Architecture (2012) is Uncle Bob's synthesis of Hexagonal (Cockburn, 2005), Onion (Palermo, 2008), DCI and BCE. They share one idea: <b>business rules at the centre, independent of UI, database and frameworks</b>, with dependencies pointing inward. What Clean adds is precision about the boundary itself:</p>
<ul>
<li><b>Four named rings</b> instead of "inside/outside": enterprise rules and application rules are kept apart.</li>
<li><b>Input boundary + interactor + output boundary</b>: the use case does not return to the controller, it calls a presenter.</li>
<li><b>Request and response models</b>: plain data structures cross the boundary, never entities.</li>
<li><b>The Main component</b>: one deliberately dirty place that creates everything.</li>
<li><b>Component principles</b>: rules for how to split the code into deployable units (module 3).</li>
</ul>
<div class="callout lead"><strong>Is it worth the extra types?</strong><p>The lab has 110 production source files against 70 in the hexagonal lab. Twelve of them are the work queue, a feature the hexagonal lab does not have; for the same features it is 98 against 70 – about 40 % more, mostly request/response models, presenters and the record interfaces between rings 3 and 4. That cost is real. It pays when you have <b>several delivery mechanisms</b>, <b>strict audit or regulatory rules</b> you must test in isolation, or <b>many teams</b> who need hard module boundaries. For a small CRUD service it does not – module 9 shows cheaper partial boundaries.</p></div>

<h3>Screaming architecture</h3>
<p>Open <code>screening-usecases/src/main/java/training/clean/screening/usecases</code>. The folders are <code>opencase</code>, <code>screencase</code>, <code>resolvematch</code>, <code>closecase</code>, <code>viewcase</code>, <code>workqueue</code>. The architecture screams <i>"case screening"</i>, not <i>"Micronaut app"</i> or <i>"controllers, services, repositories"</i>. A new joiner learns what the system does from the folder list.</p>
${code('text', `
screening-usecases/src/main/java/training/clean/screening/usecases/
├── opencase/       OpenCase, OpenCaseInteractor, OpenCaseRequest
├── screencase/     ScreenCase, ScreenCaseInteractor, ScreenCaseRequest
├── resolvematch/   ResolveMatch, ResolveMatchInteractor, ResolveMatchRequest
├── closecase/      CloseCase, CloseCaseInteractor, CloseCaseRequest
├── viewcase/       ViewCase, ViewCaseInteractor, ViewCaseRequest
├── workqueue/      ListWorkQueue, ListWorkQueueInteractor, WorkQueueGateway, …
├── shared/         CaseOutputBoundary, CaseResponse, Outcomes, CaseLookup
└── gateway/        CaseGateway, EventOutboxGateway, ReferenceDataGateway, TransactionRunner, …
`, 'tree')}

<div class="callout pitfall"><strong>What Clean Architecture is not</strong><ul>
<li>Not "controllers → services → repositories" with new names. If the service imports the repository class, it is layered.</li>
<li>Not "every class gets an interface". Interfaces exist at <b>boundaries</b>, owned by the inner side.</li>
<li>Not a folder template. A codebase can have folders called <code>entities</code> and <code>usecases</code> and still break the dependency rule everywhere.</li>
</ul></div>

<div data-quiz="m01"></div>
`,
  });

  Course.quiz('m01', [
    { q: 'According to Uncle Bob, what is the goal of software architecture?', options: ['To use the best frameworks', 'To minimise the human resources needed to build and maintain the system', 'To maximise performance', 'To have one class per responsibility'], answer: 1, why: 'Everything in the book is a means to keep the cost of change low over the life of the system.' },
    { q: 'Which of these is <b>policy</b>?', options: ['Cases are stored in PostgreSQL', 'Events are published to Kafka', 'A POSITIVE can only be downgraded by a different analyst', 'The API uses JSON'], answer: 2, why: 'Four-eyes is a business rule. The others are details that could change without the rule changing.' },
    { q: 'A system works perfectly today but every change takes weeks. A second system has bugs but is easy to change. Which is more valuable long-term?', options: ['The first – behaviour is what users pay for', 'The second – a changeable system can be fixed; an unchangeable one will stop meeting needs', 'Neither', 'They are equal'], answer: 1, why: 'Requirements always change. Structure is the value that lets behaviour keep up.' },
    { q: 'What does Clean Architecture add on top of hexagonal?', options: ['Nothing – they are identical', 'A database abstraction layer', 'Separate enterprise and application rings, request/response models, presenters via an output boundary, and component principles', 'Microservices'], answer: 2, why: 'The core rule is shared; Clean is more precise about what crosses the boundary and how code is split into components.' },
    { q: 'In the code lab, changing the CasePresenter recompiles…', options: ['All four modules', 'screening-interface-adapters and screening-app only', 'Only screening-entities', 'screening-usecases and screening-entities'], answer: 1, why: 'A change rebuilds its own module and the modules that depend on it – which are always further out.' },
  ]);
})();
