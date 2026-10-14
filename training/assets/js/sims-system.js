/* System simulators: they drive the JavaScript port of the code lab (domain.js) through a live hexagon. */
(function () {
  const { el } = Course;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const short = (id) => (id ? String(id).slice(0, 8) : '');
  const json = (o) => JSON.stringify(o, null, 2);

  function header(node, title, intro) {
    node.append(el('div', { class: 'sim-title' }, title));
    if (intro) node.append(el('p', { class: 'sim-intro', html: intro }));
  }
  Course.simHeader = header;

  // ------------------------------------------------------------------ live hexagon
  const RING_STYLE = {
    external: ['#FFFFFF', '#5B6B7F', '#1D2733'],
    adapter: ['#FDF1DC', '#E9A23B', '#1D2733'],
    port: ['#FFFFFF', '#2A9D8F', '#1B6A60'],
    application: ['#E3F4F1', '#2A9D8F', '#1D2733'],
    domain: ['#1F3A5F', '#152B47', '#FFFFFF'],
  };
  const NODES = {
    client: [10, 275, 115, 50, 'external', ['Analyst UI', 'curl / browser']],
    rest: [150, 175, 135, 50, 'adapter', ['CaseController', 'REST adapter']],
    test: [150, 275, 135, 50, 'adapter', ['JUnit test', 'driving adapter']],
    sched: [150, 375, 135, 50, 'adapter', ['RescreenJob', '@Scheduled']],
    portin: [300, 275, 120, 50, 'port', ['«port.in»', 'use-case interfaces']],
    app: [510, 125, 180, 50, 'application', ['CaseApplicationService', 'orchestrates one use case']],
    'port-ref': [712, 140, 116, 42, 'port', ['«port.out»', 'ReferenceDataSource']],
    'port-repo': [712, 214, 116, 42, 'port', ['«port.out»', 'CaseRepository']],
    'port-outbox': [712, 288, 116, 42, 'port', ['«port.out»', 'DomainEventOutbox']],
    'port-uow': [712, 362, 116, 42, 'port', ['«port.out»', 'UnitOfWork']],
    ref: [880, 136, 150, 50, 'adapter', ['InMemoryReference…', 'DataSource']],
    jdbc: [880, 210, 150, 50, 'adapter', ['JdbcCaseRepository', 'Micronaut Data JDBC']],
    outbox: [880, 284, 150, 50, 'adapter', ['OutboxEventAppender', 'row per event']],
    uow: [880, 358, 150, 50, 'adapter', ['JdbcUnitOfWork', 'TransactionOperations']],
    refsys: [1060, 136, 130, 50, 'external', ['Reference data', 'seed profiles']],
    db: [1060, 210, 130, 198, 'external', ['Database', 'H2 (in-memory)']],
    relay: [880, 470, 150, 50, 'adapter', ['OutboxRelay', '@Scheduled 2s']],
    sink: [1060, 470, 130, 50, 'external', ['LoggingEventSink', 'log / broker']],
  };
  const EDGES = [
    ['client', 'rest'], ['rest', 'portin'], ['test', 'portin'], ['sched', 'portin'], ['portin', 'app'], ['app', 'domain'],
    ['app', 'port-ref'], ['app', 'port-repo'], ['app', 'port-outbox'], ['app', 'port-uow'],
    ['port-ref', 'ref'], ['port-repo', 'jdbc'], ['port-outbox', 'outbox'], ['port-uow', 'uow'],
    ['ref', 'refsys'], ['jdbc', 'db'], ['outbox', 'db'], ['uow', 'db'], ['db', 'relay'], ['relay', 'sink'],
  ];
  const center = (id) => {
    if (id === 'domain') return [600, 330];
    const [x, y, w, h] = NODES[id];
    return [x + w / 2, y + h / 2];
  };
  const hexPoints = (cx, cy, r) => [0, 60, 120, 180, 240, 300].map((a) => {
    const rad = (Math.PI / 180) * a;
    return `${(cx + r * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`;
  }).join(' ');

  Course.hexDiagram = function (container, { drivers = ['rest', 'test', 'sched'] } = {}) {
    const wrap = el('div', { class: 'hexlive' });
    let s = '<svg viewBox="0 0 1200 545" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, Arial, sans-serif">';
    s += `<polygon points="${hexPoints(600, 300, 250)}" fill="#F3FAF8" stroke="#2A9D8F" stroke-width="2.5"/>`;
    s += '<text x="600" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#1B6A60">APPLICATION · ports + use cases (plain Java)</text>';
    s += '<text x="215" y="150" text-anchor="middle" font-size="12" font-weight="700" fill="#9A6512">DRIVING ADAPTERS</text>';
    s += '<text x="955" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="#9A6512">DRIVEN ADAPTERS</text>';
    for (const [a, b] of EDGES) {
      if ([a, b].some((n) => ['rest', 'test', 'sched'].includes(n) && !drivers.includes(n))) continue;
      const [x1, y1] = center(a); const [x2, y2] = center(b);
      s += `<line class="edge" data-edge="${a}|${b}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
    s += `<g class="node" data-id="domain"><polygon points="${hexPoints(600, 330, 105)}" fill="#1F3A5F" stroke="#152B47" stroke-width="2"/>`
      + '<text x="600" y="312" text-anchor="middle" font-size="12" font-weight="700" fill="#E9A23B">DOMAIN</text>'
      + '<text class="l1" x="600" y="333" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">ScreeningCase</text>'
      + '<text class="l2" x="600" y="352" text-anchor="middle" font-size="11.5" fill="#DCE6F2">NameMatchingPolicy</text></g>';
    for (const [id, [x, y, w, h, ring, [l1, l2]]] of Object.entries(NODES)) {
      if (['rest', 'test', 'sched'].includes(id) && !drivers.includes(id)) continue;
      const [fill, stroke, ink] = RING_STYLE[ring];
      const dash = ring === 'port' ? ' stroke-dasharray="5 3"' : '';
      const cy = y + h / 2;
      s += `<g class="node" data-id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash}/>`
        + `<text class="l1" x="${x + w / 2}" y="${cy - 3}" text-anchor="middle" font-size="12" font-weight="700" fill="${ink}">${Course.escape(l1)}</text>`
        + `<text class="l2" x="${x + w / 2}" y="${cy + 12}" text-anchor="middle" font-size="10.5" fill="${ink}" opacity=".8">${Course.escape(l2)}</text></g>`;
    }
    s += '</svg>';
    wrap.innerHTML = s;
    container.append(wrap);
    const svg = wrap.querySelector('svg');
    return {
      clear() { svg.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot')); },
      light(path) {
        this.clear();
        path.forEach((id, i) => {
          svg.querySelector(`.node[data-id="${id}"]`)?.classList.add('hot');
          if (i > 0) {
            const a = path[i - 1];
            (svg.querySelector(`[data-edge="${a}|${id}"]`) || svg.querySelector(`[data-edge="${id}|${a}"]`))?.classList.add('hot');
          }
        });
      },
      label(id, l1, l2) {
        const g = svg.querySelector(`.node[data-id="${id}"]`);
        if (!g) return;
        g.querySelector('.l1').textContent = l1;
        if (l2 != null) g.querySelector('.l2').textContent = l2;
      },
    };
  };

  const pathFor = (node, driver) => ({
    client: ['client'],
    rest: ['client', 'rest'],
    test: ['test'],
    sched: ['sched'],
    portin: [driver, 'portin'],
    app: ['portin', 'app'],
    domain: ['app', 'domain'],
    ref: ['app', 'port-ref', 'ref', 'refsys'],
    jdbc: ['app', 'port-repo', 'jdbc', 'db'],
    outbox: ['app', 'port-outbox', 'outbox', 'db'],
    uow: ['app', 'port-uow', 'uow', 'db'],
    relay: ['db', 'relay'],
    sink: ['relay', 'sink'],
  }[node] || [node]);

  const RING_OF = { client: 'adapter', rest: 'adapter', test: 'adapter', sched: 'adapter', portin: 'application', app: 'application', domain: 'domain', ref: 'adapter', jdbc: 'adapter', outbox: 'adapter', uow: 'adapter', relay: 'adapter', sink: 'adapter' };
  const RING_LABEL = { adapter: 'ADAPTER', application: 'APPLICATION', domain: 'DOMAIN', config: 'CONFIG' };

  function logLine(log, e) {
    const ring = e.ring || RING_OF[e.node] || 'adapter';
    const cls = e.error ? 'err' : e.ok ? 'ok' : e.event ? 'evt' : '';
    log.append(el('div', { class: cls }, el('span', { class: `ring-tag ring-${ring}` }, RING_LABEL[ring]), ' ', e.text));
    log.scrollTop = log.scrollHeight;
  }

  // ------------------------------------------------------------------ HTTP mapping (mirrors ProblemHandlers)
  const problem = (status, title, detail, rule) => ({ status, contentType: 'application/problem+json', body: { type: 'about:blank', title, status, detail, rule } });
  function toHttpError(e) {
    if (e instanceof WC.DomainException) {
      return e.rule === 'INVALID_VALUE' ? problem(400, 'Invalid value', e.message, e.rule) : problem(422, 'Business rule violated', e.message, e.rule);
    }
    if (e instanceof WC.CaseNotFound) return problem(404, 'Case not found', e.message, null);
    if (e instanceof WC.ConcurrentUpdate) return problem(409, 'Concurrent update', e.message, 'CONCURRENT_UPDATE');
    return problem(500, 'Internal Server Error', e.message, null);
  }
  const caseResponse = (s) => ({
    caseId: s.id, clientGroupId: s.clientGroup, partyName: s.party.name, entityType: s.party.type,
    dateOfBirth: s.party.dateOfBirth, country: s.party.country, status: s.status, outcome: s.outcome,
    screeningCount: s.screeningCount, openedAt: s.openedAt, lastScreenedAt: s.lastScreenedAt, closedAt: s.closedAt, closedBy: s.closedBy,
    matches: s.matches.map((m) => ({ matchId: m.id, profileId: m.profileId, category: m.category, matchedName: m.matchedName, score: m.score, resolution: m.resolution, rationale: m.rationale, resolvedBy: m.resolvedBy, resolvedAt: m.resolvedAt })),
  });
  const beanValidation = (path, errors) => ({
    status: 400, contentType: 'application/json',
    body: { message: 'Bad Request', _embedded: { errors: errors.map((m) => ({ message: m })) }, _links: { self: { href: path, templated: false } } },
  });
  Course.http = { toHttpError, caseResponse };

  // ------------------------------------------------------------------ hex-flow: follow one use case through the hexagon
  const FILE_OF = {
    client: 'outside the service (Analyst UI, curl, another system)',
    rest: 'adapter/in/rest/CaseController.java',
    test: 'src/test/…/application/CaseApplicationServiceTest.java',
    sched: 'adapter/in/scheduling/RescreenJob.java (code-lab exercise)',
    portin: 'application/port/in/*UseCase.java',
    app: 'application/CaseApplicationService.java',
    domain: 'domain/model/ScreeningCase.java + domain/service/NameMatchingPolicy.java',
    ref: 'adapter/out/reference/*ReferenceDataSource.java',
    jdbc: 'adapter/out/persistence/JdbcCaseRepository.java',
    outbox: 'adapter/out/events/OutboxEventAppender.java',
    uow: 'adapter/out/persistence/JdbcUnitOfWork.java',
    relay: 'adapter/out/events/OutboxRelay.java',
    sink: 'adapter/out/events/LoggingEventSink.java',
  };

  Course.sim('hex-flow', (node) => {
    header(node, 'Hexagon flow animator – swap adapters, watch the core stay still',
      'Pick who drives the application and which adapters are plugged in, then run a use case. Step through the trace: every step names the ring and the real file in the code lab. Notice that <b>no swap ever changes a file in the domain or application rings</b>.');
    const cfg = { driver: 'rest', ref: 'in-memory', sink: 'log', db: 'h2' };
    const sel = (key, label, options) => el('label', { class: 'field' }, label,
      el('select', { onchange: (e) => { cfg[key] = e.target.value; reconfigure(); } }, options.map(([v, t]) => el('option', { value: v }, t))));
    node.append(el('div', { class: 'sim-row' },
      sel('driver', 'Driving adapter', [['rest', 'REST controller (HTTP)'], ['test', 'JUnit test with fakes'], ['sched', 'Scheduler (RescreenJob)']]),
      sel('ref', 'screening.reference-data.mode', [['in-memory', 'in-memory'], ['http', 'http (@Client + ACL)']]),
      sel('sink', 'screening.events.sink', [['log', 'log'], ['kafka', 'kafka (exercise)']]),
      sel('db', 'datasources.default', [['h2', 'H2 in-memory'], ['pg', 'PostgreSQL']])));
    const hex = Course.hexDiagram(node);
    const yaml = el('pre', {}, el('code', { class: 'lang-yaml' }));
    const changes = el('div');
    const actions = el('div', { class: 'sim-row' });
    const stepBox = el('div', { class: 'verdict info' }, 'Run a use case to see its trace.');
    const steps = el('ol', { class: 'step-list' });
    const nav = el('div', { class: 'sim-row' });
    node.append(actions, el('div', { class: 'sim-grid cols-2' },
      el('div', { class: 'panel' }, el('h5', {}, 'Trace (click a step)'), steps, nav),
      el('div', {}, stepBox, el('div', { class: 'panel' }, el('h5', {}, 'Configuration that selects these adapters'), yaml), changes)));

    let sys; let caseId; let trace = []; let pos = -1; let timer = null;
    function reconfigure() {
      sys = WC.createSystem(); caseId = null; trace = []; pos = -1; renderSteps();
      if (cfg.driver === 'sched') {
        caseId = sys.app.open({ clientGroup: 'acme-bank', party: WC.makeParty({ name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' }) }).id;
      }
      const testing = cfg.driver === 'test';
      hex.label('ref', testing ? 'StubReferenceData' : cfg.ref === 'http' ? 'HttpReference…' : 'InMemoryReference…', testing ? 'test fake' : cfg.ref === 'http' ? 'DataSource (ACL)' : 'DataSource');
      hex.label('refsys', cfg.ref === 'http' && !testing ? 'reference-data' : testing ? 'fixed list' : 'Reference data', cfg.ref === 'http' && !testing ? 'service :9090' : testing ? 'in test code' : 'seed profiles');
      hex.label('jdbc', testing ? 'FakeCaseRepository' : 'JdbcCaseRepository', testing ? 'HashMap of snapshots' : 'Micronaut Data JDBC');
      hex.label('outbox', testing ? 'RecordingOutbox' : 'OutboxEventAppender', testing ? 'list of events' : 'row per event');
      hex.label('uow', testing ? 'TrackingUnitOfWork' : 'JdbcUnitOfWork', testing ? 'counts + rollback' : 'TransactionOperations');
      hex.label('db', testing ? 'No database' : 'Database', testing ? 'pure JVM memory' : cfg.db === 'pg' ? 'PostgreSQL' : 'H2 (in-memory)');
      hex.label('sink', cfg.sink === 'kafka' ? 'KafkaEventSink' : 'LoggingEventSink', cfg.sink === 'kafka' ? 'topic screening.case' : 'log / broker');
      yaml.querySelector('code').textContent = testing
        ? '// No YAML: the test builds the service by hand\nvar service = new CaseApplicationService(\n    new FakeCaseRepository(), new FakeIdempotencyStore(),\n    new StubReferenceData(profiles), new RecordingOutbox(),\n    new TrackingUnitOfWork(), new NameMatchingPolicy(80), clock);'
        : `screening:\n  reference-data:\n    mode: ${cfg.ref}\n  events:\n    sink: ${cfg.sink}\n${cfg.ref === 'http' ? 'micronaut:\n  http:\n    services:\n      reference-data:\n        url: http://localhost:9090\n' : ''}datasources:\n  default:\n    url: ${cfg.db === 'pg' ? 'jdbc:postgresql://db:5432/screening' : 'jdbc:h2:mem:screening'}\n    dialect: ${cfg.db === 'pg' ? 'POSTGRES' : 'H2'}`;
      const touched = [];
      if (cfg.ref === 'http') touched.push('HttpReferenceDataSource + ReferenceDataClient + ProfileDto (already written)');
      if (cfg.sink === 'kafka') touched.push('new KafkaEventSink implements IntegrationEventSink, @Requires(property="screening.events.sink", value="kafka")');
      if (cfg.db === 'pg') touched.push('JDBC driver dependency, dialect on @JdbcRepository, Flyway script check');
      if (testing) touched.push('test fakes only – production code untouched');
      changes.innerHTML = '';
      changes.append(el('table', {}, el('tr', {}, el('th', {}, 'Ring'), el('th', {}, 'Files changed by this configuration')),
        el('tr', {}, el('td', {}, el('span', { class: 'ring-tag ring-domain' }, 'DOMAIN')), el('td', {}, '0')),
        el('tr', {}, el('td', {}, el('span', { class: 'ring-tag ring-application' }, 'APPLICATION')), el('td', {}, '0')),
        el('tr', {}, el('td', {}, el('span', { class: 'ring-tag ring-adapter' }, 'ADAPTERS')), el('td', {}, touched.length ? touched.join('; ') : 'none – defaults')),
        el('tr', {}, el('td', {}, el('span', { class: 'ring-tag ring-config' }, 'CONFIG')), el('td', {}, testing ? 'none' : 'application.yml only'))));
      hex.clear();
      stepBox.textContent = 'Run a use case to see its trace.';
      renderActions();
    }

    function run(label, fn) {
      clearInterval(timer);
      trace = [];
      sys.onTrace((e) => trace.push(e));
      const driver = cfg.driver;
      if (driver === 'rest') { trace.push({ node: 'client', text: `HTTP ${label.http}` }); trace.push({ node: 'rest', text: 'bind JSON → @Valid request record → build value objects → command' }); }
      if (driver === 'test') trace.push({ node: 'test', text: `test method calls service.${label.method}(command) directly – no HTTP, no DB` });
      if (driver === 'sched') trace.push({ node: 'sched', text: `@Scheduled tick → for each case due for rescreen → ${label.method}(command)` });
      try {
        const view = fn();
        if (driver === 'rest') trace.push({ node: 'rest', text: `${label.ok} ← CaseResponse.of(view) serialised by Micronaut Serde`, ok: true });
        else trace.push({ node: driver, text: `received CaseView (status ${view.status})`, ok: true });
        if (view && view.id) caseId = view.id;
      } catch (e) {
        const http = toHttpError(e);
        trace.push({ node: driver, text: driver === 'rest' ? `${http.status} ${http.body.title} (rule ${http.body.rule}) via ProblemHandlers` : `exception ${e.rule || e.constructor.name}: ${e.message}`, error: true });
      }
      if (label.relay) { sys.relay(); }
      pos = -1; renderSteps(); autoplay();
      renderActions();
    }

    function renderActions() {
      actions.innerHTML = '';
      const group = 'acme-bank';
      const party = WC.makeParty({ name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' });
      const c = caseId && sys.repository.findById(caseId);
      const btn = (text, enabled, fn) => el('button', { class: 'btn small', disabled: !enabled, onclick: fn }, text);
      actions.append(
        btn('1 · Open case', cfg.driver !== 'sched', () => run({ http: 'POST /cases', method: 'open', ok: '201 Created' }, () => sys.app.open({ clientGroup: group, party }))),
        btn('2 · Screen', !!c, () => run({ http: 'POST /cases/{id}/screenings', method: 'screen', ok: '200 OK' }, () => sys.app.screen({ clientGroup: group, caseId }))),
        btn('3 · Try to close (rule violation)', !!c, () => run({ http: 'POST /cases/{id}/closure', method: 'close', ok: '200 OK' }, () => sys.app.close({ clientGroup: group, caseId, analyst: 'analyst-anna' }))),
        btn('4 · Resolve match POSITIVE', !!c && c.matches.length > 0, () => run({ http: 'PUT /matches/{id}/resolution', method: 'resolve', ok: '200 OK' }, () => sys.app.resolve({ clientGroup: group, caseId, matchId: c.matches[0].id, resolution: 'POSITIVE', rationale: 'DOB and country match the sanctions entry', analyst: 'analyst-anna' }))),
        btn('5 · Close + relay events', !!c, () => run({ http: 'POST /cases/{id}/closure', method: 'close', ok: '200 OK', relay: true }, () => sys.app.close({ clientGroup: group, caseId, analyst: 'analyst-anna' }))),
        el('button', { class: 'btn small secondary', onclick: reconfigure }, 'Reset'));
      if (cfg.driver === 'sched') actions.append(el('span', { style: 'font-size:13px;color:var(--slate)' }, 'A scheduler never opens cases, it rescreens existing ones, so one case was opened for you. Same ports, different driver.'));
    }

    function renderSteps() {
      steps.innerHTML = '';
      trace.forEach((e, i) => steps.append(el('li', { class: i === pos ? 'current' : i < pos ? 'past' : '', onclick: () => { clearInterval(timer); go(i); } },
        el('span', { class: `ring-tag ring-${e.ring || RING_OF[e.node] || 'adapter'}` }, RING_LABEL[e.ring || RING_OF[e.node] || 'adapter']), ' ', e.text)));
      nav.innerHTML = '';
      if (trace.length) {
        nav.append(
          el('button', { class: 'btn small secondary', onclick: () => { clearInterval(timer); go(Math.max(0, pos - 1)); } }, '◀ Prev'),
          el('button', { class: 'btn small secondary', onclick: () => { clearInterval(timer); go(Math.min(trace.length - 1, pos + 1)); } }, 'Next ▶'),
          el('button', { class: 'btn small amber', onclick: autoplay }, '▶ Auto-play'));
      }
    }
    function go(i) {
      pos = i;
      const e = trace[i];
      hex.light(pathFor(e.node, cfg.driver));
      stepBox.className = `verdict ${e.error ? 'bad' : e.ok ? 'good' : 'info'}`;
      stepBox.innerHTML = `<div>Step ${i + 1}/${trace.length}: ${Course.escape(e.text)}</div><div style="font-weight:400;font-size:13px;margin-top:4px">File: <code>${Course.escape(FILE_OF[e.node] || '')}</code></div>`;
      renderSteps();
    }
    function autoplay() {
      clearInterval(timer);
      let i = 0;
      go(0);
      timer = setInterval(() => { i++; if (i >= trace.length) { clearInterval(timer); return; } go(i); }, 1100);
    }
    reconfigure();
  });

  // ------------------------------------------------------------------ Mission Control: the whole system
  const PRESETS = [
    ['Viktor Albescu · 1961-03-14 · RO (sanctions hit)', { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' }],
    ['Viktor Albescu · 1988-07-01 · MD (adverse-media namesake)', { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1988-07-01', country: 'MD' }],
    ['Viktor Albescu · no DOB/country (both profiles match)', { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '', country: '' }],
    ['Dimitri Walenko · 1958-11-30 · CY (alias spelling)', { name: 'Dimitri Walenko', entityType: 'INDIVIDUAL', dateOfBirth: '1958-11-30', country: 'CY' }],
    ['Reyes Quintanar Marisol (word order)', { name: 'Reyes Quintanar Marisol', entityType: 'INDIVIDUAL', dateOfBirth: '', country: 'MX' }],
    ['Orion Shipping Holdings Limited · PA (organisation)', { name: 'Orion Shipping Holdings Limited', entityType: 'ORGANISATION', dateOfBirth: '', country: 'PA' }],
    ['Henrik Faldstrom (accents)', { name: 'Henrik Faldstrom', entityType: 'INDIVIDUAL', dateOfBirth: '1969-01-08', country: 'SE' }],
    ['Jane Whitfield · GB (clean)', { name: 'Jane Whitfield', entityType: 'INDIVIDUAL', dateOfBirth: '1980-05-05', country: 'GB' }],
    ['Invalid: "1234" (no letters → 400)', { name: '1234', entityType: 'INDIVIDUAL', dateOfBirth: '', country: '' }],
    ['Invalid: organisation with DOB (→ 400)', { name: 'Golden Crescent Trading', entityType: 'ORGANISATION', dateOfBirth: '2001-01-01', country: 'AE' }],
  ];

  Course.sim('mission-control', (node) => {
    header(node, 'Mission Control – the complete screening service running in your browser',
      'This is the code lab service, ported rule-for-rule to JavaScript. Every button sends the same HTTP request the real API accepts; the request travels through the hexagon (watch it light up), the aggregate enforces its invariants, the unit of work commits or rolls back, the outbox fills, and the relay publishes. Try to break it: close too early, downgrade your own POSITIVE, switch tenant, replay an Idempotency-Key, drop the threshold.');
    const sys = WC.createSystem();
    const ui = { group: 'acme-bank', analyst: 'analyst-anna', speed: 380 };
    let currentCase = null;
    let busy = false;

    const select = (opts, onchange, value) => {
      const s = el('select', { onchange: (e) => onchange(e.target.value) }, opts.map(([v, t]) => el('option', { value: v }, t)));
      if (value != null) s.value = value;
      return s;
    };
    const thresholdLabel = el('b', {}, '80');
    node.append(el('div', { class: 'sim-row' },
      el('label', { class: 'field' }, 'Client group (tenant, from the URL)', select([['acme-bank', 'acme-bank'], ['globex-bank', 'globex-bank']], (v) => { ui.group = v; renderAll(); })),
      el('label', { class: 'field' }, 'Analyst (request body)', select([['analyst-anna', 'analyst-anna'], ['analyst-ben', 'analyst-ben']], (v) => { ui.analyst = v; })),
      el('label', { class: 'field' }, el('span', {}, 'screening.matching.threshold = ', thresholdLabel),
        el('input', { type: 'range', min: 50, max: 100, value: 80, oninput: (e) => { sys.threshold = +e.target.value; thresholdLabel.textContent = e.target.value; } })),
      el('label', { class: 'field' }, 'Animation', select([['700', 'slow'], ['380', 'normal'], ['0', 'instant']], (v) => { ui.speed = +v; }, '380'))));

    // left column: form + case
    const f = {
      preset: select(PRESETS.map(([t], i) => [String(i), t]), (i) => fill(PRESETS[+i][1])),
      name: el('input', { type: 'text' }),
      type: select([['INDIVIDUAL', 'INDIVIDUAL'], ['ORGANISATION', 'ORGANISATION']], () => {}),
      dob: el('input', { type: 'date' }),
      country: el('input', { type: 'text', maxlength: 3, style: 'width:70px' }),
      key: el('input', { type: 'text', placeholder: 'optional, e.g. onboarding-42' }),
    };
    function fill(p) { f.name.value = p.name; f.type.value = p.entityType; f.dob.value = p.dateOfBirth; f.country.value = p.country; }
    fill(PRESETS[0][1]);
    const caseBox = el('div');
    const left = el('div', {},
      el('div', { class: 'panel' }, el('h5', {}, '① Open a case – POST /cases'),
        el('label', { class: 'field' }, 'Scenario preset', f.preset),
        el('div', { class: 'sim-row' }, el('label', { class: 'field', style: 'flex:1' }, 'name', f.name), el('label', { class: 'field' }, 'entityType', f.type)),
        el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'dateOfBirth', f.dob), el('label', { class: 'field' }, 'country', f.country)),
        el('label', { class: 'field' }, 'Idempotency-Key header', f.key),
        el('div', { class: 'sim-row' }, el('button', { class: 'btn teal', onclick: () => act('open') }, 'POST open case'))),
      el('div', { class: 'panel', style: 'margin-top:12px' }, el('h5', {}, '② Work the case'), caseBox));

    const hexHolder = el('div');
    const hex = Course.hexDiagram(hexHolder, { drivers: ['rest'] });
    const reqPre = el('pre', { style: 'max-height:200px;margin:0 0 8px' }, el('code', { class: 'lang-text' }, '…'));
    const resPre = el('pre', { style: 'max-height:260px;margin:0' }, el('code', { class: 'lang-text' }, '…'));
    const log = el('div', { class: 'log', style: 'max-height:470px' });
    const right = el('div', {},
      el('div', { class: 'panel dark' }, el('h5', {}, 'HTTP exchange'), reqPre, resPre),
      el('div', { class: 'panel dark', style: 'margin-top:12px' }, el('h5', {}, 'Trace through the rings'), log));
    node.append(hexHolder, el('div', { class: 'sim-grid mc-grid', style: 'margin-top:12px' }, left, right));

    // bottom: database + events
    const tabs = el('div', { class: 'sim-row' });
    const tableBox = el('div', { class: 'scroll-x' });
    let tab = 'screening_case';
    node.append(el('div', { class: 'panel', style: 'margin-top:14px' },
      el('h5', {}, '③ What is actually stored – database tables and published events'), tabs, tableBox));

    function cell(v) { return el('td', {}, v == null ? '∅' : String(v)); }
    function renderTables() {
      tabs.innerHTML = '';
      const pending = sys.db.outbox_event.filter((r) => !r.published_at).length;
      for (const [id, label] of [['screening_case', 'screening_case'], ['case_match', 'case_match'], ['outbox_event', `outbox_event (${pending} pending)`], ['idempotency_key', 'idempotency_key'], ['published', `published events (${sys.published.length})`]]) {
        tabs.append(el('button', { class: `btn small ${tab === id ? '' : 'secondary'}`, onclick: () => { tab = id; renderTables(); } }, label));
      }
      tabs.append(el('button', { class: 'btn small amber', onclick: () => act('relay') }, '▶ Run OutboxRelay now'));
      let head = []; let rows = [];
      if (tab === 'screening_case') {
        head = ['id', 'client_group', 'party_name', 'status', 'outcome', 'screening_count', 'version'];
        rows = [...sys.db.screening_case.entries()].map(([id, r]) => [short(id), r.snapshot.clientGroup, r.snapshot.party.name, r.snapshot.status, r.snapshot.outcome, r.snapshot.screeningCount, r.version]);
      } else if (tab === 'case_match') {
        head = ['id', 'case_id', 'profile_id', 'category', 'score', 'resolution', 'resolved_by'];
        rows = [...sys.db.case_match.entries()].map(([id, r]) => [short(id), short(r.case_id), r.snapshot.profileId, r.snapshot.category, r.snapshot.score, r.snapshot.resolution, r.snapshot.resolvedBy]);
      } else if (tab === 'outbox_event') {
        head = ['id', 'event_type', 'aggregate_id', 'published_at'];
        rows = sys.db.outbox_event.map((r) => [short(r.id), r.type, short(r.aggregate_id), r.published_at ? r.published_at.slice(11, 19) : null]);
      } else if (tab === 'idempotency_key') {
        head = ['id (group:key)', 'case_id'];
        rows = [...sys.db.idempotency_key.entries()].map(([k, v]) => [k, short(v)]);
      } else {
        head = ['eventId', 'type', 'caseId', 'payload'];
        rows = sys.published.map((e) => [short(e.eventId), e.type, short(e.caseId), JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !['eventId', 'type', 'caseId', 'clientGroupId', 'occurredAt', 'schemaVersion'].includes(k))))]);
      }
      tableBox.innerHTML = '';
      tableBox.append(el('table', { class: 'db' }, el('tr', {}, head.map((h) => el('th', {}, h))),
        rows.length ? rows.map((r) => el('tr', {}, r.map(cell))) : el('tr', {}, el('td', { colspan: head.length }, '(empty)'))));
    }

    function renderCase() {
      caseBox.innerHTML = '';
      if (!currentCase) { caseBox.append(el('div', { style: 'color:var(--slate);font-size:14px' }, 'Open a case first.')); return; }
      const row = sys.db.screening_case.get(currentCase);
      const s = row ? { ...row.snapshot, version: row.version } : null;
      const visible = s && s.clientGroup === ui.group;
      caseBox.append(el('div', { style: 'font-size:13px' }, 'Case ', el('code', {}, short(currentCase)), ' owned by ', el('b', {}, s?.clientGroup || '?')));
      if (!visible) caseBox.append(el('div', { class: 'verdict bad', style: 'font-size:13px' }, `You are calling as "${ui.group}". Any request for this case now returns 404 – tenants cannot even learn it exists.`));
      if (s) {
        caseBox.append(el('div', { class: 'sim-row' }, el('span', { class: `status-pill status-${s.status}` }, s.status),
          s.outcome ? el('span', { class: 'status-pill status-CLOSED' }, s.outcome) : null,
          el('span', { style: 'font-size:13px;color:var(--slate)' }, `screened ×${s.screeningCount} · version ${s.version}`)));
      }
      caseBox.append(el('div', { class: 'sim-row' },
        el('button', { class: 'btn small', onclick: () => act('screen') }, 'POST screen'),
        el('button', { class: 'btn small', onclick: () => act('close') }, 'POST close'),
        el('button', { class: 'btn small secondary', onclick: () => act('get') }, 'GET case')));
      const matches = [...sys.db.case_match.values()].filter((m) => m.case_id === currentCase).sort((a, b) => b.score - a.score).map((m) => m.snapshot);
      if (s && s.screeningCount > 0 && !matches.length) caseBox.append(el('div', { style: 'font-size:13px;color:var(--slate)' }, 'No matches at the current threshold.'));
      for (const m of matches) {
        const profile = WC.PROFILES.find((p) => p.id === m.profileId);
        const res = select([['POSITIVE', 'POSITIVE'], ['POSSIBLE', 'POSSIBLE'], ['FALSE_POSITIVE', 'FALSE_POSITIVE'], ['UNRESOLVED', 'UNRESOLVED (invalid)']], () => {});
        const why = el('input', { type: 'text', placeholder: 'rationale (10-2000 chars)', value: 'DOB and country match the profile', style: 'flex:1;min-width:120px' });
        caseBox.append(el('div', { class: 'match-card' },
          el('div', { class: 'head' }, el('b', {}, `${m.profileId} · ${profile?.primaryName}`), el('span', { class: `status-pill res-${m.resolution}` }, m.resolution)),
          el('div', { style: 'font-size:12.5px;color:var(--slate)' }, `${m.category} · matched name "${m.matchedName}" · DOB ${profile?.dateOfBirth || '–'} · ${profile?.country}`),
          el('div', { class: 'score-bar' }, el('div', { style: `width:${m.score}%` })),
          el('div', { style: 'font-size:12.5px' }, `score ${m.score}${m.resolvedBy ? ` · resolved by ${m.resolvedBy}` : ''}`),
          el('div', { class: 'sim-row' }, res, why, el('button', { class: 'btn small amber', onclick: () => act('resolve', { matchId: m.id, resolution: res.value, rationale: why.value }) }, 'PUT resolve'))));
      }
    }

    function renderAll() { renderCase(); renderTables(); }

    function buildRequest(kind, extra) {
      const base = `/api/v1/client-groups/${ui.group}/cases`;
      const id = currentCase;
      if (kind === 'open') {
        const body = { name: f.name.value, entityType: f.type.value, dateOfBirth: f.dob.value || null, country: f.country.value || null };
        const headers = f.key.value ? { 'Idempotency-Key': f.key.value } : {};
        return { method: 'POST', path: base, headers, body };
      }
      if (kind === 'screen') return { method: 'POST', path: `${base}/${id}/screenings`, headers: {}, body: null };
      if (kind === 'close') return { method: 'POST', path: `${base}/${id}/closure`, headers: {}, body: { analystId: ui.analyst } };
      if (kind === 'get') return { method: 'GET', path: `${base}/${id}`, headers: {}, body: null };
      if (kind === 'resolve') return { method: 'PUT', path: `${base}/${id}/matches/${extra.matchId}/resolution`, headers: {}, body: { resolution: extra.resolution, rationale: extra.rationale, analystId: ui.analyst } };
      return null;
    }

    async function play(events) {
      for (const e of events) {
        hex.light(pathFor(e.node, 'rest'));
        logLine(log, e);
        if (ui.speed) await sleep(ui.speed);
      }
    }

    async function act(kind, extra = {}) {
      if (busy) return;
      if (kind !== 'open' && kind !== 'relay' && !currentCase) return;
      busy = true;
      const events = [];
      sys.onTrace((e) => events.push(e));
      log.append(el('div', { style: 'color:#E9A23B;border-bottom:1px solid #E9A23B' }, `── ${new Date().toLocaleTimeString()} ${kind.toUpperCase()} ──`));
      if (kind === 'relay') {
        sys.relay();
        await play(events.length ? events : [{ node: 'relay', text: 'nothing to publish' }]);
        renderTables(); busy = false; return;
      }
      const req = buildRequest(kind, extra);
      reqPre.querySelector('code').textContent = `${req.method} ${req.path}\n${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}\n`).join('')}${req.body ? 'Content-Type: application/json\n\n' + json(req.body) : ''}`;
      events.push({ node: 'client', text: `${req.method} ${req.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (m) => short(m) + '…')}` });
      let res;
      try {
        events.push({ node: 'rest', text: 'route matched → @ExecuteOn(BLOCKING) → bind path vars, headers, JSON body' });
        if (kind === 'open') {
          const errs = [];
          if (!req.body.name || !req.body.name.trim()) errs.push('request.name: must not be blank');
          if (req.body.name && req.body.name.length > 200) errs.push('request.name: size must be between 0 and 200');
          if (req.body.country && !/^[A-Za-z]{2}$/.test(req.body.country)) errs.push('request.country: must match "[A-Za-z]{2}"');
          if (errs.length) { events.push({ node: 'rest', text: `Bean Validation failed: ${errs.join('; ')} – use case never called`, error: true }); res = beanValidation(req.path, errs); throw null; }
          events.push({ node: 'rest', text: 'Bean Validation ✓ → new PartyName / Party / CountryCode (value objects validate themselves)' });
          const party = WC.makeParty(req.body);
          const view = sys.app.open({ clientGroup: ui.group, party, idempotencyKey: req.headers['Idempotency-Key'] });
          currentCase = view.id;
          res = { status: 201, contentType: 'application/json', location: `${req.path}/${view.id}`, body: caseResponse(view) };
        } else if (kind === 'screen') {
          res = { status: 200, contentType: 'application/json', body: caseResponse(sys.app.screen({ clientGroup: ui.group, caseId: currentCase })) };
        } else if (kind === 'close') {
          res = { status: 200, contentType: 'application/json', body: caseResponse(sys.app.close({ clientGroup: ui.group, caseId: currentCase, analyst: ui.analyst })) };
        } else if (kind === 'get') {
          events.push({ node: 'portin', text: 'FindCaseQuery.find(group, id)' });
          const c = sys.uow.read(() => sys.repository.findById(currentCase));
          if (!c || !c.belongsTo(ui.group)) { events.push({ node: 'app', text: 'not found for this tenant → Optional.empty()', error: true }); throw new WC.CaseNotFound(currentCase); }
          res = { status: 200, contentType: 'application/json', body: caseResponse(c.snapshot()) };
        } else if (kind === 'resolve') {
          if (!/^(POSITIVE|POSSIBLE|FALSE_POSITIVE)$/.test(req.body.resolution)) {
            const errs = ['request.resolution: must match "POSITIVE|POSSIBLE|FALSE_POSITIVE"'];
            events.push({ node: 'rest', text: `Bean Validation failed: ${errs[0]}`, error: true });
            res = beanValidation(req.path, errs); throw null;
          }
          events.push({ node: 'rest', text: 'Bean Validation ✓ → new ResolutionRationale(…) (10-2000 chars)' });
          const rationale = WC.validateRationale(req.body.rationale);
          res = { status: 200, contentType: 'application/json', body: caseResponse(sys.app.resolve({ clientGroup: ui.group, caseId: currentCase, matchId: extra.matchId, resolution: req.body.resolution, rationale, analyst: ui.analyst })) };
        }
        events.push({ node: 'rest', text: `${res.status} ${res.status === 201 ? 'Created' : 'OK'} ← CaseResponse.of(view) → JSON (Serde)`, ok: true });
      } catch (e) {
        if (e) {
          res = toHttpError(e);
          events.push({ node: 'rest', text: `${res.status} ${res.body.title}${res.body.rule ? ` · rule ${res.body.rule}` : ''} ← ProblemHandlers (application/problem+json)`, error: true });
        }
      }
      await play(events);
      resPre.querySelector('code').textContent = `HTTP/1.1 ${res.status}\nContent-Type: ${res.contentType}${res.location ? `\nLocation: ${res.location}` : ''}\n\n${json(res.body)}`;
      resPre.style.borderLeft = `5px solid ${res.status < 300 ? '#3C9D5D' : res.status < 500 ? '#C8553D' : '#6D5BD0'}`;
      renderAll();
      busy = false;
    }

    renderAll();
  });

  // ------------------------------------------------------------------ optimistic locking race
  Course.sim('concurrency', (node) => {
    header(node, 'Two analysts, one case – optimistic locking',
      'Anna and Ben both load the same case (version 1, one UNRESOLVED match). Each decides something different. Choose the order of saves, and whether the repository checks the version. Without the check, the second save silently overwrites the first – a <b>lost update</b> in a regulated audit trail.');
    let locking = true;
    const out = el('div');
    const log = el('div', { class: 'log' });
    const toggle = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:14px' },
      el('input', { type: 'checkbox', checked: true, onchange: (e) => { locking = e.target.checked; reset(); } }), 'Repository checks @Version (WHERE version = ?)');
    let sys; let caseId; let anna; let ben; let matchId;
    const annaBox = el('div', { class: 'panel' });
    const benBox = el('div', { class: 'panel' });
    node.append(el('div', { class: 'sim-row' }, toggle, el('button', { class: 'btn small secondary', onclick: () => reset() }, 'Reset')),
      el('div', { class: 'sim-grid cols-2' }, annaBox, benBox), out, el('div', { class: 'panel dark' }, el('h5', {}, 'SQL issued'), log));

    function reset() {
      sys = WC.createSystem();
      sys.onTrace((e) => { if (e.node === 'jdbc') log.append(el('div', { class: e.error ? 'err' : '' }, e.text)); });
      const party = WC.makeParty({ name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' });
      caseId = sys.app.open({ clientGroup: 'acme-bank', party }).id;
      const screened = sys.app.screen({ clientGroup: 'acme-bank', caseId });
      matchId = screened.matches[0].id;
      log.innerHTML = '';
      if (!locking) {
        const original = sys.repository.save;
        sys.repository.save = (c) => {
          const row = sys.db.screening_case.get(c.id);
          if (row) {
            const s = c.snapshot();
            log.append(el('div', {}, `UPDATE screening_case SET status='${s.status}' WHERE id=…   -- no version check`));
            row.version += 1; row.snapshot = { ...s, matches: undefined };
            for (const m of s.matches) sys.db.case_match.set(m.id, { case_id: s.id, score: m.score, snapshot: m });
          } else original(c);
        };
      }
      anna = sys.repository.findById(caseId);
      ben = sys.repository.findById(caseId);
      log.append(el('div', {}, '-- both analysts loaded version 1'));
      out.innerHTML = '';
      render();
    }
    function save(who) {
      const c = who === 'anna' ? anna : ben;
      if (c.saved) return;
      const now = new Date().toISOString();
      if (who === 'anna') c.resolveMatch(matchId, 'POSITIVE', 'DOB and country match exactly', 'analyst-anna', now);
      else c.resolveMatch(matchId, 'FALSE_POSITIVE', 'Different middle name in passport', 'analyst-ben', now);
      try {
        sys.uow.write(() => { sys.repository.save(c); sys.outbox.append(c.pullEvents()); });
        c.saved = 'ok';
      } catch (e) {
        c.saved = 'conflict';
      }
      render();
    }
    function render() {
      const stored = sys.repository.findById(caseId);
      const m = stored.matches[0];
      for (const [box, who, c, decision] of [[annaBox, 'anna', anna, 'POSITIVE'], [benBox, 'ben', ben, 'FALSE_POSITIVE']]) {
        box.innerHTML = '';
        box.append(el('h5', {}, who === 'anna' ? 'Analyst Anna' : 'Analyst Ben'),
          el('div', { style: 'font-size:14px' }, `Loaded version 1 · decides `, el('span', { class: `status-pill res-${decision}` }, decision)),
          c.saved === 'ok' ? el('div', { class: 'verdict good' }, '200 OK – saved')
            : c.saved === 'conflict' ? el('div', { class: 'verdict bad' }, '409 Conflict · rule CONCURRENT_UPDATE – reload, see Anna\'s decision, then decide again')
              : el('button', { class: 'btn small', onclick: () => save(who) }, `Save ${who === 'anna' ? 'Anna' : 'Ben'}'s decision`));
      }
      out.innerHTML = '';
      const both = anna.saved && ben.saved;
      out.append(el('div', { class: 'verdict info' }, `Stored now: version ${sys.db.screening_case.get(caseId).version}, match resolution `, el('span', { class: `status-pill res-${m.resolution}` }, m.resolution), m.resolvedBy ? ` by ${m.resolvedBy}` : ''));
      if (both) {
        const events = sys.db.outbox_event.filter((r) => r.type === 'MatchResolved').length;
        out.append(locking
          ? el('div', { class: 'verdict good' }, 'Exactly one decision won and the other analyst was told. Nothing was lost; the audit trail (outbox) has one MatchResolved per committed decision.')
          : el('div', { class: 'verdict bad' }, `Lost update: both saves "succeeded", ${events} MatchResolved events were published, but the stored case only shows the last writer. If Anna's POSITIVE was overwritten by a FALSE_POSITIVE without anyone seeing it, a sanctioned person was just cleared – and four-eyes never ran, because Ben's aggregate never saw Anna's decision.`));
      }
    }
    reset();
  });

  // ------------------------------------------------------------------ outbox crash points
  Course.sim('outbox-crash', (node) => {
    header(node, 'Crash-point simulator – dual write vs transactional outbox',
      'Choose a strategy and the exact moment the process dies. The simulator replays the steps and shows whether the database and the event stream agree afterwards. This is the argument you will make in design reviews.');
    const STRATS = {
      dual: { name: 'Dual write (save, then publish directly)', steps: ['BEGIN', 'UPDATE screening_case', 'COMMIT', 'broker.publish(CaseClosed)', 'return 200'] },
      dualInside: { name: 'Publish inside the transaction', steps: ['BEGIN', 'UPDATE screening_case', 'broker.publish(CaseClosed)', 'COMMIT', 'return 200'] },
      outbox: { name: 'Transactional outbox + relay', steps: ['BEGIN', 'UPDATE screening_case', 'INSERT outbox_event', 'COMMIT', 'return 200', 'relay: SELECT unpublished', 'relay: broker.publish', 'relay: UPDATE published_at'] },
    };
    let strat = 'dual'; let crashAt = 3;
    const stepsBox = el('ol', { class: 'step-list' });
    const verdict = el('div');
    const stratSel = el('select', { onchange: (e) => { strat = e.target.value; crashAt = Math.min(crashAt, STRATS[strat].steps.length); render(); } },
      Object.entries(STRATS).map(([k, v]) => el('option', { value: k }, v.name)));
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Strategy', stratSel)),
      el('div', { class: 'sim-grid cols-2' }, el('div', { class: 'panel' }, el('h5', {}, 'Click the step where the process crashes (before it runs)'), stepsBox), el('div', {}, verdict)));
    function outcome() {
      const steps = STRATS[strat].steps;
      const ran = steps.slice(0, crashAt - 1);
      const has = (s) => ran.includes(s);
      let committed; let published; let note = '';
      if (strat === 'dual') {
        committed = has('COMMIT'); published = has('broker.publish(CaseClosed)');
        if (crashAt === steps.length + 1) note = 'No crash: works on a good day. That is why dual writes survive code review.';
      } else if (strat === 'dualInside') {
        published = has('broker.publish(CaseClosed)'); committed = has('COMMIT');
        if (published && !committed) note = 'Downstream systems (billing, audit, client notifications) were told the case closed. The database rolled back. Nobody can un-send that message.';
      } else {
        committed = has('COMMIT');
        published = committed; // relay retries until published
        if (committed && !has('relay: UPDATE published_at') && has('relay: broker.publish')) note = 'The relay crashed after publishing but before marking the row: on restart it publishes again. Consumers see a duplicate with the same eventId and must de-duplicate (idempotent consumer).';
        else if (committed && !has('relay: broker.publish')) note = 'The row is safely in outbox_event. When the relay restarts it finds it and publishes. Delay, not loss.';
        else if (!committed) note = 'Nothing committed, nothing will ever be published. Consistent.';
      }
      return { committed, published, note };
    }
    function render() {
      const steps = STRATS[strat].steps;
      stepsBox.innerHTML = '';
      steps.forEach((s, i) => stepsBox.append(el('li', { class: i + 1 === crashAt ? 'current' : i + 1 < crashAt ? 'past' : '', onclick: () => { crashAt = i + 1; render(); } }, (i + 1 === crashAt ? '💥 crash here – ' : '') + s)));
      stepsBox.append(el('li', { class: crashAt === steps.length + 1 ? 'current' : 'past', onclick: () => { crashAt = steps.length + 1; render(); } }, crashAt === steps.length + 1 ? '✓ no crash' : 'no crash'));
      const { committed, published, note } = outcome();
      const consistent = committed === published;
      verdict.innerHTML = '';
      verdict.append(
        el('table', {}, el('tr', {}, el('th', {}, 'After restart'), el('th', {}, 'Value')),
          el('tr', {}, el('td', {}, 'Case is CLOSED in the database'), el('td', {}, committed ? 'yes' : 'no')),
          el('tr', {}, el('td', {}, 'CaseClosed reached consumers'), el('td', {}, published ? (strat === 'outbox' ? 'yes (eventually)' : 'yes') : 'no'))),
        el('div', { class: `verdict ${consistent ? 'good' : 'bad'}` }, consistent ? 'Consistent' : committed ? 'INCONSISTENT – state changed, event lost forever. Ongoing monitoring, audit and client webhooks never hear about it.' : 'INCONSISTENT – event published for a change that never happened.'),
        note ? el('p', { style: 'font-size:14.5px' }, note) : null);
    }
    render();
  });

  // ------------------------------------------------------------------ Micronaut HTTP pipeline
  Course.sim('http-pipeline', (node) => {
    header(node, 'Micronaut request pipeline – where each kind of failure is caught',
      'Choose a request. The pipeline lights up stage by stage and stops where Micronaut (or your code) produces the response. Learn to read a status code and know immediately which layer said no.');
    const STAGES = [
      ['netty', 'Netty event loop', 'Accepts the connection and parses HTTP. Never block here.'],
      ['router', 'Router', 'Route table generated at compile time from @Controller/@Post. No route → 404 from Micronaut, not from you.'],
      ['filters', 'Filters', '@ServerFilter / @RequestFilter: auth, correlation id, tenant header checks.'],
      ['executor', '@ExecuteOn(BLOCKING)', 'Hands the request to the blocking executor (virtual threads on Java 21) because JDBC blocks.'],
      ['binding', 'Argument binding + Serde', 'Path variables, headers, JSON → OpenCaseRequest record (serde-processor generated the deserializer).'],
      ['validation', 'Bean Validation (@Valid)', 'Shape rules on the request record: @NotBlank, @Pattern. Failure → 400 with Micronaut\'s error JSON.'],
      ['controller', 'CaseController', 'Builds value objects (they validate meaning: INVALID_VALUE → 400) and a command, calls the port.'],
      ['usecase', 'Use case + aggregate', 'Business rules. DomainException → 422, CaseNotFound → 404, optimistic lock → 409.'],
      ['handlers', 'ExceptionHandlers', 'ProblemHandlers translate inner exceptions into application/problem+json.'],
      ['response', 'Response encoding', 'CaseResponse → JSON via Serde, status + headers written by Netty.'],
    ];
    const SCENARIOS = [
      ['Valid open-case request', 'controller,usecase,response', 201, 'Created + Location header. Inner layers never knew it was HTTP.'],
      ['POST to /api/v1/cases (wrong URL)', 'router', 404, 'Micronaut\'s router answered; your controller never ran. Check the path, not your code.'],
      ['Body {"name":"", "entityType":"PERSON"}', 'validation', 400, 'Bean Validation rejected the shape. The error JSON lists request.name and request.entityType.'],
      ['Body name "1234" (no letters)', 'controller', 400, 'Shape was fine; PartyName rejected the meaning: rule INVALID_VALUE → 400 via DomainExceptionHandler.'],
      ['Close a case with UNRESOLVED matches', 'usecase', 422, 'The aggregate refused: rule MATCHES_AWAITING_REVIEW. Valid request, invalid business action → 422.'],
      ['GET a case owned by another client group', 'usecase', 404, 'The application service hides other tenants\' cases: CaseNotFoundException → 404 (never 403, which would leak existence).'],
      ['Two analysts save the same version', 'usecase', 409, 'OptimisticLockException → ConcurrentCaseUpdateException → 409 CONCURRENT_UPDATE. Client reloads and retries.'],
      ['Missing auth token (with security enabled)', 'filters', 401, 'With micronaut-security the security filter rejects before routing to your code.'],
    ];
    const list = el('ol', { class: 'step-list' });
    const verdict = el('div');
    const pick = el('select', { onchange: (e) => run(+e.target.value) }, SCENARIOS.map(([t], i) => el('option', { value: i }, t)));
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Request', pick), el('button', { class: 'btn small amber', onclick: () => run(+pick.value) }, '▶ Send')),
      el('div', { class: 'sim-grid cols-2' }, el('div', { class: 'panel' }, el('h5', {}, 'Pipeline'), list), verdict));
    let timer;
    function run(i) {
      clearInterval(timer);
      const [, stopAt, status, explain] = SCENARIOS[i];
      const stops = stopAt.split(',');
      const finalStop = stops[stops.length - 1];
      const errorStop = status >= 400 ? stops[0] : null;
      const order = STAGES.map((s) => s[0]);
      let path;
      if (status < 400) path = order.filter((s) => s !== 'handlers');
      else if (['usecase', 'controller'].includes(errorStop)) path = order.slice(0, order.indexOf(errorStop) + 1).concat(['handlers', 'response']);
      else path = order.slice(0, order.indexOf(errorStop) + 1).concat(['response']);
      let k = 0;
      verdict.innerHTML = '';
      const tick = () => {
        list.innerHTML = '';
        STAGES.forEach(([id, name, desc]) => {
          const idx = path.indexOf(id);
          const cls = idx === -1 || idx > k ? '' : idx === k ? 'current' : 'past';
          list.append(el('li', { class: cls, style: idx === -1 && k >= path.length - 1 ? 'opacity:.35' : '' }, el('b', {}, name), el('div', { style: 'font-size:12.5px;color:var(--slate)' }, desc)));
        });
        if (k >= path.length - 1) {
          clearInterval(timer);
          verdict.append(el('div', { class: `verdict ${status < 400 ? 'good' : 'bad'}`, style: 'font-size:22px' }, `HTTP ${status}`), el('p', {}, explain),
            el('p', { style: 'font-size:13px;color:var(--slate)' }, `Decided at: ${STAGES.find((s) => s[0] === (errorStop || finalStop))[1]}`));
        }
        k++;
      };
      tick();
      timer = setInterval(tick, 420);
    }
    run(0);
  });
})();
