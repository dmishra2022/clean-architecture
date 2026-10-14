/* Concept simulators: each one isolates one idea so it can be explored and argued about. */
(function () {
  const { el } = Course;
  const header = (node, title, intro) => Course.simHeader(node, title, intro);
  const RING_COLORS = { entity: '#F2C14E', usecase: '#E07A5F', iadapter: '#5FAD56', framework: '#3E7CB1', main: '#6D5BD0', test: '#5B6B7F' };

  // ------------------------------------------------------------------ change impact (m01)
  Course.sim('change-impact', (node) => {
    header(node, 'Change-impact simulator – layered "service + entity" vs Clean Architecture',
      'Pick a real change request from a screening backlog. Components that must be edited light up with the reason. Count the edits, count the Maven modules that must be recompiled, and count the affected tests that need a database or network.');
    const LAYERED = {
      CaseController: 'controller with validation and some business checks',
      CaseService: '1,800-line service: rules, SQL, HTTP calls, Kafka, labels',
      CaseEntity: '@Entity with public setters, also serialised as JSON',
      MatchEntity: '@Entity, status strings',
      CaseDao: 'SQL + some "if status == …" rules',
      ProviderClient: 'HTTP client returning provider JSON objects',
      KafkaPublisher: 'called from CaseService after save',
      ReportJob: 're-implements "can this case close?"',
      CaseServiceTest: 'full-context test, needs DB + Kafka',
    };
    const CLEAN = {
      'ScreeningCase (entities)': 'aggregate: enterprise rules live here only',
      'NameMatchingPolicy (entities)': 'scoring, enterprise rule',
      '*Interactor (use cases)': 'application rules: transactions, idempotency, triage',
      'Gateway interfaces (use cases)': 'CaseGateway, EventOutboxGateway, …',
      'CaseController + Forms (adapters)': 'shape checks, form → request model',
      'CasePresenter (adapters)': 'status codes, labels, allowedActions',
      'SqlCaseGateway + CaseRecordMapper (adapters)': 'aggregate ↔ records',
      'ProfileTranslator (adapters)': 'ACL: provider codes → entities',
      'Micronaut*Records / sinks (framework)': 'Data JDBC, Netty, Kafka clients',
      'MainWiring + application.yml (framework)': 'the Main component',
      'Entity & interactor unit tests': 'plain JUnit, milliseconds',
    };
    const MODULE = (k) => (k.includes('entities') || k.startsWith('Entity') ? 'entities' : k.includes('use cases') ? 'usecases' : k.includes('adapters') ? 'adapters' : k.includes('framework') ? 'app' : null);
    const CHANGES = [
      { name: 'Move from H2 to PostgreSQL', layered: { CaseDao: 'vendor SQL in 14 methods', CaseService: 'native queries in the service', CaseEntity: 'column annotations', CaseServiceTest: 'test DB setup' },
        clean: { 'Micronaut*Records / sinks (framework)': 'dialect on @JdbcRepository', 'MainWiring + application.yml (framework)': 'datasource URL + driver' }, infra: [3, 0] },
      { name: 'Publish case events to Kafka instead of logs', layered: { CaseService: 'KafkaTemplate calls in 6 places', KafkaPublisher: 'new topics', CaseController: 'some endpoints publish directly', ReportJob: 'publishes too', CaseServiceTest: 'needs embedded Kafka' },
        clean: { 'Micronaut*Records / sinks (framework)': 'new KafkaEventSink implements IntegrationEventSink', 'MainWiring + application.yml (framework)': 'screening.events.sink: kafka' }, infra: [2, 0] },
      { name: 'New rule: POSSIBLE matches block closure', layered: { CaseService: 'closeCase() check', CaseController: 'duplicated pre-check', CaseDao: 'bulkClose() bypasses service', ReportJob: 'report re-implements rule', MatchEntity: 'new status constant', CaseServiceTest: 'slow test per path' },
        clean: { 'ScreeningCase (entities)': 'close() uses Resolution.blocksClosure()', 'Entity & interactor unit tests': '2 new ScreeningCaseTest cases' }, infra: [1, 0] },
      { name: 'Operators want a command-line tool too', layered: { CaseService: 'extract logic from HTTP-shaped methods', CaseController: 'logic copied into the CLI', CaseEntity: 'JSON annotations clash with CLI output', CaseServiceTest: 'new full-stack tests' },
        clean: { 'CaseController + Forms (adapters)': 'untouched; a new CliController builds the same request models', 'CasePresenter (adapters)': 'untouched; a new CliCasePresenter implements CaseOutputBoundary', 'MainWiring + application.yml (framework)': 'a picocli entry point wires the same interactors' }, infra: [1, 0] },
      { name: 'UI wants friendlier status labels and per-status actions', layered: { CaseEntity: 'add @JsonProperty label getters', CaseService: 'computes "can close" for the UI', CaseController: 'formats labels', ReportJob: 'its own labels', CaseServiceTest: 'asserts on labels' },
        clean: { 'CasePresenter (adapters)': 'STATUS_LABELS and allowedActions – a presentation decision' }, infra: [1, 0] },
      { name: 'Triage: HIGH priority from score 90 instead of 95', layered: { CaseService: 'sorting buried in a query method', CaseDao: 'ORDER BY CASE WHEN score >= 95 …', ReportJob: 'its own ordering' },
        clean: { '*Interactor (use cases)': 'ListWorkQueueInteractor.HIGH_PRIORITY_SCORE', 'Entity & interactor unit tests': 'ListWorkQueueInteractorTest' }, infra: [2, 0] },
      { name: 'Reference-data provider renames fields (v1 → v2)', layered: { ProviderClient: 'new DTOs', CaseService: 'uses provider fields directly', MatchEntity: 'stores provider codes', ReportJob: 'maps provider codes', CaseServiceTest: 'fixtures with provider JSON' },
        clean: { 'ProfileTranslator (adapters)': 'maps the new field names to the same ReferenceProfile' }, infra: [1, 0] },
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
      grid.append(column('Layered, anemic model (one module)', LAYERED, c.layered, '#FBE9E5'), column('Clean Architecture (one module per ring)', CLEAN, c.clean, '#FDF1DC'));
      const touchedModules = new Set(Object.keys(c.clean).map(MODULE).filter(Boolean));
      const order = ['entities', 'usecases', 'adapters', 'app'];
      const inner = order.findIndex((m) => touchedModules.has(m));
      const recompiled = inner === -1 ? [] : order.slice(inner);
      verdict.innerHTML = '';
      verdict.append(el('div', { class: 'verdict info' },
        `Edits: layered ${Object.keys(c.layered).length} vs Clean ${Object.keys(c.clean).length}. Tests needing infrastructure: ${c.infra[0]} vs ${c.infra[1]}. `
        + `Clean modules rebuilt: ${recompiled.join(' → ') || 'none'} (a change only recompiles its ring and the rings outside it).`));
    }
    render();
  });

  // ------------------------------------------------------------------ SOLID detector (m02)
  Course.sim('solid-detector', (node) => {
    header(node, 'SOLID detector – which principle does this code break?',
      'Every snippet comes from a real review of a screening service. Put it in the box of the principle it violates. Clean Architecture is SOLID applied at the scale of components, so these are the same arguments you will have about rings.');
    Course.classifier(node, { bins: [
      { id: 'srp', name: 'SRP – one actor per module', color: '#F2C14E' }, { id: 'ocp', name: 'OCP – extend without editing', color: '#E07A5F' },
      { id: 'lsp', name: 'LSP – substitutable implementations', color: '#5FAD56' }, { id: 'isp', name: 'ISP – no fat interfaces', color: '#3E7CB1' },
      { id: 'dip', name: 'DIP – depend on abstractions', color: '#6D5BD0' },
    ], items: [
      { text: 'CaseService computes match scores (compliance rule) and formats the CSV export (operations report)', bin: 'srp', why: 'Two actors – compliance and operations – change it for different reasons. Uncle Bob\'s SRP is about actors, not "does one thing".' },
      { text: 'CasePresenter decides HTTP status codes and also writes the audit log', bin: 'srp', why: 'Presentation and audit serve different stakeholders; audit belongs to events via the outbox.' },
      { text: 'Adding a Kafka sink means editing a switch(sinkType) inside OutboxRelay', bin: 'ocp', why: 'New behaviour should be a new IntegrationEventSink implementation selected by configuration.' },
      { text: 'Every new delivery mechanism (CLI, batch) forces changes to the interactors', bin: 'ocp', why: 'The output boundary makes interactors closed for modification: a new presenter extends the system.' },
      { text: 'A hand-written fake CaseGateway.save() silently ignores stale versions, so tests pass where production returns 409', bin: 'lsp', why: 'A fake that weakens the contract is not substitutable. The lab\'s InMemoryCaseRecords checks versions too.' },
      { text: 'RemoteReferenceData throws UnsupportedOperationException for organisations', bin: 'lsp', why: 'Callers of ReferenceDataGateway cannot rely on the contract any more.' },
      { text: 'One CaseGateway interface with 23 methods, including work-queue queries and reporting', bin: 'isp', why: 'The lab splits WorkQueueGateway out: ListWorkQueueInteractor depends on only what it uses.' },
      { text: 'CaseOutputBoundary has presentWorkQueue() so every case presenter must implement it', bin: 'isp', why: 'The lab has a separate WorkQueueOutputBoundary.' },
      { text: 'ScreenCaseInteractor has a field of type SqlCaseGateway', bin: 'dip', why: 'Policy depends on detail. Depend on the CaseGateway interface that ring 2 owns.' },
      { text: 'CaseController does `new OpenCaseInteractor(new SqlCaseGateway(...), ...)`', bin: 'dip', why: 'Only the Main component creates concretions; the controller receives the OpenCase input boundary.' },
    ] });
  });

  // ------------------------------------------------------------------ component metrics (m03)
  Course.sim('component-metrics', (node) => {
    header(node, 'Component metrics – stability, abstractness and the main sequence',
      'The four Maven modules of the code lab, with their real counts. <b>I</b> = Ce / (Ca + Ce) (instability), <b>A</b> = abstract types / all types, <b>D</b> = |A + I − 1| (distance from the main sequence). Add a bad dependency and watch the Acyclic Dependencies Principle and the Stable Dependencies Principle react.');
    const MODS = {
      entities: { name: 'screening-entities', ring: 'entity', types: 29, abstract: 1 },
      usecases: { name: 'screening-usecases', ring: 'usecase', types: 37, abstract: 14 },
      adapters: { name: 'screening-interface-adapters', ring: 'iadapter', types: 32, abstract: 4 },
      app: { name: 'screening-app', ring: 'framework', types: 25, abstract: 5 },
    };
    const BASE = [['usecases', 'entities'], ['adapters', 'usecases'], ['adapters', 'entities'], ['app', 'adapters'], ['app', 'usecases'], ['app', 'entities']];
    const BAD = [
      ['entities', 'usecases', 'ScreeningCase returns a CaseResponse "for convenience"'],
      ['usecases', 'adapters', 'ScreenCaseInteractor imports SqlCaseGateway'],
      ['adapters', 'app', 'CasePresenter reads a Micronaut HttpRequest from ScreeningApp'],
      ['usecases', 'app', 'an interactor injects MatchingProperties (a @ConfigurationProperties bean)'],
    ];
    const on = new Set();
    const toggles = el('div');
    BAD.forEach(([a, b, why], i) => toggles.append(el('label', { style: 'display:flex;gap:8px;align-items:flex-start;font-size:13.5px;margin:4px 0' },
      el('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) on.add(i); else on.delete(i); render(); } }), el('span', {}, el('b', {}, `${MODS[a].name} → ${MODS[b].name}: `), why))));
    const table = el('div');
    const chart = el('div');
    const verdict = el('div');
    node.append(el('div', { class: 'sim-grid cols-2' }, el('div', {}, el('div', { class: 'panel' }, el('h5', {}, 'Add a dependency'), toggles), table, verdict), chart));
    function cycles(edges) {
      const adj = {}; for (const k of Object.keys(MODS)) adj[k] = [];
      edges.forEach(([a, b]) => adj[a].push(b));
      const found = [];
      const dfs = (n, path) => {
        for (const m of adj[n]) {
          if (path.includes(m)) { found.push([...path.slice(path.indexOf(m)), m]); continue; }
          dfs(m, [...path, m]);
        }
      };
      Object.keys(MODS).forEach((k) => dfs(k, [k]));
      return found;
    }
    function render() {
      const edges = [...BASE, ...[...on].map((i) => BAD[i])];
      const m = {};
      for (const k of Object.keys(MODS)) {
        const ce = new Set(edges.filter(([a]) => a === k).map(([, b]) => b)).size;
        const ca = new Set(edges.filter(([, b]) => b === k).map(([a]) => a)).size;
        const I = ca + ce === 0 ? 0 : ce / (ca + ce);
        const A = MODS[k].abstract / MODS[k].types;
        m[k] = { ca, ce, I, A, D: Math.abs(A + I - 1) };
      }
      table.innerHTML = '';
      table.append(el('table', { class: 'metric-table' }, el('tr', {}, ['Module', 'Ca', 'Ce', 'I', 'abstract / types', 'A', 'D'].map((h) => el('th', {}, h))),
        Object.entries(MODS).map(([k, mod]) => el('tr', {}, el('td', {}, Course.ringTag(mod.ring), ' ', mod.name), el('td', { class: 'num' }, m[k].ca), el('td', { class: 'num' }, m[k].ce),
          el('td', { class: 'num' }, m[k].I.toFixed(2)), el('td', { class: 'num' }, `${mod.abstract} / ${mod.types}`), el('td', { class: 'num' }, m[k].A.toFixed(2)), el('td', { class: 'num' }, m[k].D.toFixed(2))))));
      const cyc = cycles(edges);
      const sdp = edges.filter(([a, b]) => m[b].I > m[a].I + 1e-9);
      verdict.innerHTML = '';
      verdict.append(cyc.length
        ? el('div', { class: 'verdict bad' }, `ADP violated – cycle ${cyc[0].map((k) => MODS[k].name.replace('screening-', '')).join(' → ')}. Maven refuses to build: "The projects in the reactor contain a cyclic reference".`)
        : el('div', { class: 'verdict good' }, 'ADP holds – the module graph is a DAG, so Maven can build it ring by ring.'));
      verdict.append(sdp.length
        ? el('div', { class: 'verdict bad' }, `SDP violated – ${sdp.map(([a, b]) => `${MODS[a].name.replace('screening-', '')} (I=${m[a].I.toFixed(2)}) depends on the less stable ${MODS[b].name.replace('screening-', '')} (I=${m[b].I.toFixed(2)})`).join('; ')}.`)
        : el('div', { class: 'verdict good' }, 'SDP holds – every dependency points toward a more stable module (lower I).'));
      verdict.append(el('p', { style: 'font-size:13.5px;color:var(--slate)' }, 'screening-entities sits near (A=0, I=0), the "zone of pain": concrete and depended on by everything. That is acceptable only because enterprise rules are non-volatile – the same reason java.lang.String lives there happily. If your entities change every sprint, they are not entities.'));
      const W = 380; const P = 40;
      const X = (I) => P + I * (W - 2 * P); const Y = (A) => W - P - A * (W - 2 * P);
      let s = `<svg viewBox="0 0 ${W} ${W}" width="100%" font-family="Inter, Arial" font-size="11">`
        + `<rect x="${P}" y="${P}" width="${W - 2 * P}" height="${W - 2 * P}" fill="#F7F9FB" stroke="#C9D3DE"/>`
        + `<path d="M${X(0)},${Y(0)} L${X(0)},${Y(0.35)} A${(W - 2 * P) * 0.35},${(W - 2 * P) * 0.35} 0 0 0 ${X(0.35)},${Y(0)} Z" fill="rgba(200,85,61,.12)"/>`
        + `<path d="M${X(1)},${Y(1)} L${X(1)},${Y(0.65)} A${(W - 2 * P) * 0.35},${(W - 2 * P) * 0.35} 0 0 1 ${X(0.65)},${Y(1)} Z" fill="rgba(91,107,127,.12)"/>`
        + `<line x1="${X(0)}" y1="${Y(1)}" x2="${X(1)}" y2="${Y(0)}" stroke="#2A9D8F" stroke-width="2" stroke-dasharray="6 4"/>`
        + `<text x="${X(0.5) + 8}" y="${Y(0.5) - 8}" fill="#1B6A60" font-weight="700">main sequence</text>`
        + `<text x="${X(0.02)}" y="${Y(0.04)}" fill="#C8553D" font-weight="700">zone of pain</text>`
        + `<text x="${X(0.98)}" y="${Y(0.95)}" text-anchor="end" fill="#5B6B7F" font-weight="700">zone of uselessness</text>`
        + `<text x="${W / 2}" y="${W - 8}" text-anchor="middle" fill="#1D2733">Instability I →</text>`
        + `<text x="12" y="${W / 2}" transform="rotate(-90 12 ${W / 2})" text-anchor="middle" fill="#1D2733">Abstractness A →</text>`;
      for (const [k, mod] of Object.entries(MODS)) {
        s += `<circle cx="${X(m[k].I)}" cy="${Y(m[k].A)}" r="9" fill="${RING_COLORS[mod.ring]}" stroke="#1D2733" stroke-width="1.5"/>`
          + `<text x="${X(m[k].I) + (m[k].I > 0.7 ? -13 : 13)}" y="${Y(m[k].A) + 4}" text-anchor="${m[k].I > 0.7 ? 'end' : 'start'}" font-weight="700" fill="#1D2733">${mod.name.replace('screening-', '')}</text>`;
      }
      chart.innerHTML = `${s}</svg>`;
    }
    render();
  });

  // ------------------------------------------------------------------ context map explorer (m04)
  Course.sim('context-map', (node) => {
    header(node, 'Context map explorer – one word, many meanings',
      'Choose a term from the business. Each bounded context shows what that word means inside it. Where meanings differ, a single shared class would be wrong for at least one team – that is the signal for a context boundary, and in Clean Architecture each context gets its own set of rings. Click a context for its relationships.');
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
      screening: [['API & UI clients → Screening', 'Open Host Service + Published Language', 'One versioned REST contract (/api/v1). Code: CaseController, CasePresenter and CaseJson in ring 3; CaseEndpoint in ring 4.'],
        ['Risk Intelligence Data → Screening', 'Upstream/Downstream with ACL in Screening', 'ProfileTranslator (ring 3) maps ProfileRecord → ReferenceProfile, so their model never reaches ring 1 or 2.'],
        ['Entitlements → Screening', 'Customer / Supplier', 'Screening needs "is this feature on for this client group"; it would be one more gateway interface owned by ring 2.'],
        ['Screening → Audit', 'Published events, Audit conforms', 'CaseOpened/Screened/MatchResolved/Closed via the outbox; EventJson (ring 3) is the published language v1.']],
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

  // ------------------------------------------------------------------ classifiers
  const STICKY = [
    { id: 'event', name: 'Domain event', color: '#F4A261' }, { id: 'command', name: 'Command', color: '#7EC8E3' },
    { id: 'aggregate', name: 'Aggregate', color: '#FFE066' }, { id: 'policy', name: 'Policy', color: '#C3AED6' },
    { id: 'readmodel', name: 'Read model', color: '#9BE7A0' }, { id: 'external', name: 'External system', color: '#F7A1C4' },
    { id: 'actor', name: 'Actor', color: '#FFF3B0' }, { id: 'hotspot', name: 'Hotspot', color: '#E76F6F' },
  ];
  Course.sim('event-storming', (node) => {
    header(node, 'Sticky-note classifier – run your own Event Storming', 'These notes came out of a workshop on case remediation. Put each on the right colour. Later in the course each colour maps to a ring: aggregates to entities, commands to request models, policies and read models to use cases, external systems to gateways.');
    Course.classifier(node, { bins: STICKY, items: [
      { text: 'Case Closed', bin: 'event', why: 'Past tense, business fact.' },
      { text: 'Match Resolved', bin: 'event', why: 'Something that happened, named by the business.' },
      { text: 'Profile Updated', bin: 'event', why: 'An event, raised by another context.' },
      { text: 'Resolve match', bin: 'command', why: 'Imperative: a request that may be rejected. In code: ResolveMatchRequest + the ResolveMatch input boundary.' },
      { text: 'Rescreen case', bin: 'command', why: 'An intention sent to the Screening Case.' },
      { text: 'Screening Case', bin: 'aggregate', why: 'Accepts or rejects commands, enforces rules, emits events. Ring 1.' },
      { text: 'Whenever a profile is updated → rescreen affected cases', bin: 'policy', why: '"Whenever X then Y" is reactive logic: a policy, usually an application rule (ring 2) or a process manager.' },
      { text: 'Whenever case closed with risk → notify client', bin: 'policy', why: 'Reaction that crosses into Notifications.' },
      { text: 'Analyst work queue (cases by priority)', bin: 'readmodel', why: 'Information someone needs to decide what to do next – ListWorkQueueInteractor in the lab.' },
      { text: 'Risk data corpus', bin: 'external', why: 'Another context/system we depend on – behind ReferenceDataGateway.' },
      { text: 'Compliance analyst', bin: 'actor', why: 'The person who issues the command.' },
      { text: 'Can the same analyst downgrade their own POSITIVE?', bin: 'hotspot', why: 'An open question – this one became the FOUR_EYES invariant.' },
      { text: 'Case saved to database', bin: 'hotspot', why: 'Technical, not a domain event. Flag it and ask: what business fact is behind it?' },
    ] });
  });

  Course.sim('entity-vo', (node) => {
    header(node, 'Entity, value object, or neither?', 'Identity that persists through change → entity. Defined only by its values, immutable, replaceable → value object. Behaviour that belongs to neither → domain service. All of them live in ring 1.');
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
      { text: 'Party (name, type, DOB, country)', bin: 'vo', why: 'In the screening context the party is a snapshot of submitted data, compared by value.' },
      { text: 'ReferenceProfile (in Screening)', bin: 'vo', why: 'Read-only copy of upstream data, produced by the ACL in ring 3.' },
    ] });
  });

  Course.sim('rule-classifier', (node) => {
    header(node, 'Enterprise rule, application rule, or not a business rule at all?',
      'Uncle Bob\'s test: an <b>enterprise business rule</b> would exist even if there were no software (a compliance officer with paper files would enforce it). An <b>application business rule</b> exists because of this particular automated system. Everything else is presentation or mechanism.');
    Course.classifier(node, { bins: [
      { id: 'entity', name: 'Enterprise rule → Entities', color: RING_COLORS.entity }, { id: 'usecase', name: 'Application rule → Use cases', color: RING_COLORS.usecase },
      { id: 'iadapter', name: 'Presentation / translation → Adapters', color: RING_COLORS.iadapter }, { id: 'framework', name: 'Mechanism → Frameworks & drivers', color: RING_COLORS.framework },
    ], items: [
      { text: 'A case may close only when every match is resolved and none is POSSIBLE', bin: 'entity', why: 'A paper-based compliance team would follow the same rule: ScreeningCase.close().' },
      { text: 'A confirmed POSITIVE may only be downgraded by a different analyst (four-eyes)', bin: 'entity', why: 'Regulatory control that predates software.' },
      { text: 'Every resolution needs a 10-2000 character rationale', bin: 'entity', why: 'ResolutionRationale – audit requirement, independent of any UI.' },
      { text: 'Retrying "open case" with the same Idempotency-Key returns the same case', bin: 'usecase', why: 'Exists only because clients talk to us over an unreliable network: OpenCaseInteractor.' },
      { text: 'Fetch reference data outside the write transaction', bin: 'usecase', why: 'Orchestration of this application: ScreenCaseInteractor.' },
      { text: 'Work queue: HIGH if an unresolved match scores ≥ 95, oldest first', bin: 'usecase', why: 'How this team triages in this tool. A regulator report would order differently: ListWorkQueueInteractor.' },
      { text: 'Another tenant\'s case looks exactly like a missing case', bin: 'usecase', why: 'CaseLookup – a multi-tenant SaaS rule, not a compliance rule.' },
      { text: 'Status CLOSED is shown as "Closed" and offers no actions', bin: 'iadapter', why: 'CasePresenter: labels and allowedActions.' },
      { text: 'Rule violation → 422, unknown case → 404', bin: 'iadapter', why: 'HTTP mapping in the presenter.' },
      { text: 'Provider category "SAN" means SANCTIONS', bin: 'iadapter', why: 'Translation at the border: ProfileTranslator.' },
      { text: 'Name must not be blank and is at most 200 characters in the JSON form', bin: 'iadapter', why: 'Shape check in Forms; the meaning check (must contain a letter) is in PartyName.' },
      { text: 'Rows are updated WHERE version = ?', bin: 'framework', why: 'Optimistic-locking mechanism in Micronaut Data (@Version); ring 3 turns it into a StaleRecordException.' },
      { text: 'The relay runs every 2 seconds', bin: 'framework', why: '@Scheduled configuration in ScheduledOutboxRelay.' },
    ] });
  });

  Course.sim('boundary-crossing', (node) => {
    header(node, 'What may cross a boundary?',
      'Data that crosses a boundary must be in the form most convenient for the <b>inner</b> ring and must not drag outer-ring types inward. Put each data structure where it belongs.');
    Course.classifier(node, { bins: [
      { id: 'cross', name: 'Crosses ring 3 ↔ ring 2 (request / response models)', color: RING_COLORS.usecase },
      { id: 'inner', name: 'Stays inside rings 1–2 (never reaches adapters)', color: RING_COLORS.entity },
      { id: 'adapter', name: 'Stays in ring 3 (view / record models)', color: RING_COLORS.iadapter },
      { id: 'framework', name: 'Stays in ring 4 (framework types)', color: RING_COLORS.framework },
    ], items: [
      { text: 'OpenCaseRequest(clientGroupId, name, entityType, dateOfBirth, country, idempotencyKey)', bin: 'cross', why: 'Plain strings and a LocalDate, built by the controller. The interactor turns them into value objects.' },
      { text: 'CaseResponse (strings, numbers, Instants, list of MatchResponse)', bin: 'cross', why: 'What the interactor hands the presenter. No entity escapes.' },
      { text: 'presentRuleViolation("MATCHES_AWAITING_REVIEW", message)', bin: 'cross', why: 'Failures cross as data on the output boundary, not as DomainException.' },
      { text: 'ScreeningCase aggregate', bin: 'inner', why: 'Only interactors and gateways touch it. ArchUnit: adapters.web never touches entities.' },
      { text: 'DomainException', bin: 'inner', why: 'Caught by Outcomes.presentingFailures and turned into presenter calls.' },
      { text: 'CaseJson with statusLabel and allowedActions', bin: 'adapter', why: 'A view model: shaped for the API client, built by CasePresenter.' },
      { text: 'CaseRecord(id, …, long version)', bin: 'adapter', why: 'Persistence shape behind CaseRecords. The aggregate never sees it.' },
      { text: 'ProfileRecord (upstream uid, profileType "P", riskCategory "SAN")', bin: 'adapter', why: 'Upstream language; ProfileTranslator keeps it out of ring 1.' },
      { text: 'HttpRequest / HttpResponse', bin: 'framework', why: 'Micronaut types. Responses.of(viewModel) is the only place an HttpResponse is built.' },
      { text: '@MappedEntity CaseRow with @Version Long', bin: 'framework', why: 'Micronaut Data entity; MicronautCaseRecords maps it to CaseRecord.' },
      { text: 'OptimisticLockException', bin: 'framework', why: 'Becomes StaleRecordException (ring 3), then ConcurrentCaseUpdateException (ring 2).' },
    ] });
  });

  Course.sim('where-belongs', (node) => {
    header(node, 'Where does this code belong?', 'Each card is a real piece of code from a screening service. Put it in the ring – or the Main component – where it must live. This is the conversation you will have in every code review.');
    Course.classifier(node, { bins: [
      { id: 'entity', name: 'Entities', color: RING_COLORS.entity }, { id: 'usecase', name: 'Use cases', color: RING_COLORS.usecase },
      { id: 'iadapter', name: 'Interface adapters', color: RING_COLORS.iadapter }, { id: 'framework', name: 'Frameworks & drivers', color: RING_COLORS.framework },
      { id: 'main', name: 'Main (MainWiring)', color: RING_COLORS.main },
    ], items: [
      { text: '"A closed case cannot be screened" check', bin: 'entity', why: 'Enterprise rule → ScreeningCase.requireOpen().' },
      { text: 'interface CaseGateway { findById; save }', bin: 'usecase', why: 'The use cases own the interfaces they need – that is what makes the dependency point inward.' },
      { text: 'interface CaseOutputBoundary { presentCase; presentNotFound; … }', bin: 'usecase', why: 'Owned by ring 2, implemented by CasePresenter in ring 3.' },
      { text: 'record ResolveMatchRequest(String clientGroupId, …)', bin: 'usecase', why: 'Request model of the ResolveMatch input boundary.' },
      { text: 'CaseController: Forms.errors(), then build ScreenCaseRequest', bin: 'iadapter', why: 'Converts from the delivery format to the use case format.' },
      { text: 'CasePresenter: 201 + Location, labels, problem details', bin: 'iadapter', why: 'Converts from the use case format to the view.' },
      { text: 'CaseRecordMapper: aggregate snapshot ↔ CaseRecord', bin: 'iadapter', why: 'Persistence translation, framework-free so it is unit-testable.' },
      { text: 'Mapping provider "SAN" → RiskCategory.SANCTIONS', bin: 'iadapter', why: 'Anti-corruption layer: ProfileTranslator.' },
      { text: '@Controller CaseEndpoint (copies ViewModel into HttpResponse)', bin: 'framework', why: 'A humble object: too framework-bound to test cheaply, so it holds no logic.' },
      { text: '@JdbcRepository interface CaseRows extends CrudRepository', bin: 'framework', why: 'Micronaut Data detail.' },
      { text: '@Replaces(ConversionErrorHandler) MalformedBodyHandler', bin: 'framework', why: 'Hooks into Micronaut\'s error pipeline, then reuses ProblemJson from ring 3.' },
      { text: '@Factory: new ScreenCaseInteractor(cases, refData, outbox, tx, policy, clock)', bin: 'main', why: 'The Main component is the only place that knows every concrete class.' },
      { text: '@ConfigurationProperties("screening.matching") → new NameMatchingPolicy(threshold)', bin: 'main', why: 'Configuration is read at the edge and passed inward as a plain int.' },
      { text: 'Name normalisation (accents, punctuation)', bin: 'entity', why: 'Part of the matching language: PartyName.normalise().' },
    ] });
  });

  Course.sim('test-classifier', (node) => {
    header(node, 'Which test catches this bug cheapest?', 'Each bug escaped to production somewhere. Pick the cheapest test in the code lab that would have caught it. Each ring has its own kind of test; if you keep choosing @MicronautTest, your pyramid is upside down.');
    Course.classifier(node, { bins: [
      { id: 'entity', name: 'Entity unit test (ring 1)', color: RING_COLORS.entity }, { id: 'usecase', name: 'Interactor test with fakes (ring 2)', color: RING_COLORS.usecase },
      { id: 'iadapter', name: 'Adapter unit test, no framework (ring 3)', color: RING_COLORS.iadapter }, { id: 'framework', name: '@MicronautTest / DB test (ring 4)', color: RING_COLORS.framework },
      { id: 'arch', name: 'Build: Maven modules + ArchUnit', color: RING_COLORS.main },
    ], items: [
      { text: 'A case closes while a POSSIBLE match is open', bin: 'entity', why: 'ScreeningCaseTest – pure Java, milliseconds.' },
      { text: '"Reyes Quintanar Marisol" no longer matches "Marisol Quintanar Reyes"', bin: 'entity', why: 'NameMatchingPolicyTest (token-sort).' },
      { text: 'Reference data is fetched while holding the write transaction', bin: 'usecase', why: 'CaseUseCasesTest.referenceDataIsFetchedOutsideTheWriteTransaction: TestWorld.ReferenceData records calledInsideWriteTransaction.' },
      { text: 'Same Idempotency-Key creates a second case', bin: 'usecase', why: 'CaseUseCasesTest.sameIdempotencyKeyPresentsTheSameCaseAsAReplay with TestWorld fakes.' },
      { text: 'Another tenant\'s case is shown instead of "not found"', bin: 'usecase', why: 'CaseUseCasesTest.anotherClientGroupGetsNotFoundForEveryUseCase: RecordingPresenter asserts "notFound".' },
      { text: 'A closed case still offers the "close" action', bin: 'iadapter', why: 'CasePresenterTest – plain Java, no HTTP.' },
      { text: 'Blank name reaches the interactor', bin: 'iadapter', why: 'CaseControllerTest: input boundary as a lambda asserts it was not called.' },
      { text: 'Provider code "PEP" mapped to SANCTIONS', bin: 'iadapter', why: 'ReferenceDataTest for ProfileTranslator.' },
      { text: 'Stale version silently overwrites a newer row', bin: 'framework', why: 'Only the real Micronaut Data @Version + H2 shows it (InMemoryCaseRecords mirrors the contract for ring-3 tests).' },
      { text: 'A malformed JSON body returns 500', bin: 'framework', why: 'Error-handler wiring needs the HTTP stack: CaseApiTest.' },
      { text: 'Someone adds io.micronaut imports to ScreeningCase', bin: 'arch', why: 'Does not even compile: screening-entities has no Micronaut on its classpath.' },
      { text: 'CaseController constructs an OpenCaseInteractor', bin: 'arch', why: 'CleanArchitectureTest: interactors are created only by app.config.' },
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
      ['Close the case now', 'gateway.findById(id).close(analyst, now);', 'caseEntity.setStatus("CLOSED");\ncaseEntity.setOutcome("CLEAR");\ncaseDao.update(caseEntity);', () => c.close('analyst-anna', now()), () => { anemicTouch(); c.status = 'CLOSED'; c.outcome = 'CLEAR'; }],
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

  // ------------------------------------------------------------------ score lab (m05)
  Course.sim('score-lab', (node) => {
    header(node, 'Match score lab – an enterprise rule, fully exposed',
      'Type a party. Every reference profile is scored with the exact NameMatchingPolicy algorithm from screening-entities: blocking first, then plain / token-sort / token-set ratios over each name and alias, then date-of-birth and country adjustments, clamped to 0-100.');
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

  // ------------------------------------------------------------------ wiring explorer (m11)
  Course.sim('wiring-explorer', (node) => {
    header(node, 'Wiring explorer – the Main component under pressure',
      'MainWiring is a Micronaut <code>@Factory</code> in screening-app. It is the only class that sees every ring. Change configuration and try the "clever" shortcuts teams propose, and see what Micronaut and the compiler do.');
    const cfg = { mode: 'in-memory', sink: 'log', singletonPresenter: false, annotateInteractor: false, secondGateway: false };
    const field = (label, key, opts) => el('label', { class: 'field' }, label, el('select', { onchange: (e) => { cfg[key] = e.target.value; render(); } }, opts.map((o) => el('option', { value: o }, o))));
    const check = (label, key) => el('label', { style: 'display:flex;gap:6px;align-items:flex-start;font-size:13.5px;margin:3px 0' }, el('input', { type: 'checkbox', onchange: (e) => { cfg[key] = e.target.checked; render(); } }), label);
    node.append(el('div', { class: 'sim-row' },
      field('screening.reference-data.mode', 'mode', ['in-memory', 'http', 'inmemory (typo)']),
      field('screening.events.sink', 'sink', ['log', 'kafka'])),
    el('div', { class: 'panel' }, el('h5', {}, 'Shortcuts someone proposes in a PR'),
      check('Make CasePresenter a @Singleton bean "to save allocations"', 'singletonPresenter'),
      check('Put @Singleton on OpenCaseInteractor so MainWiring is not needed', 'annotateInteractor'),
      check('Add a second CaseGateway bean (CachingCaseGateway) without a qualifier', 'secondGateway')));
    const out = el('div');
    node.append(out);
    function render() {
      out.innerHTML = '';
      const problems = [];
      if (cfg.annotateInteractor) {
        out.append(el('div', { class: 'verdict bad' }, 'Compilation failure in screening-usecases'),
          el('pre', {}, el('code', { class: 'lang-text' }, '[ERROR] OpenCaseInteractor.java:[3,17] package jakarta.inject does not exist\n[ERROR] OpenCaseInteractor.java:[12,2] cannot find symbol: class Singleton\n[INFO] screening-usecases ............ FAILURE')),
          el('p', { style: 'font-size:14px' }, 'Ring 2 has no Micronaut or jakarta.inject on its classpath, so the dependency rule is enforced by the compiler. Adding the dependency to its pom would "fix" it – and fail CleanArchitectureTest (no jakarta in inner rings). Wiring is the Main component\'s job.'));
        return;
      }
      const refOk = ['in-memory', 'http'].includes(cfg.mode);
      const beans = [
        ['Clock', 'MainWiring.clock()', 'Clock.systemUTC()', true],
        ['NameMatchingPolicy', 'MainWiring.nameMatchingPolicy(MatchingProperties)', 'new NameMatchingPolicy(80)', true],
        ['CaseGateway', 'MainWiring.caseGateway(CaseRecords)', 'new SqlCaseGateway(micronautCaseRecords)', !cfg.secondGateway],
        ['ReferenceDataGateway', cfg.mode === 'http' ? 'MainWiring.remoteReferenceData(client) @Requires(mode=http)' : 'MainWiring.inMemoryReferenceData() @Requires(mode=in-memory, defaultValue)', cfg.mode === 'http' ? 'new RemoteReferenceData(MicronautReferenceDataClient, new ProfileTranslator())' : 'new InMemoryReferenceData()', refOk],
        ['IntegrationEventSink', cfg.sink === 'kafka' ? 'KafkaEventSink @Requires(sink=kafka) – exercise, not in the lab' : 'LoggingEventSink @Requires(sink=log)', cfg.sink === 'kafka' ? 'only if you wrote it' : 'new LoggingEventSink()', cfg.sink === 'log'],
        ['OpenCase (input boundary)', 'MainWiring.openCase(…)', 'new OpenCaseInteractor(caseGateway, idempotency, outbox, transactions, clock)', !cfg.secondGateway],
        ['ScreenCase (input boundary)', 'MainWiring.screenCase(…)', 'new ScreenCaseInteractor(caseGateway, referenceData, outbox, transactions, policy, clock)', refOk && !cfg.secondGateway],
        ['CaseController', 'MainWiring.caseController(OpenCase, ScreenCase, …)', 'new CaseController(openCase, screenCase, resolveMatch, closeCase, viewCase)', refOk && !cfg.secondGateway],
      ];
      out.append(el('table', {}, el('tr', {}, el('th', {}, 'Bean type'), el('th', {}, 'Produced by'), el('th', {}, 'Concrete object'), el('th', {}, '')),
        beans.map(([t, by, obj, ok]) => el('tr', {}, el('td', {}, el('b', {}, t)), el('td', { style: 'font-family:monospace;font-size:12px' }, by), el('td', { style: 'font-family:monospace;font-size:12px' }, obj), el('td', {}, ok ? '✓' : '✗')))));
      if (!refOk) problems.push(['NoSuchBeanException: No bean of type [ReferenceDataGateway] exists.', 'Property value "inmemory" matches neither @Requires. A typo is a startup failure, not a silent fallback – and every interactor that needs the gateway fails with it.']);
      if (cfg.sink === 'kafka') problems.push(['NoSuchBeanException: No bean of type [IntegrationEventSink] exists.', 'The OutboxRelay needs a sink. Write KafkaEventSink in screening-app (ring 4) – the relay in ring 3 does not change.']);
      if (cfg.secondGateway) problems.push(['NonUniqueBeanException: Multiple possible bean candidates found: [SqlCaseGateway, CachingCaseGateway]', 'Decide in MainWiring: wrap explicitly (new CachingCaseGateway(new SqlCaseGateway(records))) and expose one bean. The Main component composes; the inner rings never choose.']);
      for (const [title, why] of problems) out.append(el('div', { class: 'verdict bad' }, title), el('p', { style: 'font-size:14px' }, why));
      if (cfg.singletonPresenter) out.append(presenterRace());
      if (!problems.length && !cfg.singletonPresenter) out.append(el('div', { class: 'verdict good' }, 'Context starts. Every injection point has exactly one candidate, and every interactor was built by hand in MainWiring with plain constructors.'));
    }
    function presenterRace() {
      const box = el('div', { class: 'panel' }, el('h5', {}, 'Two concurrent requests share one CasePresenter'));
      const sys = Clean.createSystem();
      const base = '/api/v1/client-groups/acme-bank/cases';
      const a = sys.http({ method: 'POST', path: base, body: VIKTOR_A }).body.caseId;
      const b = sys.http({ method: 'POST', path: '/api/v1/client-groups/globex-bank/cases', body: { name: 'Jane Whitfield', entityType: 'INDIVIDUAL' } }).body.caseId;
      const shared = new Clean.CasePresenter();
      const log = el('div', { class: 'log' });
      const steps = [
        [`thread-1 (acme-bank) GET case ${a.slice(0, 8)}… → ViewCaseInteractor → shared.presentCase(Viktor's case)`, () => sys.interactors.ViewCase({ clientGroupId: 'acme-bank', caseId: a }, shared)],
        [`thread-2 (globex-bank) GET case ${b.slice(0, 8)}… → ViewCaseInteractor → shared.presentCase(Jane's case)`, () => sys.interactors.ViewCase({ clientGroupId: 'globex-bank', caseId: b }, shared)],
        ['thread-1 reads shared.viewModel() and returns it', () => null],
      ];
      steps.forEach(([t, f]) => { f(); log.append(el('div', {}, t)); });
      const leaked = shared.result().body;
      box.append(log, el('div', { class: 'verdict bad' }, `thread-1 (acme-bank) receives party "${leaked.partyName}" of client group "${leaked.clientGroupId}"`),
        el('p', { style: 'font-size:14px' }, 'A presenter holds per-request state (the view model). As a singleton it leaks one tenant\'s case to another under load – a data breach no unit test catches. The lab creates a new CasePresenter inside each controller call; it is not a bean at all.'));
      return box;
    }
    const VIKTOR_A = { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' };
    render();
  });

  // ------------------------------------------------------------------ packaging explorer (m10)
  Course.sim('packaging-explorer', (node) => {
    header(node, 'Packaging explorer – who stops the bad import?',
      'Clean Architecture says nothing about folders; packaging decides whether the dependency rule is enforced by the compiler, by a test, or by good intentions. Pick a packaging style, then try the illegal import a tired developer writes on a Friday.');
    const STYLES = {
      layer: { name: 'Package by layer', tree: 'screening/\n  web/        CaseController, CaseJson\n  service/    CaseService (public)\n  repository/ CaseRepository, CaseRow\n  model/      ScreeningCase', guard: 'nothing', note: 'Everything is public so layers can talk; nothing stops the web package from using the repository directly. Horizontal layering hides the domain ("screaming" CRUD, not screening).' },
      feature: { name: 'Package by feature', tree: 'screening/\n  casework/   CaseController, CaseService, CaseRepository, ScreeningCase\n  workqueue/  WorkQueueController, WorkQueueService', guard: 'package-private visibility (partly)', note: 'Screams the domain and lets Java visibility hide internals, but web and persistence code still share a package with the rules.' },
      ports: { name: 'Ports & adapters (one module, packages)', tree: 'screening/\n  domain/\n  application/  (ports in, ports out)\n  adapter/in/rest/\n  adapter/out/persistence/\n  config/', guard: 'ArchUnit test', note: 'The plan/training hexagonal lab. Rules are enforced by a test that runs in CI; the compiler alone would accept the import.' },
      component: { name: 'Package by component', tree: 'screening/\n  web/          CaseController\n  casework/     CaseComponent (public interface) + package-private service, repository impl', guard: 'package-private visibility', note: 'Simon Brown\'s option: the component\'s inside is invisible from web/. Strong without extra modules, weaker against reflection-heavy frameworks.' },
      modules: { name: 'Module per ring (this lab)', tree: 'code-lab/\n  screening-entities/            (no dependencies)\n  screening-usecases/            → entities\n  screening-interface-adapters/  → usecases\n  screening-app/                 → all, + Micronaut', guard: 'the compiler (Maven classpath) + ArchUnit for intra-ring rules', note: 'An inner module cannot even see an outer one. ArchUnit covers what the compiler cannot: adapters.web must not touch entities, only app.config builds interactors.' },
    };
    const IMPORTS = [
      ['ScreeningCase imports io.micronaut.data.annotation.MappedEntity', { layer: 'compiles', feature: 'compiles', ports: 'ArchUnit fails the build', component: 'compiles', modules: 'does not compile – no Micronaut on screening-entities\' classpath' }],
      ['An interactor imports SqlCaseGateway', { layer: 'compiles', feature: 'compiles', ports: 'ArchUnit fails the build', component: 'does not compile – SqlCaseGateway is package-private', modules: 'does not compile – usecases cannot see interface-adapters' }],
      ['CaseController uses ScreeningCase directly', { layer: 'compiles', feature: 'compiles', ports: 'compiles (allowed in hexagonal: adapters may see the domain)', component: 'compiles if ScreeningCase is public', modules: 'compiles – then CleanArchitectureTest fails ("adapters.web never touches entities")' }],
      ['CaseEndpoint (Micronaut) calls an interactor, skipping the controller', { layer: 'compiles', feature: 'compiles', ports: 'compiles', component: 'compiles', modules: 'compiles – then CleanArchitectureTest fails ("app.web never touches use cases")' }],
    ];
    const isCaught = (r) => !r.startsWith('compiles') || r.includes('fails');
    let style = 'modules'; let imp = 0;
    const row = el('div', { class: 'sim-row' });
    const impSel = el('select', { onchange: (e) => { imp = +e.target.value; render(); } }, IMPORTS.map(([t], i) => el('option', { value: i }, t)));
    const tree = el('pre', {}, el('code', { class: 'lang-text' }));
    const right = el('div');
    node.append(row, el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'The Friday import', impSel)), el('div', { class: 'sim-grid cols-2' }, tree, right));
    function render() {
      row.innerHTML = '';
      for (const [k, s] of Object.entries(STYLES)) row.append(el('button', { class: `btn small ${k === style ? '' : 'secondary'}`, onclick: () => { style = k; render(); } }, s.name));
      const s = STYLES[style];
      tree.querySelector('code').textContent = s.tree;
      const result = IMPORTS[imp][1][style];
      const caught = isCaught(result);
      right.innerHTML = '';
      right.append(el('div', { class: `verdict ${caught ? 'good' : 'bad'}` }, `Result: ${result}`),
        el('p', { style: 'font-size:14px' }, el('b', {}, 'What enforces the rule: '), s.guard),
        el('p', { style: 'font-size:14px' }, s.note),
        el('table', {}, el('tr', {}, el('th', {}, 'Import'), el('th', {}, 'Caught?')),
          IMPORTS.map(([t, r]) => el('tr', {}, el('td', { style: 'font-size:12.5px' }, t), el('td', { style: 'font-size:12.5px' }, isCaught(r[style]) ? '✓ caught' : '✗ ships')))));
    }
    render();
  });

  // ------------------------------------------------------------------ saga / process manager (m14)
  Course.sim('saga', (node) => {
    header(node, 'Ongoing-monitoring process manager – step through it, inject failures',
      'A sanctions profile is updated. Ongoing Monitoring must rescreen every affected case in Screening and alert clients about new matches. No distributed transaction exists: the process is a chain of local transactions connected by events, with retries and de-duplication. In Clean terms the process manager is a use case of the Monitoring service; Screening is reached through a gateway.');
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
      s.push(['Screening', 'RescreenCase(A) → ScreenCaseInteractor in one local transaction → CaseScreened{newMatches: 1} in outbox', 'local']);
      if (fail === 'closed') {
        s.push(['Screening', 'RescreenCase(B) → presenter.presentRuleViolation(CASE_CLOSED) → 422', 'err']);
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
      down: 'Retries with exponential backoff and jitter are safe only because RescreenCase is idempotent: screening twice keeps one match per profile and preserves resolutions.',
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

  // ------------------------------------------------------------------ code review (m15)
  Course.sim('code-review', (node) => {
    header(node, 'Code review simulator – Clean Architecture edition', 'Pull requests against the code lab. Tick every genuine problem, leave the distractors unticked, then submit. Each finding comes with the review comment you would actually write.');
    const PRS = [
      { title: 'PR #512 – "Interactor returns the JSON directly, saves a mapping"', code: `package training.clean.screening.usecases.screencase;

public final class ScreenCaseInteractor {
    private final SqlCaseGateway cases;

    public HttpResponse<CaseJson> execute(String clientGroupId, String caseId) {
        ScreeningCase c = cases.findById(CaseId.of(caseId)).orElseThrow();
        c.screen(referenceData.candidatesFor(c.party()), policy, clock.instant());
        cases.save(c);
        return HttpResponse.ok(CaseJson.from(c));
    }
}`, issues: [
        ['Ring 2 depends on HttpResponse (a framework type)', true, 'Status codes are a presenter decision. The interactor calls presenter.presentCase(response) on its output boundary.'],
        ['Ring 2 depends on CaseJson and SqlCaseGateway from ring 3', true, 'Dependencies point outward – and Maven reports a cycle. Depend on CaseGateway (owned by ring 2) and return a CaseResponse via the presenter.'],
        ['The tenant check is gone', true, 'Use CaseLookup.load(cases, clientGroup, caseId) so another tenant\'s case is a 404.'],
        ['Reference data is fetched inside nothing at all – there is no transaction', true, 'Read and write go through TransactionRunner; candidates are fetched between them.'],
        ['The class is final', false, 'Fine – interactors are not designed for inheritance.'],
      ] },
      { title: 'PR #517 – "Controller handles errors itself"', code: `public ViewModel close(String clientGroupId, String caseId, CloseCaseForm form) {
    try {
        CaseResponse r = closeCase.execute(new CloseCaseRequest(clientGroupId, caseId, form.analystId()));
        return ViewModel.ok(CasePresenter.toJson(r));
    } catch (DomainException e) {
        return ViewModel.problem(ProblemJson.of(e.rule().equals("INVALID_VALUE") ? 400 : 422, "Error", e.getMessage(), e.rule()));
    } catch (CaseNotFoundException e) {
        return ViewModel.problem(ProblemJson.of(404, "Case not found", e.getMessage(), null));
    }
}`, issues: [
        ['Ring 3 handles a ring-1 exception type (DomainException)', true, 'ArchUnit rule: adapters.web never touches entities. Outcomes.presentingFailures converts it inside ring 2.'],
        ['Status-code decisions now live in two places (controller and presenter)', true, 'The presenter is the single place that knows HTTP; each controller repeating it drifts.'],
        ['ConcurrentCaseUpdateException is not handled → 500', true, 'Exactly the drift the output boundary prevents: presentConflict() exists for it.'],
        ['The controller builds a request model of plain strings', false, 'Correct – that is its job.'],
      ] },
      { title: 'PR #523 – "Annotate entities for Serde, no more SerdeImports"', code: `package training.clean.screening.entities.model;

import io.micronaut.serde.annotation.Serdeable;

@Serdeable
public final class ScreeningCase { … }

@Serdeable
public record PartyName(String value) { … }`, issues: [
        ['Framework annotation in ring 1', true, 'screening-entities has no Micronaut dependency; adding one makes every enterprise rule depend on a web framework\'s release cycle.'],
        ['Serialising the aggregate exposes internal state as the public API', true, 'The published language is CaseJson / EventJson in ring 3. Entities change for business reasons; the API changes for client reasons.'],
        ['SerdeImports in ring 4 already registers ring-3 records', false, 'That is the lab\'s design: ring 3 stays plain Java, ring 4 tells Serde about it.'],
      ] },
      { title: 'PR #530 – "Shared presenter bean, cache the gateway in the interactor"', code: `@Factory
public class MainWiring {
    @Singleton CasePresenter casePresenter() { return new CasePresenter(); }

    @Singleton CaseController caseController(OpenCase open, ..., CasePresenter presenter) {
        return new CaseController(open, ..., presenter);
    }
}

public final class ViewCaseInteractor implements ViewCase {
    private static final Map<String, CaseResponse> CACHE = new ConcurrentHashMap<>();
    …
}`, issues: [
        ['A singleton presenter shares per-request state between threads', true, 'One tenant can receive another tenant\'s view model under load (see the wiring explorer).'],
        ['A static cache in an interactor ignores tenants and staleness', true, 'Caching is a gateway decorator decision, wired in Main – and the key must include the client group and version.'],
        ['MainWiring is a @Factory in screening-app', false, 'Correct: Main is the dirtiest component and lives in the outermost ring.'],
      ] },
      { title: 'PR #536 – "Move CaseGateway next to its implementation"', code: `package training.clean.screening.adapters.persistence;

public interface CaseGateway {
    Optional<CaseRecord> findById(UUID id);
    void save(CaseRecord record);
}`, issues: [
        ['The interface moved out of the ring that uses it', true, 'Interfaces belong to their clients (DIP). If ring 2 must import ring 3 to see CaseGateway, the dependency points outward again.'],
        ['The gateway now speaks in records, not aggregates', true, 'Interactors would map rows themselves – persistence knowledge leaks into application rules.'],
        ['Using UUID for ids', true, 'Ring 2 speaks CaseId (a value object); raw UUIDs are a ring-3/4 representation.'],
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

  // ------------------------------------------------------------------ maturity self-assessment (m16)
  Course.sim('maturity', (node) => {
    header(node, 'Team maturity self-assessment', 'Score your team honestly, 1-5, on each dimension. The radar shows the shape; the plan lists the three weakest areas with the first concrete action for each. Re-run it every quarter and keep the screenshots in your ADR repo.');
    const DIMS = [
      ['Ubiquitous language', ['Tech terms everywhere', 'Glossary exists', 'Code uses business terms', 'Language reviewed with domain experts', 'Language drives design and APIs'], 'Run a 60-minute glossary session with two analysts; rename the three worst classes this sprint.'],
      ['Bounded contexts', ['One big model', 'Modules by technical layer', 'Contexts named', 'Context map with patterns', 'Contexts own data + contracts'], 'Draw the context map (module 4) for your area and review it with neighbouring teams.'],
      ['Enterprise rules', ['Anemic entities + services', 'Some behaviour on entities', 'Invariants listed per aggregate', 'Entities framework-free, ids between aggregates', 'Invariants tested, aggregates reshaped by evidence'], 'Pick one aggregate, write its invariants as a numbered Javadoc list, add one test per invariant.'],
      ['Use cases', ['Logic in controllers', 'Fat services', 'One class per use case', 'Request/response models, owned gateways', 'Output boundaries, every outcome presented'], 'Extract one use case from a fat service into an interactor with its own request model (module 6).'],
      ['Dependency rule', ['Framework everywhere', 'Packages by layer', 'Rings named in packages', 'ArchUnit enforced in CI', 'Module per ring, compiler-enforced'], 'Add CleanArchitectureTest (module 10) to the build, freezing existing violations.'],
      ['Testing strategy', ['Manual / end-to-end only', 'Slow integration tests', 'Entity unit tests exist', 'Test per ring: entity > interactor > adapter > API', 'Fast feedback < 2 min, contract tests'], 'Measure test runtime; move one rule test from @MicronautTest down to an entity test.'],
      ['Event integration', ['Synchronous calls only', 'Events published after commit', 'Outbox in place', 'Versioned schemas, idempotent consumers', 'Event catalogue, replay, DLQ runbooks'], 'Find one dual write; replace it with the outbox pattern from module 14.'],
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
      s += `<polygon points="${scores.map((v, i) => pt(i, (R * v) / 5).join(',')).join(' ')}" fill="rgba(224,122,95,.35)" stroke="#E07A5F" stroke-width="2.5"/>`;
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
