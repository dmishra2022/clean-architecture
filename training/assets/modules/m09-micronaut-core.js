(function () {
  const { code, fig } = Course;
  Course.module({
    id: 'micronaut-fundamentals', num: 9, level: 'Practitioner', minutes: 70,
    title: 'Micronaut fundamentals: compile-time DI, beans, configuration',
    lead: 'What Micronaut does at build time that other frameworks do at runtime – and how to control exactly which bean plugs into which port.',
    html: `
<div class="objectives"><h4>By the end of this module you can</h4><ul>
<li>Explain compile-time dependency injection and its consequences (startup, memory, native image, errors).</li>
<li>Configure the annotation processors correctly in Maven – and diagnose when they are missing.</li>
<li>Use scopes, <code>@Factory</code>, <code>@Requires</code>, <code>@Replaces</code>, qualifiers and <code>@ConfigurationProperties</code>.</li>
<li>Predict which bean Micronaut injects for any configuration, and read its errors.</li>
</ul></div>

<h3>What Micronaut is</h3>
<p>Micronaut is a JVM framework for services: dependency injection, AOP, HTTP server and client, data access, configuration, scheduling, messaging, observability. Its defining choice: <b>everything a reflection-based container works out at startup, Micronaut works out at compile time</b>, using Java annotation processors.</p>
${fig('08-micronaut-compile-time-di', 'Build time: annotation processors read your annotations and generate bean definitions, introspections and serializers. Run time: the context loads the generated classes – no classpath scanning, no reflection for DI.')}
<table>
<tr><th></th><th>Reflection-based containers (classic approach)</th><th>Micronaut</th></tr>
<tr><td>Find beans</td><td>Scan the classpath at startup</td><td>Generated <code>$…$Definition</code> classes listed in <code>META-INF/micronaut</code></td></tr>
<tr><td>Inject</td><td>Reflection on constructors/fields</td><td>Generated code calls your constructor directly</td></tr>
<tr><td>AOP (<code>@Retryable</code>, <code>@Transactional</code>)</td><td>Runtime proxies</td><td>Compile-time generated subclasses (<code>$Intercepted</code>)</td></tr>
<tr><td>JSON</td><td>Reflection over fields</td><td>Serde generates (de)serializers for <code>@Serdeable</code> types</td></tr>
<tr><td>Data queries</td><td>Parse method names at startup</td><td>Micronaut Data parses and validates queries at compile time</td></tr>
<tr><td>Consequences</td><td>Slower startup, more memory, errors surface at startup</td><td>Fast startup, small heap, GraalVM-native friendly, many errors at compile time</td></tr>
</table>
<div class="callout wc"><strong>Why this matters for screening</strong><p>Batch screening and ongoing monitoring scale out and in with load. Fast startup and small memory per instance mean faster autoscaling and cheaper capacity. Compile-time query validation means a typo in a repository method fails the build, not the 2 a.m. rescreen job.</p></div>

<h3>The annotation processors are not optional</h3>
<p>If the processors do not run, no bean definitions exist. The code compiles fine, then the application starts with no controllers (every URL is 404) or fails with <code>NoSuchBeanException</code>. This is the number-one Micronaut setup mistake.</p>
${code('xml', String.raw`
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <compilerArgs>
      <arg>-parameters</arg>
      <arg>-Amicronaut.processing.group=training.worldcheck</arg>
      <arg>-Amicronaut.processing.module=screening-case-service</arg>
    </compilerArgs>
    <annotationProcessorPaths>
      <path>  <!-- bean definitions, AOP -->
        <groupId>io.micronaut</groupId><artifactId>micronaut-inject-java</artifactId>
        <version>$(micronaut.core.version}</version>
      </path>
      <path>  <!-- route validation -->
        <groupId>io.micronaut</groupId><artifactId>micronaut-http-validation</artifactId>
        <version>$(micronaut.core.version}</version>
      </path>
      <path>  <!-- compile-time repository queries -->
        <groupId>io.micronaut.data</groupId><artifactId>micronaut-data-processor</artifactId>
        <version>$(micronaut.data.version}</version>
      </path>
      <path>  <!-- JSON (de)serializers -->
        <groupId>io.micronaut.serde</groupId><artifactId>micronaut-serde-processor</artifactId>
        <version>$(micronaut.serde.version}</version>
      </path>
      <path>  <!-- Bean Validation metadata -->
        <groupId>io.micronaut.validation</groupId><artifactId>micronaut-validation-processor</artifactId>
        <version>$(micronaut.validation.version}</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>`.replaceAll('$(', '$' + '{'), 'code-lab/pom.xml')}
<div class="callout pitfall"><strong>Diagnose in 30 seconds</strong><p>Look in <code>target/classes</code> for files like <code>$CaseController$Definition.class</code>. None there? The processors did not run. If you use Lombok, its processor must be listed <i>before</i> Micronaut's so generated getters exist when Micronaut reads the class.</p></div>

<h3>Beans and scopes</h3>
<table>
<tr><th>Annotation</th><th>Lifecycle</th><th>Use for</th></tr>
<tr><td><code>@Singleton</code></td><td>One instance per context, created lazily on first use</td><td>Adapters, services, most beans</td></tr>
<tr><td><code>@Context</code></td><td>Singleton created eagerly at startup</td><td>Beans that must fail fast or warm up (caches, connections)</td></tr>
<tr><td><code>@Prototype</code></td><td>New instance per injection point</td><td>Stateful helpers</td></tr>
<tr><td><code>@RequestScope</code></td><td>One per HTTP request</td><td>Request-bound state (prefer passing values explicitly)</td></tr>
<tr><td><code>@Refreshable</code></td><td>Rebuilt when configuration refreshes</td><td>Feature toggles, tunables</td></tr>
</table>
<p>Constructor injection is the default and the only style used in the code lab. Constructors can be package-private; generated code lives in the same package.</p>

<h3><code>@Factory</code>: beans from plain Java classes</h3>
<p>The domain and application rings carry no annotations. A factory in <code>config</code> turns them into beans (see module 7). Factory methods are where you pass configuration values into plain constructors – e.g. the threshold into <code>new NameMatchingPolicy(int)</code>.</p>

<h3>Configuration</h3>
${code('yaml', `
screening:
  matching:
    threshold: 80
  reference-data:
    mode: in-memory        # in-memory | http  (swaps the driven adapter, core unchanged)
  events:
    sink: log
  outbox:
    relay-interval: 2s
    initial-delay: 2s`, 'src/main/resources/application.yml (excerpt)')}
${code('java', String.raw`
/** Bound from {@code screening.matching.*} at startup; invalid values fail fast before traffic arrives. */
@ConfigurationProperties("screening.matching")
public record MatchingProperties(@Bindable(defaultValue = "80") @Min(50) @Max(100) int threshold) {
}`, 'config/MatchingProperties.java')}
<p>Property sources, from highest to lowest priority (simplified): command-line arguments → Java system properties → environment variables → files in <code>micronaut.config.files</code> → <code>application-{env}.yml</code> → <code>application.yml</code>. Environment variables map by convention: <code>SCREENING_MATCHING_THRESHOLD=85</code> sets <code>screening.matching.threshold</code>.</p>
<p><b>Environments</b> (<code>MICRONAUT_ENVIRONMENTS=prod,eu</code>) activate <code>application-prod.yml</code> etc. <code>@MicronautTest</code> activates <code>test</code> automatically – the code lab's <code>application-test.yml</code> sets a random port and slows the relay.</p>

<h3>Choosing between implementations</h3>
${fig('12-bean-resolution', 'How Micronaut picks a bean for an injection point: candidates by type, filter by @Requires, apply @Replaces, then qualifiers/@Primary. Zero or several left → error.')}
<table>
<tr><th>Tool</th><th>Effect</th><th>Code lab example</th></tr>
<tr><td><code>@Requires(property=…, value=…)</code></td><td>Bean exists only if the condition holds</td><td><code>InMemoryReferenceDataSource</code> vs <code>HttpReferenceDataSource</code> by <code>screening.reference-data.mode</code></td></tr>
<tr><td><code>@Requires(env="test")</code>, <code>notEnv</code></td><td>Environment-specific beans</td><td>A fixed clock only in tests</td></tr>
<tr><td><code>@Requires(beans=…)</code> / <code>missingBeans</code></td><td>Depends on other beans</td><td>A default sink only if no other sink exists</td></tr>
<tr><td><code>@Replaces(X.class)</code></td><td>Disables X when this bean is active</td><td>Test doubles replacing a real adapter</td></tr>
<tr><td><code>@Named("…")</code> / custom qualifiers</td><td>Select one of several by name</td><td>Two outboxes for two brokers</td></tr>
<tr><td><code>@Primary</code> / <code>@Secondary</code></td><td>Tie-breakers</td><td>Use sparingly; prefer explicit conditions</td></tr>
</table>
${code('java', String.raw`
@Singleton
@Requires(property = "screening.reference-data.mode", value = "in-memory", defaultValue = "in-memory")
class InMemoryReferenceDataSource implements ReferenceDataSource { ... }

@Singleton
@Requires(property = "screening.reference-data.mode", value = "http")
class HttpReferenceDataSource implements ReferenceDataSource { ... }`, 'adapter/out/reference')}
<div data-sim="bean-resolution"></div>
<div class="callout rule"><strong>Mental model</strong><p>Bean <i>definitions</i> are fixed at compile time. Bean <i>conditions</i> (<code>@Requires</code>) are evaluated at startup against configuration and environment. That is why one jar can run with H2 locally and PostgreSQL in production, or with in-memory reference data in tests and the HTTP adapter in production, with no rebuild.</p></div>

<h3>AOP without runtime proxies</h3>
<p>Around-advice annotations – <code>@Retryable</code>, <code>@CircuitBreaker</code>, <code>@Cacheable</code>, <code>@Transactional</code>, <code>@Timed</code> – are applied by generated subclasses. Two consequences:</p>
<ul>
<li>Advised methods must be overridable: not <code>private</code>, not <code>final</code>, on a non-final class.</li>
<li>Self-invocation (<code>this.method()</code>) bypasses the advice, exactly like proxy-based frameworks.</li>
</ul>
<p>Keep AOP in adapters: <code>@Retryable</code> on the HTTP reference-data client, never on aggregate methods.</p>

<div data-quiz="m09"></div>
`,
  });

  Course.quiz('m09', [
    { q: 'A new Micronaut project compiles, starts, but every endpoint returns 404. The most likely cause?', options: ['Netty is misconfigured', 'Annotation processors did not run, so no bean/route definitions were generated', 'The port is wrong', 'Missing @Singleton on the controller'], answer: 1, why: 'Without micronaut-inject-java (and friends) in annotationProcessorPaths, no $Definition classes exist. Check target/classes.' },
    { q: 'When are <code>@Requires</code> conditions evaluated?', options: ['At compile time', 'At application startup, against configuration and environment', 'On every request', 'Only in tests'], answer: 1, why: 'Definitions are generated at build time; conditions are checked at startup – one artefact, many configurations.' },
    { q: '<code>screening.reference-data.mode=inmemory</code> (typo). What happens?', options: ['Falls back to in-memory', 'Picks HTTP', 'No ReferenceDataSource bean matches; resolving it fails with NoSuchBeanException', 'Both beans are created'], answer: 2, why: 'Neither @Requires matches the value. A typo is a startup/first-use failure, not a silent fallback.' },
    { q: 'How does Micronaut apply <code>@Retryable</code>?', options: ['JDK dynamic proxies at runtime', 'A generated subclass at compile time', 'Bytecode weaving at class load', 'It does not support retries'], answer: 1, why: 'Compile-time AOP: methods must be overridable, and self-invocation bypasses advice.' },
    { q: 'Which sets <code>screening.matching.threshold</code> to 85 in a container without changing files?', options: ['SCREENING_MATCHING_THRESHOLD=85', 'THRESHOLD=85', 'screening_matching=85', 'It is impossible'], answer: 0, why: 'Environment variables map to properties by upper-casing and replacing dots/dashes with underscores.' },
  ]);
})();
