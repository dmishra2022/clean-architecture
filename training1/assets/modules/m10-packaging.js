(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'packaging', num: 10, level: 'Practitioner', minutes: 65,
    title: 'Packaging and enforcement: making the rule impossible to break',
    lead: 'A dependency rule that lives only in a wiki page is a suggestion. The lab enforces it twice: Maven modules make wrong imports fail to compile, and ArchUnit catches what modules cannot express.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Compare the four packaging options (by layer, by feature, ports and adapters, by component / module per ring) and what enforces each.</li>
<li>Navigate the lab's modules and packages and say why each package exists.</li>
<li>Read and extend the six ArchUnit rules in <code>CleanArchitectureTest</code>.</li>
<li>Use Java visibility (package-private) as an enforcement tool.</li>
</ul></div>

<h3>"The devil is in the implementation details"</h3>
<p>Chapter 34 of <i>Clean Architecture</i>, written by Simon Brown, makes an uncomfortable point: a beautiful diagram means nothing if the code lets anyone call anything. Everything <code>public</code> in one module means every dependency is one auto-import away. The question is not "what do we intend?" but "<b>what stops the wrong import?</b>"</p>
${fig('14-packaging-options', 'The same code packaged four ways, and what happens when someone writes "CaseController imports SqlCaseGateway".')}
<div data-sim="packaging-explorer"></div>

<h3>The lab's layout</h3>
${fig('10-module-structure', 'Four Maven modules, one per ring. Packages inside each module are organised by use case or by adapter kind.')}
${code('text', `
code-lab/
├── pom.xml                                   parent: Java 21, dependencyManagement, module order
├── screening-entities/                       ring 1 – no dependencies
│   └── …/entities/{model, event, policy}, DomainException
├── screening-usecases/                       ring 2 – depends on entities
│   └── …/usecases/{opencase, screencase, resolvematch, closecase, viewcase, workqueue, shared, gateway}
├── screening-interface-adapters/             ring 3 – depends on usecases
│   └── …/adapters/{web, persistence, events, reference}
└── screening-app/                            ring 4 – Micronaut, depends on all three
    └── …/app/{config, web, persistence, events, reference}, Application
        resources/application.yml, db/migration/V1__screening_schema.sql
`, 'tree')}
<p>Ring 4 mirrors ring 3's package names (<code>web</code>, <code>persistence</code>, <code>events</code>, <code>reference</code>) so the humble half of each pair is easy to find. Most ring-4 classes are <b>package-private</b> – <code>CaseEndpoint</code>, <code>MicronautCaseRecords</code>, <code>ScheduledOutboxRelay</code> – because nothing should call them but the framework.</p>

<h3>Layer 1 of enforcement: the compiler</h3>
<p>Because <code>screening-entities/pom.xml</code> has no dependency on <code>screening-usecases</code>, this does not compile:</p>
${code('text', `
[ERROR] screening-entities/src/main/java/.../ScreeningCase.java:[12,46]
        package training.clean.screening.usecases.shared does not exist
[ERROR] BUILD FAILURE
`, 'mvn install')}
<p>And adding the reverse dependency to the pom fails the reactor with a cycle. Between rings, the rule cannot be broken by accident.</p>

<h3>Layer 2 of enforcement: ArchUnit</h3>
<p>Modules cannot express everything. "Rings 1–3 use no framework" is true today because no pom adds Micronaut – but nothing stops someone adding it. "Use cases don't depend on each other" is inside one module. "Only Main constructs interactors" is about one class in ring 4. The lab encodes these as tests in <code>screening-app</code>, where all four rings are on the classpath:</p>
${code('java', String.raw`
@Test
void dependenciesPointInwards() {
    layeredArchitecture()
            .consideringOnlyDependenciesInLayers()
            .layer("Entities").definedBy(ENTITIES)
            .layer("Use cases").definedBy(USE_CASES)
            .layer("Interface adapters").definedBy(ADAPTERS)
            .layer("Frameworks and drivers").definedBy(FRAMEWORKS)
            .whereLayer("Frameworks and drivers").mayNotBeAccessedByAnyLayer()
            .whereLayer("Interface adapters").mayOnlyBeAccessedByLayers("Frameworks and drivers")
            .whereLayer("Use cases").mayOnlyBeAccessedByLayers("Interface adapters", "Frameworks and drivers")
            .check(PRODUCTION);
}

@Test
void innerRingsKnowNoFramework() {
    noClasses().that().resideInAnyPackage(ENTITIES, USE_CASES, ADAPTERS)
            .should().dependOnClassesThat().resideInAnyPackage(
                    "io.micronaut..", "jakarta..", "javax..", "org.slf4j..", "com.fasterxml..", "java.sql..")
            .because("rings 1-3 are plain Java; Micronaut, JDBC and JSON libraries are details of ring 4")
            .check(PRODUCTION);
}

@Test
void useCasesAreIndependentOfEachOther() {
    slices().matching("training.clean.screening.usecases.(*)..")
            .should().notDependOnEachOther()
            .ignoreDependency(alwaysTrue(), resideInAnyPackage(
                    "training.clean.screening.usecases.shared..", "training.clean.screening.usecases.gateway.."))
            .check(PRODUCTION);
}

@Test
void onlyMainKnowsTheInteractors() {
    classes().that().haveSimpleNameEndingWith("Interactor")
            .should().onlyHaveDependentClassesThat().resideInAnyPackage(USE_CASES, "training.clean.screening.app.config..")
            .because("controllers call input boundaries; only the Main component may construct an interactor")
            .check(PRODUCTION);
}

@Test
void webAdaptersSeeResponseModelsNotEntities() {
    noClasses().that().resideInAPackage("training.clean.screening.adapters.web..")
            .should().dependOnClassesThat().resideInAPackage(ENTITIES)
            .because("presenters receive plain response models, so the UI cannot call domain behaviour")
            .check(PRODUCTION);
}

@Test
void endpointsOnlyTalkToControllers() {
    noClasses().that().resideInAPackage("training.clean.screening.app.web..")
            .should().dependOnClassesThat().resideInAnyPackage(ENTITIES, USE_CASES)
            .because("the framework endpoint is a humble object: routes in, view model out")
            .check(PRODUCTION);
}`, 'screening-app/src/test/…/CleanArchitectureTest.java')}
<div class="callout expert"><strong>Note <code>java.sql..</code> in the forbidden list</strong><p>Ring 3's <code>SqlCaseGateway</code> has "Sql" in its name but imports nothing from <code>java.sql</code>. It knows the <i>shape</i> of the tables (one case record, many match records, a version column), not the driver. If you can't explain the difference to a reviewer, the ArchUnit rule will do it for you.</p></div>
<div class="callout pitfall"><strong>Common ways enforcement erodes</strong><ul>
<li>A "temporary" <code>@ArchIgnore</code> on a failing rule that is still there a year later.</li>
<li>A <code>common</code> or <code>util</code> module that every ring depends on and that slowly gains Micronaut imports.</li>
<li>A test-only dependency on <code>screening-app</code> from an inner module "just for fixtures".</li>
<li>Package-private classes made <code>public</code> to satisfy an IDE quick-fix.</li>
<li>A rule that checks the wrong relation. <code>onlyBeAccessed()</code> sees calls and field reads only, so a controller holding an <code>OpenCaseInteractor</code> field or testing <code>instanceof OpenCaseInteractor</code> passes it. <code>onlyHaveDependentClassesThat()</code> sees every dependency. Prove each rule by breaking it once.</li>
</ul></div>

<div data-quiz="m10"></div>
`,
  });

  Course.quiz('m10', [
    { q: 'In a single-module "package by layer" project, what stops CaseController importing SqlCaseGateway?', options: ['The compiler', 'Nothing – everything is public in one module', 'Micronaut', 'The JVM'], answer: 1, why: 'That is Simon Brown\'s point: without modules, visibility or ArchUnit, intent is not enforced.' },
    { q: 'Why does the lab have ArchUnit tests if Maven modules already enforce the ring order?', options: ['They are redundant', 'Modules cannot express rules inside a ring or about specific classes: no framework in rings 1–3, independent use cases, only Main constructs interactors', 'ArchUnit is faster', 'Maven does not check imports'], answer: 1, why: 'Use the compiler where it can, tests where it cannot.' },
    { q: 'Why are most classes in screening-app package-private?', options: ['Micronaut requires it', 'Nothing but the framework should call them; package-private turns that intent into a compile-time rule', 'Performance', 'To hide them from tests'], answer: 1, why: 'Visibility is the cheapest enforcement Java offers.' },
    { q: 'Where does CleanArchitectureTest live, and why there?', options: ['screening-entities, because it is the core', 'screening-app, the only module with all four rings on its classpath', 'A separate repository', 'screening-usecases'], answer: 1, why: 'ArchUnit imports classes; it can only check rings it can see.' },
    { q: 'What does <code>useCasesAreIndependentOfEachOther</code> allow?', options: ['Any dependency between use-case packages', 'Dependencies on usecases.shared and usecases.gateway only', 'Dependencies on adapters', 'Nothing at all'], answer: 1, why: 'Slices may share the shared and gateway packages but never reach into another use case\'s package.' },
  ]);
})();
