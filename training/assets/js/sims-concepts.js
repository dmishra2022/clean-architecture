/* Concept simulators: each one isolates one idea so it can be explored and argued about. */
(function () {
  const { el } = Course;
  const header = (node, title, intro) => Course.simHeader(node, title, intro);

  // ------------------------------------------------------------------ change impact (m01)
  Course.sim('change-impact', (node) => {
    header(node, 'Change-impact simulator – layered "service + entity" vs hexagonal',
      'Pick a real change request from a screening backlog. Components that must be edited light up, with the reason. Count the edits, and count how many of the affected tests need a database or a network to run.');
    const LAYERED = {
      CaseController: 'controller with validation and some business checks',
      CaseService: '1,800-line service: rules, SQL calls, HTTP calls, Kafka',
      CaseEntity: '@Entity with public setters, used everywhere',
      MatchEntity: '@Entity, status strings',
      CaseDao: 'SQL + some "if status == …" rules',
      ProviderClient: 'HTTP client returning provider JSON objects',
      KafkaPublisher: 'called from CaseService after save',
      ReportJob: 're-implements "can this case close?"',
      CaseServiceTest: '@SpringBootTest-style test, needs DB + Kafka',
    };
    const HEX = {
      ScreeningCase: 'aggregate: invariants live here only',
      NameMatchingPolicy: 'domain service: scoring',
      CaseApplicationService: 'orchestrates a use case, no rules',
      'port.out interfaces': 'CaseRepository, ReferenceDataSource, …',
      CaseController: 'HTTP ↔ command translation',
      JdbcCaseRepository: 'snapshot ↔ rows',
      HttpReferenceDataSource: 'ACL: provider JSON → ReferenceProfile',
      IntegrationEventSink: 'LoggingEventSink / KafkaEventSink',
      'application.yml': 'selects adapters',
      'Domain unit tests': 'plain JUnit, milliseconds',
    };
    const CHANGES = [
      { name: 'Move from H2 to PostgreSQL', layered: { CaseDao: 'vendor-specific SQL in 14 methods', CaseService: 'native queries embedded in service', CaseEntity: 'column annotations change', CaseServiceTest: 'test DB setup changes' },
        hex: { JdbcCaseRepository: 'dialect on @JdbcRepository', 'application.yml': 'datasource URL + driver' }, infraTests: [3, 0] },
      { name: 'Publish case events to Kafka instead of logs', layered: { CaseService: 'add KafkaTemplate calls in 6 places', KafkaPublisher: 'new topics', CaseController: 'some endpoints publish directly', ReportJob: 'publishes too', CaseServiceTest: 'needs embedded Kafka' },
        hex: { IntegrationEventSink: 'add KafkaEventSink with @Requires(sink=kafka)', 'application.yml': 'screening.events.sink: kafka' }, infraTests: [2, 0] },
      { name: 'New rule: POSSIBLE matches block closure', layered: { CaseService: 'closeCase() check', CaseController: 'duplicated pre-check in controller', CaseDao: 'bulkClose() query bypasses service', ReportJob: '"closable cases" report re-implements rule', MatchEntity: 'new status constant', CaseServiceTest: 'slow test per path' },
        hex: { ScreeningCase: 'close() checks Resolution.blocksClosure()', 'Domain unit tests': '2 new tests, run in ms' }, infraTests: [1, 0] },
      { name: 'Accept screening requests from a message queue too', layered: { CaseService: 'extract logic from HTTP-shaped methods', CaseController: 'logic copied into listener', CaseEntity: 'serialisation annotations clash', CaseServiceTest: 'new full-stack tests' },
        hex: { 'port.out interfaces': 'none – driving side only', CaseController: 'untouched; a new QueueListener adapter calls the same port.in' }, infraTests: [1, 0] },
      { name: 'Reference-data provider renames fields (v1 → v2)', layered: { ProviderClient: 'new DTOs', CaseService: 'uses provider fields directly', MatchEntity: 'stores provider codes', ReportJob: 'maps provider codes', CaseServiceTest: 'fixtures with provider JSON' },
        hex: { HttpReferenceDataSource: 'ACL maps new field names to the same ReferenceProfile' }, infraTests: [1, 0] },
    ];
    let current = 0;
    const pick = el('select', { onchange: (e) => { current = +e.target.value; render(); } }, CHANGES.map((c, i) => el('option', { value: i }, c.name)));
    const grid = el('div', { class: 'sim-grid cols-2' });
    const verdict = el('div');
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Change request', pick)), grid, verdict);
    function column(title, all, touched, color) {
      const box = el('div', { class: 'panel' }, el('h5', {}, title));
      for (const [name, desc] of Object.entries(all)) {
        const hit = touched[name];
        box.append(el('div', { style: `background:${hit ? color : '#fff'};border:1.5px solid ${hit ? '#C8553D' : 'var(--line)'};border-radius:8px;padding:7px 10px;margin:6px 0;font-size:13.5px;transition:background .3s` },
          el('b', {}, name), el('div', { style: 'font-size:12.5px;color:var(--slate)' }, hit ? `✎ ${hit}` : desc)));
      }
      return box;
    }
    function render() {
      const c = CHANGES[current];
      grid.innerHTML = '';
      grid.append(column('Layered, anemic model', LAYERED, c.layered, '#FBE9E5'), column('Hexagonal + rich domain', HEX, c.hex, '#FDF1DC'));
      const l = Object.keys(c.layered).length; const h = Object.keys(c.hex).length;
      verdict.innerHTML = '';
      verdict.append(el('div', { class: 'verdict info' }, `Edits: layered ${l} components vs hexagonal ${h}. Tests needing infrastructure to verify the change: ${c.infraTests[0]} vs ${c.infraTests[1]}.`));
    }
    render();
  });

  // ------------------------------------------------------------------ context map explorer + language clash (m02)
  Course.sim('context-map', (node) => {
    header(node, 'Context map explorer – one word, many meanings',
      'Choose a term from the business. Each bounded context shows what that word means inside it. Where meanings differ, a single shared class would be wrong for at least one team – that is the signal for a context boundary. Click a context for its relationships.');
    const CTX = {
      screening: { name: 'Screening & Case', type: 'core', purpose: 'Decide whether a party is a risk match and record the analyst decision with audit-grade rationale.' },
      corpus: { name: 'Risk Intelligence Data', type: 'core', purpose: 'Research, source and version risk profiles (sanctions, PEP, law enforcement, adverse media).' },
      monitoring: { name: 'Ongoing Monitoring', type: 'core', purpose: 'Rescreen existing cases when profiles or parties change; prioritise alerts.' },
      entitlements: { name: 'Client & Entitlements', type: 'supporting', purpose: 'Client groups, product features, API keys, quotas.' },
      audit: { name: 'Audit & Reporting', type: 'supporting', purpose: 'Immutable history and evidence packs for regulators.' },
      notify: { name: 'Notifications', type: 'generic', purpose: 'Deliver emails and webhooks.' },
    };
    const TERMS = {
      Profile: { screening: 'Read-only ReferenceProfile: names, DOB, country, category – just enough to score.', corpus: 'The researched record: sources, research history, editorial status, versions. The heart of their model.', monitoring: 'A watched thing: profile id + version, used to detect changes.', entitlements: '– not used –', audit: 'A profile id referenced in evidence.', notify: '– not used –' },
      Match: { screening: 'Entity inside ScreeningCase: profile hit with score and resolution (UNRESOLVED → POSITIVE/POSSIBLE/FALSE_POSITIVE).', corpus: '– not used (they say "linked profile") –', monitoring: 'A new or changed hit found during rescreen → becomes an Alert.', entitlements: '– not used –', audit: 'A row in a case export with its decision history.', notify: '– not used –' },
      Client: { screening: 'ClientGroupId: the tenant that owns the case. Never the screened person.', corpus: '– not used –', monitoring: 'Tenant whose cases are monitored, with monitoring frequency.', entitlements: 'The paying organisation: contracts, users, features, API keys.', audit: 'Tenant scope for evidence exports.', notify: 'A recipient endpoint (email / webhook URL).' },
      Resolution: { screening: 'Analyst decision on a match: POSITIVE, POSSIBLE, FALSE_POSITIVE, with rationale and analyst.', corpus: 'Editorial decision to publish or retire a profile.', monitoring: 'How an alert was dismissed or escalated.', entitlements: '– not used –', audit: 'A historic decision being reported.', notify: '– not used –' },
      Case: { screening: 'ScreeningCase aggregate: one party, its matches, status, outcome.', corpus: '– not used ("research task") –', monitoring: 'Something to rescreen: case id + party + last screened.', entitlements: '– not used –', audit: 'An evidence bundle.', notify: '– not used ("message") –' },
    };
    const RELS = {
      screening: [['API & UI clients → Screening', 'Open Host Service + Published Language', 'One versioned REST contract (/api/v1) for every bank. Code: CaseController + ApiModels.'],
        ['Risk Intelligence Data → Screening', 'Upstream/Downstream with ACL in Screening', 'Their profile model changes for editorial reasons; HttpReferenceDataSource translates to ReferenceProfile so Screening never imports their model.'],
        ['Entitlements → Screening', 'Customer / Supplier', 'Screening needs "is this feature on for this client group"; the need is negotiated into their backlog.'],
        ['Screening → Audit', 'Published events, Audit conforms', 'CaseOpened/Screened/MatchResolved/Closed via outbox. Audit stores them as-is.']],
      corpus: [['Risk Intelligence Data → Monitoring', 'Published events', 'ProfileUpdated (id, version, change type) triggers rescreens.'], ['Risk Intelligence Data → Screening', 'Upstream/Downstream + ACL', 'Screening translates at its border.']],
      monitoring: [['Monitoring → Screening', 'Customer / Supplier (commands)', 'Monitoring sends RescreenCase; Screening owns the rules.'], ['Screening → Monitoring', 'Published events', 'CaseScreened(newMatches>0) becomes an alert.'], ['Monitoring → Notifications', 'Published Language', 'Alert events for webhook delivery.']],
      entitlements: [['Entitlements → Screening', 'Customer / Supplier', 'Feature checks per client group.'], ['Identity → Entitlements', 'Conformist', 'OIDC claims used as-is.']],
      audit: [['Screening → Audit', 'Conformist (downstream)', 'Audit takes our published events exactly; a breaking change needs a new schemaVersion.']],
      notify: [['Monitoring → Notifications', 'Published Language', 'Generic delivery, no screening knowledge inside.']],
    };
    let term = 'Match'; let selected = 'screening';
    const termRow = el('div', { class: 'sim-row' });
    const grid = el('div', { class: 'sim-grid cols-3' });
    const rel = el('div', { class: 'panel', style: 'margin-top:12px' });
    node.append(termRow, grid, rel);
    const COLORS = { core: '#1F3A5F', supporting: '#2A9D8F', generic: '#5B6B7F' };
    function render() {
      termRow.innerHTML = '';
      termRow.append(el('span', { style: 'font-weight:700;font-size:14px' }, 'Term:'));
      for (const t of Object.keys(TERMS)) termRow.append(el('button', { class: `btn small ${t === term ? 'amber' : 'secondary'}`, onclick: () => { term = t; render(); } }, `"${t}"`));
      grid.innerHTML = '';
      for (const [id, c] of Object.entries(CTX)) {
        const meaning = TERMS[term][id];
        const unused = meaning.startsWith('–');
        grid.append(el('div', { class: 'card', style: `cursor:pointer;border-top:5px solid ${COLORS[c.type]};${id === selected ? 'box-shadow:0 0 0 3px #E9A23B;' : ''}`, onclick: () => { selected = id; render(); } },
          el('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:6px' }, el('b', {}, c.name), el('span', { class: 'chip', style: `background:${COLORS[c.type]};color:#fff` }, c.type)),
          el('div', { style: 'font-size:12.5px;color:var(--slate);margin:4px 0 8px' }, c.purpose),
          el('div', { style: `font-size:13.5px;padding:8px;border-radius:6px;background:${unused ? 'var(--mist)' : '#FDF1DC'}` }, el('b', {}, `"${term}" here: `), meaning)));
      }
      rel.innerHTML = '';
      rel.append(el('h5', {}, `Relationships of ${CTX[selected].name}`));
      rel.append(el('table', {}, el('tr', {}, el('th', {}, 'Edge'), el('th', {}, 'Pattern'), el('th', {}, 'Why / where in code')),
        RELS[selected].map(([e, p, w]) => el('tr', {}, el('td', {}, e), el('td', {}, el('b', {}, p)), el('td', {}, w)))));
    }
    render();
  });

  // ------------------------------------------------------------------ classifiers (m03, m04, m08, m11)
  const STICKY = [
    { id: 'event', name: 'Domain event', color: '#F4A261' }, { id: 'command', name: 'Command', color: '#7EC8E3' },
    { id: 'aggregate', name: 'Aggregate', color: '#FFE066' }, { id: 'policy', name: 'Policy', color: '#C3AED6' },
    { id: 'readmodel', name: 'Read model', color: '#9BE7A0' }, { id: 'external', name: 'External system', color: '#F7A1C4' },
    { id: 'actor', name: 'Actor', color: '#FFF3B0' }, { id: 'hotspot', name: 'Hotspot', color: '#E76F6F' },
  ];
  Course.sim('event-storming', (node) => {
    header(node, 'Sticky-note classifier – run your own Event Storming', 'These notes came out of a real-style workshop on case remediation. Put each on the right colour. Wrong colours are the most common reason Event Storming sessions produce mush.');
    Course.classifier(node, { bins: STICKY, items: [
      { text: 'Case Closed', bin: 'event', why: 'Past tense, business fact.' },
      { text: 'Match Resolved', bin: 'event', why: 'Something that happened, named by the business.' },
      { text: 'Profile Updated', bin: 'event', why: 'An event, raised by another context.' },
      { text: 'Resolve match', bin: 'command', why: 'Imperative: a request that may be rejected.' },
      { text: 'Rescreen case', bin: 'command', why: 'An intention sent to the Screening Case.' },
      { text: 'Screening Case', bin: 'aggregate', why: 'Accepts or rejects commands, enforces rules, emits events.' },
      { text: 'Whenever a profile is updated → rescreen affected cases', bin: 'policy', why: '"Whenever X then Y" is reactive logic: a policy.' },
      { text: 'Whenever case closed with risk → notify client', bin: 'policy', why: 'Reaction that crosses into Notifications.' },
      { text: 'Analyst work queue (cases by priority)', bin: 'readmodel', why: 'Information someone needs to decide what to do next.' },
      { text: 'Risk data corpus', bin: 'external', why: 'Another context/system we depend on.' },
      { text: 'Compliance analyst', bin: 'actor', why: 'The person who issues the command.' },
      { text: 'Can the same analyst downgrade their own POSITIVE?', bin: 'hotspot', why: 'An open question – this one became the FOUR_EYES invariant.' },
      { text: 'Case saved to database', bin: 'hotspot', why: 'Technical, not a domain event. Flag it and ask: what business fact is behind it?' },
    ] });
  });

  Course.sim('entity-vo', (node) => {
    header(node, 'Entity, value object, or neither?', 'Identity that persists through change → entity. Defined only by its values, immutable, replaceable → value object. Behaviour that belongs to neither → domain service.');
    Course.classifier(node, { bins: [
      { id: 'entity', name: 'Entity', color: '#1F3A5F' }, { id: 'vo', name: 'Value object', color: '#2A9D8F' },
      { id: 'service', name: 'Domain service', color: '#6D5BD0' }, { id: 'root', name: 'Aggregate root', color: '#E9A23B' },
    ], items: [
      { text: 'ScreeningCase', bin: 'root', why: 'Entity that guards the consistency boundary; the only way in from outside.' },
      { text: 'Match', bin: 'entity', why: 'Has its own MatchId and a lifecycle (UNRESOLVED → POSITIVE…), but only changes through the case.' },
      { text: 'PartyName', bin: 'vo', why: 'Two names with the same value are interchangeable; validates itself; immutable record.' },
      { text: 'MatchScore (0-100)', bin: 'vo', why: 'Pure value with a rule (clamped 0..100).' },
      { text: 'CountryCode', bin: 'vo', why: 'Value with validation (ISO alpha-2).' },
      { text: 'ClientGroupId', bin: 'vo', why: 'Identifiers are value objects too: typed, validated, no more String mix-ups.' },
      { text: 'NameMatchingPolicy', bin: 'service', why: 'Scoring a party against a profile belongs to neither object.' },
      { text: 'ResolutionRationale', bin: 'vo', why: 'Text with a length rule; meaningless without its value.' },
      { text: 'Party (name, type, DOB, country)', bin: 'vo', why: 'In the screening context the party is a snapshot of submitted data, compared by value. In a Customer context it would be an entity.' },
      { text: 'ReferenceProfile (in Screening)', bin: 'vo', why: 'Read-only copy of upstream data. Its identity matters to the corpus team, not to us; we treat it as data.' },
    ] });
  });

  Course.sim('where-belongs', (node) => {
    header(node, 'Where does this code belong?', 'Each card is a real piece of code from a screening service. Put it in the ring where it must live. This is the conversation you will have in every code review.');
    Course.classifier(node, { bins: [
      { id: 'domain', name: 'domain', color: '#1F3A5F' }, { id: 'application', name: 'application (ports, use cases)', color: '#2A9D8F' },
      { id: 'in', name: 'adapter.in', color: '#E9A23B' }, { id: 'out', name: 'adapter.out', color: '#F4A261' }, { id: 'config', name: 'config', color: '#6D5BD0' },
    ], items: [
      { text: '"A closed case cannot be screened" check', bin: 'domain', why: 'Business invariant → ScreeningCase.requireOpen().' },
      { text: 'interface CaseRepository { findById; save }', bin: 'application', why: 'A driven port, owned by the application (port.out).' },
      { text: 'record ResolveMatchCommand(...)', bin: 'application', why: 'Input to a use case: lives with the port.in interface.' },
      { text: '@Controller CaseController', bin: 'in', why: 'Driving adapter: HTTP → command.' },
      { text: '@MappedEntity record CaseRow', bin: 'out', why: 'Persistence shape. The domain never sees it.' },
      { text: '@Client("reference-data") interface', bin: 'out', why: 'Driven adapter calling another service.' },
      { text: 'Mapping provider "SAN" → RiskCategory.SANCTIONS', bin: 'out', why: 'Anti-corruption layer: translation at the border.' },
      { text: '@Factory ApplicationWiring (new CaseApplicationService(...))', bin: 'config', why: 'Composition root: the only place that knows all concrete classes.' },
      { text: '@ConfigurationProperties("screening.matching")', bin: 'config', why: 'Framework config binding, passed into the domain as a plain int.' },
      { text: 'Loading reference data outside the write transaction', bin: 'application', why: 'Orchestration and transaction choreography: application service.' },
      { text: 'ExceptionHandler: DomainException → 422', bin: 'in', why: 'HTTP concern; the domain never knows status codes.' },
      { text: 'OutboxRelay @Scheduled publisher', bin: 'out', why: 'Infrastructure that talks to a broker.' },
      { text: 'Name normalisation (accents, punctuation)', bin: 'domain', why: 'Part of the matching language: PartyName.normalise().' },
    ] });
  });

  Course.sim('test-classifier', (node) => {
    header(node, 'Which test catches this bug cheapest?', 'Each bug escaped to production somewhere. Pick the fastest test type that would have caught it. If you keep choosing API tests, your pyramid is upside down.');
    Course.classifier(node, { bins: [
      { id: 'domain', name: 'Domain unit test', color: '#1F3A5F' }, { id: 'app', name: 'Application test with fakes', color: '#2A9D8F' },
      { id: 'adapter', name: 'Adapter integration test', color: '#E9A23B' }, { id: 'api', name: '@MicronautTest API test', color: '#F4A261' }, { id: 'arch', name: 'ArchUnit rule', color: '#6D5BD0' },
    ], items: [
      { text: 'A case closes while a POSSIBLE match is open', bin: 'domain', why: 'ScreeningCaseTest – pure Java, milliseconds.' },
      { text: '"Reyes Quintanar Marisol" no longer matches "Marisol Quintanar Reyes"', bin: 'domain', why: 'NameMatchingPolicyTest (token-sort).' },
      { text: 'Reference data is fetched while holding the DB transaction', bin: 'app', why: 'TrackingUnitOfWork in CaseApplicationServiceTest records what ran inside write().' },
      { text: 'Events raised but not appended to the outbox', bin: 'app', why: 'RecordingOutbox fake.' },
      { text: 'Second concurrent save silently overwrites the first', bin: 'adapter', why: 'JdbcCaseRepositoryTest against a real database: @Version behaviour.' },
      { text: 'Flyway renamed a column; the row mapper did not follow', bin: 'adapter', why: 'Only a real schema finds this.' },
      { text: 'A rule violation returns 500 instead of 422', bin: 'api', why: 'Exception handler wiring needs the HTTP stack: CaseApiTest.' },
      { text: 'Idempotency-Key header ignored', bin: 'api', why: 'Header binding is an HTTP concern.' },
      { text: 'Someone adds io.micronaut.data import to ScreeningCase', bin: 'arch', why: 'HexagonalArchitectureTest fails the build.' },
      { text: 'Controller injects CaseApplicationService instead of a port', bin: 'arch', why: 'Rule: adapters must not depend on the service class.' },
      { text: 'Provider code "PEP" mapped to SANCTIONS', bin: 'adapter', why: 'ACL mapping test for HttpReferenceDataSource (with a stub server or unit test of the mapper).' },
    ] });
  });

  // ------------------------------------------------------------------ rich vs anemic aggregate (m05)
  Course.sim('aggregate-rules', (node) => {
    header(node, 'Rich aggregate vs anemic model – try to corrupt a case',
      'Same starting case: screened once, two UNRESOLVED matches (Viktor Albescu, no DOB). Fire the operations a busy team writes over two years. In <b>anemic</b> mode the service sets fields; an invariant monitor shows what broke. In <b>rich</b> mode only aggregate methods exist.');
    let mode = 'rich';
    const log = el('div', { class: 'log', style: 'max-height:300px' });
    const stateBox = el('div');
    const monitor = el('div');
    const ops = el('div', { class: 'sim-row' });
    const code = el('pre', { style: 'min-height:90px' }, el('code', {}, 'Choose an operation.'));
    node.append(el('div', { class: 'sim-row' },
      el('button', { class: 'btn small', onclick: () => { mode = 'rich'; reset(); } }, 'Rich aggregate'),
      el('button', { class: 'btn small secondary', onclick: () => { mode = 'anemic'; reset(); } }, 'Anemic service + setters'),
      el('span', { class: 'mode-label', style: 'font-weight:700' })),
    ops, el('div', { class: 'sim-grid cols-2' },
      el('div', {}, el('div', { class: 'panel' }, el('h5', {}, 'Case state'), stateBox), el('div', { class: 'panel', style: 'margin-top:10px' }, el('h5', {}, 'Invariant monitor'), monitor)),
      el('div', {}, el('div', { class: 'panel dark' }, el('h5', {}, 'Code that ran'), code), el('div', { class: 'panel dark', style: 'margin-top:10px' }, el('h5', {}, 'Result log'), log))));

    let c; let removed; let closedTouched; let fourEyesBroken;
    const party = WC.makeParty({ name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '', country: '' });
    function reset() {
      node.querySelector('.mode-label').textContent = mode === 'rich' ? 'Mode: rich – behaviour + invariants inside ScreeningCase' : 'Mode: anemic – getters/setters, rules in services (or not)';
      node.querySelectorAll('.sim-row .btn')[0].className = `btn small ${mode === 'rich' ? '' : 'secondary'}`;
      node.querySelectorAll('.sim-row .btn')[1].className = `btn small ${mode === 'anemic' ? '' : 'secondary'}`;
      c = WC.ScreeningCase.open(WC.uuid(), 'acme-bank', party, new Date().toISOString());
      c.screen(WC.candidatesFor(party), 80, new Date().toISOString());
      c.pullEvents();
      removed = 0; closedTouched = false; fourEyesBroken = false;
      log.innerHTML = '';
      render();
    }
    const now = () => new Date().toISOString();
    const OPS = [
      ['Close the case now', 'caseRepo.findById(id).close(analyst, now);', 'caseEntity.setStatus("CLOSED");\ncaseEntity.setOutcome("CLEAR");\ncaseDao.update(caseEntity);', () => c.close('analyst-anna', now()), () => { anemicTouch(); c.status = 'CLOSED'; c.outcome = 'CLEAR'; }],
      ['Anna confirms match #1 POSITIVE', 'c.resolveMatch(m1, POSITIVE, rationale, anna, now);', 'm1.setResolution("POSITIVE");\nm1.setResolvedBy("analyst-anna");', () => c.resolveMatch(c.matches[0].id, 'POSITIVE', 'DOB unknown, but full alias match', 'analyst-anna', now()), () => { anemicTouch(); Object.assign(c.matches[0], { resolution: 'POSITIVE', resolvedBy: 'analyst-anna', rationale: 'ok' }); }],
      ['Anna downgrades her own #1 to FALSE_POSITIVE', 'c.resolveMatch(m1, FALSE_POSITIVE, rationale, anna, now);', 'm1.setResolution("FALSE_POSITIVE");  // nobody remembered four-eyes', () => c.resolveMatch(c.matches[0].id, 'FALSE_POSITIVE', 'Changed my mind after lunch', 'analyst-anna', now()), () => { anemicTouch(); const m = c.matches[0]; if (m.resolution === 'POSITIVE' && m.resolvedBy === 'analyst-anna') fourEyesBroken = true; m.resolution = 'FALSE_POSITIVE'; }],
      ['Ben downgrades #1 to FALSE_POSITIVE', 'c.resolveMatch(m1, FALSE_POSITIVE, rationale, ben, now);', 'm1.setResolution("FALSE_POSITIVE");\nm1.setResolvedBy("analyst-ben");', () => c.resolveMatch(c.matches[0].id, 'FALSE_POSITIVE', 'Passport shows different DOB', 'analyst-ben', now()), () => { anemicTouch(); Object.assign(c.matches[0], { resolution: 'FALSE_POSITIVE', resolvedBy: 'analyst-ben', rationale: 'Passport shows different DOB' }); }],
      ['Resolve #2 FALSE_POSITIVE with no rationale', 'c.resolveMatch(m2, FALSE_POSITIVE, null, ben, now);', 'm2.setResolution("FALSE_POSITIVE");  // rationale column nullable', () => c.resolveMatch(c.matches[1].id, 'FALSE_POSITIVE', null, 'analyst-ben', now()), () => { anemicTouch(); Object.assign(c.matches[1], { resolution: 'FALSE_POSITIVE', rationale: null, resolvedBy: 'analyst-ben' }); }],
      ['Resolve #2 FALSE_POSITIVE with rationale', 'c.resolveMatch(m2, FALSE_POSITIVE, rationale, ben, now);', 'm2.setResolution("FALSE_POSITIVE");\nm2.setRationale("Different person, DOB 1988");', () => c.resolveMatch(c.matches[1].id, 'FALSE_POSITIVE', 'Different person, DOB 1988', 'analyst-ben', now()), () => { anemicTouch(); Object.assign(c.matches[1], { resolution: 'FALSE_POSITIVE', rationale: 'Different person, DOB 1988', resolvedBy: 'analyst-ben' }); }],
      ['Set match #1 back to UNRESOLVED', 'c.resolveMatch(m1, UNRESOLVED, rationale, ben, now);', 'm1.setResolution("UNRESOLVED");', () => c.resolveMatch(c.matches[0].id, 'UNRESOLVED', 'reset for re-review', 'analyst-ben', now()), () => { anemicTouch(); c.matches[0].resolution = 'UNRESOLVED'; }],
      ['Delete noisy match #2', '// no method exists: matches are never removed', 'matchDao.delete(m2);  // "cleanup" ticket', null, () => { anemicTouch(); if (c.matches.length > 1) { c.matches.splice(1, 1); removed++; } }],
      ['Set status = REVIEWED directly', '// no setStatus(): status is derived', 'caseEntity.setStatus("REVIEWED");', null, () => { anemicTouch(); c.status = 'REVIEWED'; }],
      ['Rescreen the case', 'c.screen(candidates, policy, now);', 'matches.addAll(newHits);  // duplicates? resolutions?', () => c.screen(WC.candidatesFor(party), 80, now()), () => { anemicTouch(); c.matches.push({ ...structuredClone(c.matches[0]), id: WC.uuid(), resolution: 'UNRESOLVED', rationale: null, resolvedBy: null }); c.screeningCount++; }],
    ];
    function anemicTouch() { if (c.status === 'CLOSED') closedTouched = true; }
    OPS.forEach(([label, richCode, anemicCode, rich, anemic]) => ops.append(el('button', { class: 'btn small secondary', onclick: () => {
      code.querySelector('code').textContent = mode === 'rich' ? richCode : anemicCode;
      if (mode === 'rich') {
        if (!rich) { log.append(el('div', { class: 'err' }, `✗ ${label}: does not compile – the aggregate exposes no such method.`)); }
        else {
          try { rich(); log.append(el('div', { class: 'ok' }, `✓ ${label}`)); c.pullEvents(); } catch (e) { log.append(el('div', { class: 'err' }, `✗ ${label}: DomainException ${e.rule} – ${e.message}`)); }
        }
      } else {
        try {
          anemic();
          log.append(el('div', { class: 'ok' }, `✓ ${label} (saved)`));
        } catch {
          log.append(el('div', { class: 'err' }, `✗ ${label}: NullPointerException – that match row was already deleted`));
        }
      }
      log.scrollTop = log.scrollHeight;
      render();
    } }, label)));
    ops.append(el('button', { class: 'btn small amber', onclick: reset }, 'Reset case'));

    function derived() {
      if (c.screeningCount === 0) return 'CREATED';
      return c.matches.some((m) => ['UNRESOLVED', 'POSSIBLE'].includes(m.resolution)) ? 'PENDING_REVIEW' : 'REVIEWED';
    }
    function render() {
      stateBox.innerHTML = '';
      stateBox.append(el('div', { class: 'sim-row' }, el('span', { class: `status-pill status-${c.status}` }, c.status), c.outcome ? el('b', {}, c.outcome) : null, el('span', { style: 'font-size:13px' }, `screenings: ${c.screeningCount}`)));
      c.matches.forEach((m, i) => stateBox.append(el('div', { class: 'match-card' },
        el('div', { class: 'head' }, el('b', {}, `#${i + 1} ${m.profileId}`), el('span', { class: `status-pill res-${m.resolution}` }, m.resolution)),
        el('div', { style: 'font-size:12.5px;color:var(--slate)' }, `by ${m.resolvedBy || '–'} · rationale: ${m.rationale || '∅'}`))));
      const profiles = c.matches.map((m) => m.profileId);
      const checks = [
        ['Closed case was modified', !closedTouched],
        ['At most one match per profile', new Set(profiles).size === profiles.length],
        ['Matches never removed', removed === 0],
        ['Resolved matches have a rationale', c.matches.every((m) => m.resolution === 'UNRESOLVED' || !!m.rationale)],
        ['Four-eyes on downgrading a POSITIVE', !fourEyesBroken],
        ['Closed only when screened and nothing UNRESOLVED/POSSIBLE', c.status !== 'CLOSED' || (c.screeningCount > 0 && !c.matches.some((m) => ['UNRESOLVED', 'POSSIBLE'].includes(m.resolution)))],
        ['Status equals the derived status', c.status === 'CLOSED' || c.status === derived()],
      ];
      monitor.innerHTML = '';
      checks.forEach(([n, ok]) => monitor.append(el('div', { style: `font-size:13.5px;color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:${ok ? 400 : 700}` }, `${ok ? '✓' : '✗'} ${n}`)));
      const broken = checks.filter(([, ok]) => !ok).length;
      monitor.append(el('div', { class: `verdict ${broken ? 'bad' : 'good'}` }, broken ? `${broken} invariant(s) broken – this case is now wrong in a way an auditor will find, and no exception was thrown.` : 'All invariants hold.'));
    }
    reset();
  });

  // ------------------------------------------------------------------ score lab (m06)
  Course.sim('score-lab', (node) => {
    header(node, 'Match score lab – the domain service, fully exposed',
      'Type a party. Every reference profile is scored with the exact NameMatchingPolicy algorithm from the code lab: blocking first, then plain / token-sort / token-set ratios over each name and alias, then date-of-birth and country adjustments, clamped to 0-100.');
    const name = el('input', { type: 'text', value: 'Victor Albescu', style: 'min-width:220px' });
    const type = el('select', {}, el('option', {}, 'INDIVIDUAL'), el('option', {}, 'ORGANISATION'));
    const dob = el('input', { type: 'date', value: '1961-03-14' });
    const country = el('input', { type: 'text', value: 'RO', style: 'width:60px' });
    const thr = el('input', { type: 'range', min: 50, max: 100, value: 80 });
    const thrLabel = el('b', {}, '80');
    const tokens = el('div', { style: 'font-size:13.5px;margin:6px 0' });
    const table = el('div', { class: 'scroll-x' });
    [name, type, dob, country, thr].forEach((i) => i.addEventListener('input', render));
    node.append(el('div', { class: 'sim-row' },
      el('label', { class: 'field' }, 'name', name), el('label', { class: 'field' }, 'entity type', type),
      el('label', { class: 'field' }, 'date of birth', dob), el('label', { class: 'field' }, 'country', country),
      el('label', { class: 'field' }, el('span', {}, 'threshold ', thrLabel), thr),
      el('button', { class: 'btn small secondary', onclick: () => { dob.value = ''; render(); } }, 'clear DOB')),
      tokens, table);
    function render() {
      thrLabel.textContent = thr.value;
      table.innerHTML = '';
      let party;
      try {
        party = WC.makeParty({ name: name.value, entityType: type.value, dateOfBirth: type.value === 'ORGANISATION' ? '' : dob.value, country: country.value });
      } catch (e) { tokens.innerHTML = ''; tokens.append(el('div', { class: 'verdict bad' }, `${e.rule}: ${e.message} (the value object refuses to exist)`)); return; }
      const t = WC.meaningfulTokens(party.name, party.type);
      tokens.innerHTML = `Normalised: <code>${Course.escape(WC.normalise(party.name))}</code> · meaningful tokens: ${t.map((x) => `<code>${Course.escape(x)}</code>`).join(' ')} · blocking keys: ${[...new Set(t.filter((x) => x.length >= 3).map((x) => x.slice(0, 3)))].map((k) => `<code>${k}</code>`).join(' ')}`;
      const candidates = new Set(WC.candidatesFor(party).map((p) => p.id));
      const rows = WC.PROFILES.map((p) => {
        const isCand = candidates.has(p.id);
        const e = WC.evaluate(party, p, +thr.value);
        let br = null;
        if (p.type === party.type) br = WC.similarityBreakdown(t, WC.meaningfulTokens(e.matchedName, p.type));
        return { p, isCand, e, br };
      }).sort((a, b) => (b.isCand - a.isCand) || (b.e.score - a.e.score));
      const pct = (x) => (x == null ? '–' : Math.round(x * 100));
      table.append(el('table', { class: 'db', style: 'font-size:12.5px' },
        el('tr', {}, ['profile', 'category', 'candidate?', 'best name', 'plain', 'sort', 'set', 'name', 'DOB', 'country', 'score', 'result'].map((h) => el('th', {}, h))),
        rows.map(({ p, isCand, e, br }) => {
          const typeMismatch = p.type !== party.type;
          const result = !isCand ? 'not a candidate (blocking)' : typeMismatch ? 'entity type differs' : e.match ? 'MATCH' : 'below threshold';
          return el('tr', { style: !isCand ? 'opacity:.4' : e.match ? 'background:#FDF1DC' : '' },
            el('td', {}, `${p.id} ${p.primaryName}`), el('td', {}, p.category), el('td', {}, isCand ? 'yes' : 'no'),
            el('td', {}, typeMismatch ? '–' : e.matchedName), el('td', {}, br ? pct(br.plain) : '–'), el('td', {}, br ? pct(br.sorted) : '–'), el('td', {}, br ? pct(br.set) : '–'),
            el('td', {}, typeMismatch ? '–' : e.nameSimilarity), el('td', {}, typeMismatch ? '–' : (e.dob > 0 ? '+' : '') + e.dob), el('td', {}, typeMismatch ? '–' : (e.country > 0 ? '+' : '') + e.country),
            el('td', {}, el('b', {}, typeMismatch ? '–' : e.score)), el('td', { style: `font-weight:700;color:${e.match && isCand ? 'var(--red)' : 'var(--slate)'}` }, result));
        })));
    }
    render();
  });

  // ------------------------------------------------------------------ bean resolution (m09)
  Course.sim('bean-resolution', (node) => {
    header(node, 'Bean resolution simulator – what Micronaut will inject, and why',
      'Micronaut generated a BeanDefinition class for every bean at compile time. At startup it evaluates each @Requires against your configuration and environment. Change the inputs and see which bean wins every injection point – or which exception you will get.');
    const cfg = { mode: 'in-memory', sink: 'log', env: 'default', duplicate: false, replaceClock: false };
    const field = (label, key, opts) => el('label', { class: 'field' }, label, el('select', { onchange: (e) => { cfg[key] = e.target.value; render(); } }, opts.map((o) => el('option', { value: o }, o))));
    const check = (label, key) => el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:13.5px' }, el('input', { type: 'checkbox', onchange: (e) => { cfg[key] = e.target.checked; render(); } }), label);
    node.append(el('div', { class: 'sim-row' },
      field('screening.reference-data.mode', 'mode', ['in-memory', 'http', 'inmemory (typo)', '(not set)']),
      field('screening.events.sink', 'sink', ['log', 'kafka', '(not set)']),
      field('environment', 'env', ['default', 'test'])),
    el('div', { class: 'sim-row' },
      check('Someone adds a 2nd @Singleton ReferenceDataSource (CachedReferenceDataSource) without @Requires', 'duplicate'),
      check('Test adds @Replaces(Clock) FixedClock', 'replaceClock')));
    const out = el('div');
    node.append(out);
    function render() {
      const mode = cfg.mode === '(not set)' ? 'in-memory' : cfg.mode;
      const sink = cfg.sink === '(not set)' ? 'log' : cfg.sink;
      const points = [
        { type: 'ReferenceDataSource', into: 'CaseApplicationService (via ApplicationWiring factory)', candidates: [
          { bean: 'InMemoryReferenceDataSource', cond: '@Requires(property="screening.reference-data.mode", value="in-memory", defaultValue="in-memory")', ok: mode === 'in-memory' },
          { bean: 'HttpReferenceDataSource', cond: '@Requires(property="screening.reference-data.mode", value="http")', ok: mode === 'http' },
          ...(cfg.duplicate ? [{ bean: 'CachedReferenceDataSource', cond: '@Singleton, no condition', ok: true }] : []),
        ] },
        { type: 'IntegrationEventSink', into: 'OutboxRelay', candidates: [
          { bean: 'LoggingEventSink', cond: '@Requires(property="screening.events.sink", value="log", defaultValue="log")', ok: sink === 'log' },
          { bean: 'KafkaEventSink (exercise – only if you wrote it)', cond: '@Requires(property="screening.events.sink", value="kafka")', ok: sink === 'kafka' },
        ] },
        { type: 'Clock', into: 'CaseApplicationService', candidates: [
          { bean: 'ApplicationWiring.clock() → Clock.systemUTC()', cond: '@Factory @Singleton', ok: !(cfg.replaceClock && cfg.env === 'test') },
          ...(cfg.replaceClock ? [{ bean: 'FixedClock (test source set)', cond: `@Replaces(Clock.class) @Requires(env="test")`, ok: cfg.env === 'test', replaces: true }] : []),
        ] },
        { type: 'OpenCaseUseCase', into: 'CaseController', candidates: [
          { bean: 'CaseApplicationService (from ApplicationWiring.caseApplicationService)', cond: '@Factory method returning a class that implements all five port.in interfaces', ok: true },
        ] },
        { type: 'CaseRowRepository', into: 'JdbcCaseRepository', candidates: [
          { bean: 'CaseRowRepository$Intercepted (generated by micronaut-data-processor)', cond: '@JdbcRepository(dialect = H2) – implementation written at compile time', ok: true },
        ] },
      ];
      out.innerHTML = '';
      let failures = 0;
      for (const p of points) {
        const winners = p.candidates.filter((c) => c.ok);
        let result;
        if (winners.length === 1) result = el('div', { class: 'verdict good' }, `Injects ${winners[0].bean}`);
        else if (winners.length === 0) { failures++; result = el('div', { class: 'verdict bad' }, `NoSuchBeanException: No bean of type [${p.type}] exists. ${cfg.mode.includes('typo') ? 'Property value "inmemory" matches neither @Requires – a typo is a startup failure, not a silent fallback.' : ''}`); }
        else { failures++; result = el('div', { class: 'verdict bad' }, `NonUniqueBeanException: Multiple possible bean candidates found: [${winners.map((w) => w.bean).join(', ')}]. Fix with @Requires, @Primary, @Named qualifiers, or remove one.`); }
        out.append(el('div', { class: 'panel', style: 'margin:10px 0' },
          el('h5', {}, `Injection point: ${p.type} → ${p.into}`),
          p.candidates.map((c) => el('div', { style: `font-size:13.5px;padding:4px 0;color:${c.ok ? 'var(--ink)' : 'var(--slate)'}` },
            c.ok ? '✓ ' : '✗ ', el('b', {}, c.bean), el('div', { style: 'font-size:12px;font-family:monospace;color:var(--slate);padding-left:16px' }, c.cond + (c.ok ? '' : '  → condition not met, bean disabled')))),
          result));
      }
      out.prepend(el('div', { class: `verdict ${failures ? 'bad' : 'good'}` }, failures ? `Application context fails: ${failures} unresolved injection point(s). You get this at startup or first use – never a half-wired system in production.` : 'Context starts. Every injection point has exactly one candidate.'));
    }
    render();
  });

  // ------------------------------------------------------------------ saga / process manager (m13)
  Course.sim('saga', (node) => {
    header(node, 'Ongoing-monitoring process manager – step through it, inject failures',
      'A sanctions profile is updated. Ongoing Monitoring must rescreen every affected case in Screening and alert clients about new matches. No distributed transaction exists: the process is a chain of local transactions connected by events, with retries and de-duplication.');
    const FAILS = { none: 'Happy path', down: 'Screening is down for 2 attempts', dup: 'ProfileUpdated delivered twice', closed: 'One affected case is already CLOSED' };
    let fail = 'none'; let i = 0;
    const steps = () => {
      const s = [
        ['Risk Intelligence', 'publishes ProfileUpdated{profileId: WC-1003, version: 42, eventId: e-77}', 'event'],
        ['Monitoring (process manager)', 'inbox: INSERT processed_event(e-77) – first time seen', 'local'],
      ];
      if (fail === 'dup') s.push(['Monitoring', 'duplicate ProfileUpdated e-77 arrives → processed_event has it → acknowledge and ignore', 'ok']);
      s.push(['Monitoring', 'read model: cases watching names with blocking key VAL / DMI → 2 cases (A open, B ' + (fail === 'closed' ? 'CLOSED' : 'open') + ')', 'local']);
      s.push(['Monitoring', 'state: Rescreen{profile 42, pending [A, B]} saved in its own DB', 'local']);
      if (fail === 'down') {
        s.push(['Monitoring → Screening', 'RescreenCase(A) → timeout. Retry in 2s (attempt 1/5)', 'err']);
        s.push(['Monitoring → Screening', 'RescreenCase(A) → 503. Retry in 4s with jitter (attempt 2/5)', 'err']);
      }
      s.push(['Screening', 'RescreenCase(A) → screen() in one local transaction → CaseScreened{newMatches: 1} in outbox', 'local']);
      if (fail === 'closed') {
        s.push(['Screening', 'RescreenCase(B) → 422 CASE_CLOSED (invariant)', 'err']);
        s.push(['Monitoring', 'policy decision (not a bug!): open a NEW review case for B\'s party, linked to B, then screen it', 'ok']);
      } else s.push(['Screening', 'RescreenCase(B) → CaseScreened{newMatches: 0}', 'local']);
      s.push(['Monitoring', 'on CaseScreened(A, newMatches>0) → raise MonitoringAlert(A) (outbox)', 'local']);
      s.push(['Notifications', 'deliver webhook to client group of A (idempotent by alert id)', 'event']);
      s.push(['Monitoring', 'state: Rescreen{profile 42} COMPLETE – all cases accounted for', 'ok']);
      return s;
    };
    const failSel = el('select', { onchange: (e) => { fail = e.target.value; i = 0; render(); } }, Object.entries(FAILS).map(([k, v]) => el('option', { value: k }, v)));
    const list = el('ol', { class: 'step-list' });
    const note = el('div');
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Failure to inject', failSel),
      el('button', { class: 'btn small secondary', onclick: () => { i = Math.max(0, i - 1); render(); } }, '◀ Prev'),
      el('button', { class: 'btn small', onclick: () => { i = Math.min(steps().length - 1, i + 1); render(); } }, 'Next ▶')),
    el('div', { class: 'sim-grid cols-2' }, el('div', { class: 'panel' }, list), note));
    const NOTES = {
      none: 'Each arrow is a separate local transaction. If any process dies between steps, the outbox/inbox tables let it resume where it was – no step is lost or doubled.',
      down: 'Retries with exponential backoff and jitter are safe only because RescreenCase is idempotent: screening twice keeps one match per profile and preserves resolutions (invariant 2).',
      dup: 'At-least-once delivery means duplicates are normal. The inbox table (processed_event keyed by eventId) is the idempotent-consumer pattern.',
      closed: 'The aggregate protects its invariant; the process manager owns the business decision of what to do instead. That split is the essence of a process manager.',
    };
    function render() {
      list.innerHTML = '';
      steps().forEach(([who, what, kind], k) => list.append(el('li', { class: k === i ? 'current' : k < i ? 'past' : '', onclick: () => { i = k; render(); }, style: k > i ? 'opacity:.4' : '' },
        el('b', {}, who), el('div', { style: `font-size:13px;color:${kind === 'err' ? 'var(--red)' : kind === 'ok' ? 'var(--green)' : kind === 'event' ? 'var(--purple)' : 'var(--ink)'}` }, what))));
      note.innerHTML = '';
      note.append(el('div', { class: 'verdict info' }, NOTES[fail]));
    }
    render();
  });

  // ------------------------------------------------------------------ code review (m14)
  Course.sim('code-review', (node) => {
    header(node, 'Code review simulator', 'Real-looking pull requests. Tick every genuine problem, leave the distractors unticked, then submit. Each finding comes with the review comment you would actually write.');
    const PRS = [
      { title: 'PR #412 – "Quick fix: allow closing from the controller"', lang: 'java', code: `@Controller("/cases")
public class CaseController {
    @Inject CaseRowRepository rows;

    @Post("/{id}/close")
    @Transactional
    public CaseRow close(UUID id) {
        CaseRow row = rows.findById(id).orElseThrow();
        if (!row.status().equals("CLOSED")) {
            row = row.withStatus("CLOSED");
            rows.update(row);
        }
        return row;
    }
}`, issues: [
        ['Business rule (can it close?) lives in the controller, and is incomplete', true, 'Closure rules (screened, no UNRESOLVED/POSSIBLE) belong in ScreeningCase.close(). The controller should only translate HTTP to CloseCaseCommand.'],
        ['Controller depends directly on a persistence repository', true, 'adapter.in → adapter.out bypasses the application layer; ArchUnit should fail this.'],
        ['Returns the persistence row as the API response', true, 'Leaks schema into the public contract (OHS). Return CaseResponse.'],
        ['Tenant (client group) is not checked', true, 'Any client can close any case if they guess a UUID. Path must include clientGroupId and the use case must check belongsTo.'],
        ['Uses UUID for the id', false, 'Fine – CaseId wraps a UUID.'],
        ['No event is raised, so audit and monitoring never learn the case closed', true, 'Going through the aggregate raises CaseClosed into the outbox.'],
      ] },
      { title: 'PR #418 – "Persist the domain model directly, less mapping"', lang: 'java', code: `@MappedEntity("screening_case")
@Data  // Lombok getters + setters
public class ScreeningCase {
    @Id UUID id;
    String status;
    @Relation(ONE_TO_MANY) List<Match> matches;

    public void addMatch(Match m) { matches.add(m); }
}`, issues: [
        ['Framework annotations inside the domain model', true, 'Domain must be plain Java so it can be tested and evolved independently; ArchUnit forbids io.micronaut.data in domain.'],
        ['Public setters let anyone set status and bypass invariants', true, 'Status is derived. Expose behaviour (screen, resolveMatch, close), not setters.'],
        ['addMatch allows duplicates per profile', true, 'Invariant 2: at most one match per profile; the aggregate must enforce it.'],
        ['Status stored as a String', true, 'Use the CaseStatus enum in the domain; strings belong in the row mapper.'],
        ['Class is called ScreeningCase', false, 'The name is right – it is ubiquitous language.'],
      ] },
      { title: 'PR #425 – "Screen and notify"', lang: 'java', code: `public CaseView screen(ScreenCaseCommand cmd) {
    return unitOfWork.write(() -> {
        ScreeningCase c = load(cmd.clientGroup(), cmd.caseId());
        List<ReferenceProfile> candidates = referenceData.candidatesFor(c.party()); // HTTP call
        c.screen(candidates, policy, clock.instant());
        cases.save(c);
        kafka.send("case-events", toJson(c));  // publish
        return CaseView.of(c);
    });
}`, issues: [
        ['Remote HTTP call inside the database transaction', true, 'Holds a connection and row locks for a network round-trip; fetch candidates first, outside write(), like CaseApplicationService.'],
        ['Publishes to Kafka inside the transaction (dual write)', true, 'If the commit fails after send, consumers saw a change that never happened. Append to the outbox instead.'],
        ['Publishes the whole aggregate instead of domain events', true, 'Consumers couple to internal state. Publish versioned events (CaseScreened with counts).'],
        ['Application service depends on the Kafka client', true, 'The application ring talks to port.out interfaces only.'],
        ['Uses an injected Clock', false, 'Good: deterministic tests.'],
      ] },
      { title: 'PR #431 – "Add MatchRepository for faster resolution"', lang: 'java', code: `public void resolve(UUID matchId, String resolution, String analyst) {
    MatchRow m = matchRepository.findById(matchId).orElseThrow();
    matchRepository.update(m.withResolution(resolution).withResolvedBy(analyst));
}`, issues: [
        ['Changes a Match without loading its aggregate (bypasses four-eyes, rationale, closed checks)', true, 'Repositories exist per aggregate root only. Matches change through ScreeningCase.resolveMatch().'],
        ['No optimistic-lock version involved', true, 'Updating the child row does not bump the case version: concurrent decisions are lost.'],
        ['No rationale captured', true, 'Regulatory requirement and invariant 4.'],
        ['Method name "resolve"', false, 'Matches the ubiquitous language.'],
      ] },
    ];
    PRS.forEach((pr) => {
      const box = el('div', { class: 'panel', style: 'margin:14px 0' }, el('h5', {}, pr.title), el('pre', {}, el('code', {}, pr.code)));
      const results = el('div');
      pr.issues.forEach(([text], ii) => box.append(el('label', { style: 'display:flex;gap:8px;font-size:14px;margin:5px 0;align-items:flex-start' }, el('input', { type: 'checkbox', 'data-i': ii }), text)));
      box.append(el('button', { class: 'btn small amber', onclick: () => {
        results.innerHTML = '';
        let right = 0;
        pr.issues.forEach(([text, real, comment], ii) => {
          const ticked = box.querySelector(`input[data-i="${ii}"]`).checked;
          const ok = ticked === real;
          if (ok) right++;
          results.append(el('div', { style: `font-size:13.5px;padding:6px 8px;margin:4px 0;border-radius:6px;background:${ok ? 'var(--green-light)' : 'var(--red-light)'}` },
            el('b', {}, `${ok ? '✓' : '✗'} ${real ? 'Real issue' : 'Not an issue'}: `), text, el('div', { style: 'color:var(--slate)' }, `Review comment: ${comment}`)));
        });
        results.prepend(el('div', { class: `verdict ${right === pr.issues.length ? 'good' : 'bad'}` }, `${right}/${pr.issues.length} judged correctly`));
      } }, 'Submit review'), results);
      node.append(box);
    });
  });

  // ------------------------------------------------------------------ maturity self-assessment (m15)
  Course.sim('maturity', (node) => {
    header(node, 'Team maturity self-assessment', 'Score your team honestly, 1-5, on each dimension. The radar shows the shape; the plan lists the three weakest areas with the first concrete action for each. Re-run it every quarter and keep the screenshots in your ADR repo.');
    const DIMS = [
      ['Ubiquitous language', ['Tech terms everywhere', 'Glossary exists', 'Code uses business terms', 'Language reviewed with domain experts', 'Language drives design and APIs'], 'Run a 60-minute glossary session with two analysts; rename the three worst classes this sprint.'],
      ['Bounded contexts', ['One big model', 'Modules by technical layer', 'Contexts named', 'Context map with patterns', 'Contexts own data + contracts'], 'Draw the context map (module 2) for your area and review it with neighbouring teams.'],
      ['Aggregate design', ['Anemic entities + services', 'Some behaviour on entities', 'Invariants listed per aggregate', 'Small aggregates, ids between them', 'Invariants tested, aggregates reshaped by evidence'], 'Pick one aggregate, write its invariants as a numbered Javadoc list, add one test per invariant.'],
      ['Hexagonal boundaries', ['Framework everywhere', 'Packages by layer', 'Ports defined', 'ArchUnit enforced in CI', 'Adapters swappable, proven by tests'], 'Add HexagonalArchitectureTest (module 8) to the build, even with freezing of existing violations.'],
      ['Testing strategy', ['Manual / end-to-end only', 'Slow integration tests', 'Domain unit tests exist', 'Pyramid: domain > app > adapter > API', 'Fast feedback < 2 min, contract tests'], 'Measure test runtime; move one rule test from @MicronautTest down to a plain domain test.'],
      ['Event integration', ['Synchronous calls only', 'Events published after commit', 'Outbox in place', 'Versioned schemas, idempotent consumers', 'Event catalogue, replay, DLQ runbooks'], 'Find one dual write; replace it with the outbox pattern from module 13.'],
      ['Operability', ['Logs only', 'Health checks', 'Metrics + dashboards', 'SLOs with alerts', 'Error budgets drive priorities'], 'Define one SLO for screening latency and wire the Micrometer timer.'],
      ['Team practices', ['Ad-hoc design', 'Occasional design talk', 'ADRs written', 'Regular design reviews + katas', 'Engineers lead workshops themselves'], 'Start a fortnightly 45-minute kata (facilitator guide, week 3).'],
    ];
    const scores = DIMS.map(() => 2);
    const sliders = el('div', { class: 'sim-grid cols-2' });
    const chart = el('div');
    const plan = el('div');
    DIMS.forEach(([name, levels], i) => {
      const desc = el('div', { style: 'font-size:12.5px;color:var(--slate)' }, levels[1]);
      const val = el('b', {}, '2');
      sliders.append(el('div', { class: 'panel' }, el('div', { style: 'display:flex;justify-content:space-between' }, el('b', { style: 'font-size:14px' }, name), val),
        el('input', { type: 'range', min: 1, max: 5, value: 2, style: 'width:100%', oninput: (e) => { scores[i] = +e.target.value; val.textContent = e.target.value; desc.textContent = levels[scores[i] - 1]; render(); } }), desc));
    });
    node.append(el('div', { class: 'sim-grid', style: 'grid-template-columns: 1.3fr 1fr' }, sliders, el('div', {}, chart, plan)));
    function render() {
      const cx = 200; const cy = 190; const R = 140; const n = DIMS.length;
      const pt = (i, r) => [cx + r * Math.sin((2 * Math.PI * i) / n), cy - r * Math.cos((2 * Math.PI * i) / n)];
      let s = '<svg viewBox="0 0 400 390" width="100%" font-family="Inter, Arial" font-size="10.5">';
      for (let l = 1; l <= 5; l++) s += `<polygon points="${DIMS.map((_, i) => pt(i, (R * l) / 5).join(',')).join(' ')}" fill="none" stroke="#C9D3DE"/>`;
      DIMS.forEach(([name], i) => {
        const [x, y] = pt(i, R + 18);
        s += `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" stroke="#DCE3EA"/>`;
        s += `<text x="${x}" y="${y}" text-anchor="${x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'}" fill="#1F3A5F" font-weight="700">${name}</text>`;
      });
      s += `<polygon points="${scores.map((v, i) => pt(i, (R * v) / 5).join(',')).join(' ')}" fill="rgba(42,157,143,.35)" stroke="#2A9D8F" stroke-width="2.5"/>`;
      s += '</svg>';
      chart.innerHTML = s;
      const avg = scores.reduce((a, b) => a + b, 0) / n;
      const weakest = scores.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).slice(0, 3);
      plan.innerHTML = '';
      plan.append(el('div', { class: 'verdict info' }, `Average ${avg.toFixed(1)} / 5`),
        el('h4', {}, 'Your next three moves'),
        el('ol', {}, weakest.map(([v, i]) => el('li', { style: 'font-size:14px;margin:6px 0' }, el('b', {}, `${DIMS[i][0]} (${v}): `), DIMS[i][2]))));
    }
    render();
  });
})();
