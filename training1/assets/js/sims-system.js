/* System simulators: they drive clean-system.js (the JavaScript port of the code lab) through a live
   concentric Clean Architecture diagram. */
(function () {
  const { el } = Course;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const short = (id) => (id ? String(id).slice(0, 8) : '');
  const json = (o) => JSON.stringify(o, null, 2);
  const VIKTOR = { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' };

  function header(node, title, intro) {
    node.append(el('div', { class: 'sim-title' }, title));
    if (intro) node.append(el('p', { class: 'sim-intro', html: intro }));
  }
  Course.simHeader = header;

  // ------------------------------------------------------------------ live concentric diagram
  const BANDS = [
    ['framework', 125, 20, 1185, 610, '#EAF1F8', '#3E7CB1', '#1F4E79', 'FRAMEWORKS & DRIVERS · screening-app (Micronaut, Netty, H2)'],
    ['iadapter', 245, 90, 945, 470, '#ECF6EA', '#5FAD56', '#2F6B28', 'INTERFACE ADAPTERS · screening-interface-adapters'],
    ['usecase', 375, 160, 685, 330, '#FCEDE8', '#E07A5F', '#9C3D24', 'USE CASES · screening-usecases'],
    ['entity', 545, 240, 345, 170, '#FDF5DE', '#F2C14E', '#8A6A12', 'ENTITIES · screening-entities'],
  ];
  const STROKE = { framework: '#3E7CB1', iadapter: '#5FAD56', usecase: '#E07A5F', entity: '#C99A1E', main: '#6D5BD0', outside: '#5B6B7F' };
  const INTERFACES = new Set(['boundary', 'output', 'gw-case', 'gw-outbox', 'gw-ref', 'gw-tx', 'gw-idem', 'gw-queue']);
  const LAYOUT = {
    client: [10, 222, 100, 52, ['Analyst UI', 'curl / browser']],
    endpoint: [133, 222, 104, 46, ['CaseEndpoint', '@Controller']],
    binding: [133, 290, 104, 46, ['Serde binding', 'MalformedBody…']],
    main: [140, 575, 170, 44, ['MainWiring', '@Factory · "Main"']],
    controller: [253, 222, 114, 46, ['CaseController', '+ Forms (shape)']],
    presenter: [253, 330, 114, 46, ['CasePresenter', 'status, labels']],
    viewmodel: [253, 410, 114, 46, ['ViewModel', 'CaseJson / Problem']],
    boundary: [385, 222, 150, 46, ['«input boundary»', 'OpenCase, ScreenCase…']],
    output: [385, 330, 150, 46, ['«output boundary»', 'CaseOutputBoundary']],
    interactor: [620, 180, 200, 46, ['…Interactor', 'application rules']],
    response: [560, 425, 170, 46, ['CaseResponse', 'response model']],
    entity: [565, 275, 145, 56, ['ScreeningCase', 'aggregate + VOs']],
    policy: [725, 275, 150, 56, ['NameMatching…', 'Policy']],
    'gw-ref': [898, 172, 152, 38, ['«gateway»', 'ReferenceDataGateway']],
    'gw-case': [898, 216, 152, 38, ['«gateway»', 'CaseGateway']],
    'gw-outbox': [898, 260, 152, 38, ['«gateway»', 'EventOutboxGateway']],
    'gw-tx': [898, 304, 152, 38, ['«gateway»', 'TransactionRunner']],
    'gw-idem': [898, 348, 152, 38, ['«gateway»', 'IdempotencyGateway']],
    'gw-queue': [898, 392, 152, 38, ['«gateway»', 'WorkQueueGateway']],
    'ref-gw': [1068, 172, 114, 46, ['InMemory…', 'ReferenceData']],
    'sql-gw': [1068, 232, 114, 46, ['SqlCaseGateway', '+ RecordMapper']],
    'outbox-gw': [1068, 292, 114, 46, ['OutboxEvent…', 'Gateway']],
    relay: [1068, 500, 114, 46, ['OutboxRelay', 'publish oldest']],
    records: [1198, 112, 104, 46, ['Micronaut…', 'Records (Data)']],
    tx: [1198, 172, 104, 46, ['Micronaut…', 'TransactionRunner']],
    idem: [1198, 232, 104, 46, ['JdbcIdempo…', 'tencyGateway']],
    queue: [1198, 292, 104, 46, ['JdbcWork…', 'QueueGateway']],
    db: [1198, 360, 104, 150, ['H2 database', 'Flyway V1']],
    scheduler: [890, 575, 140, 44, ['ScheduledOutbox…', '@Scheduled']],
    sink: [1045, 575, 130, 44, ['LoggingEventSink', 'log / broker']],
  };
  const EDGES = [
    ['client', 'endpoint'], ['endpoint', 'binding'], ['endpoint', 'controller'], ['controller', 'boundary'], ['controller', 'viewmodel'],
    ['boundary', 'interactor'], ['interactor', 'entity'], ['entity', 'policy'],
    ['interactor', 'gw-ref'], ['interactor', 'gw-case'], ['interactor', 'gw-outbox'], ['interactor', 'gw-tx'], ['interactor', 'gw-idem'], ['interactor', 'gw-queue'],
    ['gw-ref', 'ref-gw'], ['gw-case', 'sql-gw'], ['gw-outbox', 'outbox-gw'], ['gw-tx', 'tx'], ['gw-idem', 'idem'], ['gw-queue', 'queue'],
    ['sql-gw', 'records'], ['outbox-gw', 'records'], ['records', 'db'], ['tx', 'db'], ['idem', 'db'], ['queue', 'db'],
    ['interactor', 'response'], ['response', 'output'], ['output', 'presenter'], ['presenter', 'viewmodel'], ['viewmodel', 'endpoint'], ['binding', 'viewmodel'],
    ['scheduler', 'relay'], ['relay', 'records'], ['relay', 'sink'],
  ];
  // source-code dependencies: every arrow points inward (or stays in its ring)
  const DEPS = [
    ['endpoint', 'controller'], ['endpoint', 'viewmodel'], ['controller', 'boundary'], ['presenter', 'output'], ['presenter', 'response'],
    ['interactor', 'boundary'], ['interactor', 'entity'], ['interactor', 'gw-case'], ['response', 'entity'],
    ['sql-gw', 'gw-case'], ['outbox-gw', 'gw-outbox'], ['ref-gw', 'gw-ref'], ['tx', 'gw-tx'], ['idem', 'gw-idem'], ['queue', 'gw-queue'], ['records', 'sql-gw'],
    ['main', 'interactor'], ['main', 'controller'], ['main', 'presenter'],
  ];
  const center = (id) => { const [x, y, w, h] = LAYOUT[id]; return [x + w / 2, y + h / 2]; };

  Course.cleanDiagram = function (container, { deps = false } = {}) {
    const wrap = el('div', { class: 'cleanlive' });
    let s = '<svg viewBox="0 0 1320 640" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, Arial, sans-serif">';
    s += '<defs><marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1D2733"/></marker></defs>';
    for (const [ring, x, y, w, h, fill, stroke, ink, label] of BANDS) {
      s += `<rect class="ring-band" data-ring="${ring}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${ring === 'entity' ? 26 : 34}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      s += `<text x="${x + 14}" y="${y + 19}" font-size="12" font-weight="800" fill="${ink}" letter-spacing=".04em">${label}</text>`;
    }
    for (const [a, b] of EDGES) {
      const [x1, y1] = center(a); const [x2, y2] = center(b);
      s += `<line class="edge" data-edge="${a}|${b}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
    s += '<g class="deps" style="display:none">';
    for (const [a, b] of DEPS) {
      const [x1, y1] = center(a); const [x2, y2] = center(b);
      const mx = (x1 + x2) / 2 + (y2 - y1) * 0.18; const my = (y1 + y2) / 2 - (x2 - x1) * 0.18;
      s += `<path class="edge dep" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
    }
    s += '</g>';
    for (const [id, [x, y, w, h, [l1, l2]]] of Object.entries(LAYOUT)) {
      const ring = Clean.NODES[id][0];
      const dash = INTERFACES.has(id) ? ' stroke-dasharray="5 3"' : '';
      const fill = id === 'entity' || id === 'policy' ? '#FFF8E6' : '#FFFFFF';
      const cy = y + h / 2;
      s += `<g class="node" data-id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${STROKE[ring]}" stroke-width="2"${dash}/>`
        + `<text class="l1" x="${x + w / 2}" y="${cy - 3}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1D2733">${Course.escape(l1)}</text>`
        + `<text class="l2" x="${x + w / 2}" y="${cy + 11}" text-anchor="middle" font-size="10" fill="#1D2733" opacity=".78">${Course.escape(l2)}</text></g>`;
    }
    s += '</svg>';
    wrap.innerHTML = s;
    container.append(wrap);
    const svg = wrap.querySelector('svg');
    let history = [];
    const edgeEl = (a, b) => svg.querySelector(`.edge[data-edge="${a}|${b}"]`) || svg.querySelector(`.edge[data-edge="${b}|${a}"]`);
    const api = {
      clear() { svg.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot')); history = []; },
      /** Light a node and the edge from the most recent lit node it is connected to. */
      step(id) {
        svg.querySelectorAll('.hot').forEach((n) => n.classList.remove('hot'));
        svg.querySelector(`.node[data-id="${id}"]`)?.classList.add('hot');
        const from = [...history].reverse().find((h) => h !== id && edgeEl(h, id));
        if (from) { edgeEl(from, id).classList.add('hot'); svg.querySelector(`.node[data-id="${from}"]`)?.classList.add('hot'); }
        history = [...history.slice(-6), id];
      },
      replay(nodes) { history = []; nodes.forEach((n) => api.step(n)); },
      label(id, l1, l2) {
        const g = svg.querySelector(`.node[data-id="${id}"]`);
        if (!g) return;
        g.querySelector('.l1').textContent = l1;
        if (l2 != null) g.querySelector('.l2').textContent = l2;
      },
      dim(id, on) { const g = svg.querySelector(`.node[data-id="${id}"]`); if (g) g.style.opacity = on ? '.25' : ''; },
      showDeps(on) { svg.querySelector('.deps').style.display = on ? '' : 'none'; svg.querySelectorAll('line.edge').forEach((e) => (e.style.opacity = on ? '.25' : '')); },
    };
    api.showDeps(deps);
    return api;
  };

  function ringTag(ring) { return el('span', { class: `ring-tag ring-${ring}` }, Clean.RING_LABEL[ring]); }
  Course.ringTag = ringTag;
  function logLine(log, e) {
    const cls = e.error ? 'err' : e.ok ? 'ok' : e.event ? 'evt' : '';
    log.append(el('div', { class: cls }, ringTag(e.ring), ' ', e.text, e.inverted ? el('span', { class: 'badge-inv', title: 'Control flows outward here, but the source code dependency points inward: the inner ring owns this interface' }, 'DIP') : null));
    log.scrollTop = log.scrollHeight;
  }
  Course.logLine = logLine;
  const fileOf = (e, useCase) => (Clean.NODES[e.node] || ['', ''])[1].replace(/<usecase>/g, (useCase || 'opencase').toLowerCase()).replace(/<UseCase>/g, useCase || 'OpenCase');

  // ------------------------------------------------------------------ delivery-mechanism presenters (also used by presenter-lab)
  const CSV_HEAD = 'case_id,party,status,outcome,profile_id,category,score,resolution';
  Course.presenters = {
    rest: { name: 'REST JSON – CasePresenter (the lab)', make: () => new Clean.CasePresenter(), render: (vm) => `HTTP/1.1 ${vm.status}\nContent-Type: ${vm.contentType}${vm.location ? `\nLocation: ${vm.location}` : ''}\n\n${json(Clean.nonNull(vm.body))}` },
    html: {
      name: 'Server-rendered HTML – HtmlCasePresenter',
      make: () => {
        const p = { vm: null };
        const page = (status, title, inner) => { p.vm = { status, html: `<!-- HTTP ${status} -->\n<article class="case">\n  <h1>${title}</h1>\n${inner}\n</article>` }; };
        p.presentOpened = (r, n) => page(n ? 201 : 200, `Case for ${r.partyName}`, `  <p class="status">${r.status === 'CREATED' ? 'Not screened yet' : r.status}</p>\n  <form method="post" action="${Clean.locationOf(r)}/screenings"><button>Screen now</button></form>`);
        p.presentCase = (r) => page(200, `Case for ${r.partyName}`, `  <p class="status">${r.status}</p>\n  <table>\n${r.matches.map((m) => `    <tr><td>${m.profileId}</td><td>${m.category}</td><td>${m.score}</td><td>${m.resolution}</td></tr>`).join('\n') || '    <tr><td colspan="4">No matches</td></tr>'}\n  </table>${Clean.allowedActions(r.status).includes('close') ? '\n  <button>Close case</button>' : ''}`);
        p.presentInvalidRequest = (rule, msg) => page(400, 'Please correct the form', `  <p class="field-error">${msg}</p>`);
        p.presentRuleViolation = (rule, msg) => page(422, 'This action is not allowed yet', `  <p class="flash warning">${msg}</p>`);
        p.presentNotFound = () => page(404, 'Case not found', '  <p>It may have been removed, or it belongs to another client group.</p>');
        p.presentConflict = () => page(409, 'Someone else changed this case', '  <p>Reload to see their change, then try again.</p>');
        p.result = () => p.vm;
        return p;
      },
      render: (vm) => vm.html,
    },
    csv: {
      name: 'CSV export – CsvCasePresenter (batch / regulator report)',
      make: () => {
        const p = { vm: null };
        p.presentOpened = (r) => p.presentCase(r);
        p.presentCase = (r) => { p.vm = { status: 0, text: [CSV_HEAD, ...(r.matches.length ? r.matches.map((m) => [r.caseId, `"${r.partyName}"`, r.status, r.outcome || '', m.profileId, m.category, m.score, m.resolution].join(',')) : [[r.caseId, `"${r.partyName}"`, r.status, r.outcome || '', '', '', '', ''].join(',')])].join('\n') }; };
        const err = (code, msg) => { p.vm = { status: code, text: `# ERROR ${msg}\n# row skipped, see batch-errors.log` }; };
        p.presentInvalidRequest = (rule, msg) => err(1, `${rule}: ${msg}`);
        p.presentRuleViolation = (rule, msg) => err(1, `${rule}: ${msg}`);
        p.presentNotFound = (id) => err(1, `case ${id} not found`);
        p.presentConflict = (id) => err(1, `case ${id} changed concurrently, will retry`);
        p.result = () => p.vm;
        return p;
      },
      render: (vm) => vm.text,
    },
    cli: {
      name: 'Command line – CliCasePresenter (picocli)',
      make: () => {
        const p = { vm: null };
        const out = (exit, text) => { p.vm = { exit, text: `${text}\n$ echo $?\n${exit}` }; };
        const describe = (r) => `Case ${short(r.caseId)}  ${r.partyName}\nStatus: ${r.status}${r.outcome ? ` (${r.outcome})` : ''}\n${r.matches.map((m) => `  ${m.resolution === 'UNRESOLVED' ? '•' : '✓'} ${m.profileId} ${m.category.padEnd(15)} ${String(m.score).padStart(3)}  ${m.resolution}`).join('\n') || '  no matches'}`;
        p.presentOpened = (r, n) => out(0, `${n ? 'Opened' : 'Already opened'}: ${describe(r)}`);
        p.presentCase = (r) => out(0, describe(r));
        p.presentInvalidRequest = (rule, msg) => out(64, `error: ${msg}`);
        p.presentRuleViolation = (rule, msg) => out(65, `refused (${rule}): ${msg}`);
        p.presentNotFound = (id) => out(66, `no such case: ${id}`);
        p.presentConflict = () => out(75, 'case changed by someone else – run the command again');
        p.result = () => p.vm;
        return p;
      },
      render: (vm) => vm.text,
    },
  };

  // ------------------------------------------------------------------ clean-flow: follow one use case through the rings
  Course.sim('clean-flow', (node) => {
    header(node, 'Clean flow animator – swap the delivery mechanism, watch the inner rings stay still',
      'Pick who delivers the request, run a use case, then step through the trace. Each step names the ring and the real file in the code lab. Steps marked <span class="badge-inv">DIP</span> are where control flows <b>outward</b> through an interface that an <b>inner</b> ring owns. Turn on "source-code dependencies" to see that every arrow in the code still points inward.');
    const cfg = { delivery: 'web', deps: false };
    const actions = el('div', { class: 'sim-row' });
    const changes = el('div');
    const stepBox = el('div', { class: 'verdict info' }, 'Run a use case to see its trace.');
    const steps = el('ol', { class: 'step-list', style: 'max-height:420px;overflow-y:auto' });
    const nav = el('div', { class: 'sim-row' });
    const output = el('pre', { style: 'max-height:240px' }, el('code', { class: 'lang-text' }, '…'));
    node.append(el('div', { class: 'sim-row' },
      el('label', { class: 'field' }, 'Delivery mechanism', el('select', { onchange: (e) => { cfg.delivery = e.target.value; reset(); } },
        el('option', { value: 'web' }, 'Web (Micronaut HTTP + CasePresenter)'), el('option', { value: 'cli' }, 'Command line (picocli + CliPresenter)'), el('option', { value: 'test' }, 'Unit test (interactor + fakes)'))),
      el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:14px' },
        el('input', { type: 'checkbox', onchange: (e) => { cfg.deps = e.target.checked; diagram.showDeps(cfg.deps); } }), 'Show source-code dependencies')));
    const diagram = Course.cleanDiagram(node);
    node.append(actions, el('div', { class: 'sim-grid cols-2' },
      el('div', { class: 'panel' }, el('h5', {}, 'Trace (click a step)'), steps, nav),
      el('div', {}, stepBox, el('div', { class: 'panel dark' }, el('h5', {}, 'What the delivery mechanism shows the user'), output), changes)));

    let sys; let caseId = null; let trace = []; let pos = -1; let timer = null; let useCase = 'OpenCase';
    const LABELS = {
      web: { endpoint: ['CaseEndpoint', '@Controller'], binding: ['Serde binding', 'MalformedBody…'], controller: ['CaseController', '+ Forms (shape)'], presenter: ['CasePresenter', 'status, labels'], viewmodel: ['ViewModel', 'CaseJson / Problem'], 'sql-gw': ['SqlCaseGateway', '+ RecordMapper'], records: ['Micronaut…', 'Records (Data)'], db: ['H2 database', 'Flyway V1'], client: ['Analyst UI', 'curl / browser'] },
      cli: { endpoint: ['ScreeningCli', 'picocli main()'], binding: ['picocli', 'arg parsing'], controller: ['CliController', 'args → request'], presenter: ['CliPresenter', 'text + exit code'], viewmodel: ['CliViewModel', 'stdout, exit'], 'sql-gw': ['SqlCaseGateway', '+ RecordMapper'], records: ['Micronaut…', 'Records (Data)'], db: ['H2 database', 'Flyway V1'], client: ['Operator', 'terminal'] },
      test: { endpoint: ['JUnit test', 'calls execute()'], binding: ['—', 'not used'], controller: ['—', 'not used'], presenter: ['Recording…', 'Presenter (fake)'], viewmodel: ['—', 'assert on calls'], 'sql-gw': ['TestWorld.Cases', 'CaseGateway fake'], records: ['—', 'not used'], db: ['HashMap', 'no database'], client: ['Developer', 'mvn test'] },
    };
    function reset() {
      sys = Clean.createSystem(); caseId = null; trace = []; pos = -1; clearInterval(timer);
      for (const [id, [l1, l2]] of Object.entries(LABELS[cfg.delivery])) diagram.label(id, l1, l2);
      for (const id of ['binding', 'controller', 'viewmodel', 'records', 'tx', 'idem', 'queue']) diagram.dim(id, cfg.delivery === 'test');
      diagram.clear();
      output.querySelector('code').textContent = '…';
      stepBox.className = 'verdict info'; stepBox.textContent = 'Run a use case to see its trace.';
      const changed = {
        web: ['0', '0', 'CaseController, Forms, CasePresenter, CaseJson (already written)', 'CaseEndpoint + Responses (already written)'],
        cli: ['0', '0', 'new CliController + CliCasePresenter (≈80 lines)', 'new ScreeningCli (picocli) + a second Main or a sub-command; MainWiring builds the same interactors'],
        test: ['0', '0', 'none – the test needs no controller', 'none – no Micronaut context; fakes live in src/test'],
      }[cfg.delivery];
      changes.innerHTML = '';
      changes.append(el('table', {}, el('tr', {}, el('th', {}, 'Ring'), el('th', {}, 'Files needed for this delivery mechanism')),
        ...['entity', 'usecase', 'iadapter', 'framework'].map((r, i) => el('tr', {}, el('td', {}, ringTag(r)), el('td', {}, changed[i])))));
      renderSteps(); renderActions();
    }

    function viaDelivery(kind, extra = {}) {
      const group = 'acme-bank';
      const base = `/api/v1/client-groups/${group}/cases`;
      useCase = { open: 'OpenCase', screen: 'ScreenCase', close: 'CloseCase', resolve: 'ResolveMatch' }[kind];
      if (cfg.delivery === 'web') {
        const req = {
          open: { method: 'POST', path: base, body: VIKTOR },
          screen: { method: 'POST', path: `${base}/${caseId}/screenings` },
          close: { method: 'POST', path: `${base}/${caseId}/closure`, body: { analystId: 'analyst-anna' } },
          resolve: { method: 'PUT', path: `${base}/${caseId}/matches/${extra.matchId}/resolution`, body: { resolution: extra.resolution, rationale: 'DOB and country match the sanctions entry', analystId: 'analyst-anna' } },
        }[kind];
        const res = sys.http(req);
        output.querySelector('code').textContent = Course.presenters.rest.render(res);
        return res.status < 300 ? res.body.caseId : null;
      }
      const request = {
        open: { clientGroupId: group, ...VIKTOR },
        screen: { clientGroupId: group, caseId },
        close: { clientGroupId: group, caseId, analystId: 'analyst-anna' },
        resolve: { clientGroupId: group, caseId, matchId: extra.matchId, resolution: extra.resolution, rationale: 'DOB and country match the sanctions entry', analystId: 'analyst-anna' },
      }[kind];
      const presenter = cfg.delivery === 'cli' ? Course.presenters.cli.make() : recording();
      const wrapped = new Proxy(presenter, { get(target, prop) {
        const v = target[prop];
        if (typeof v === 'function' && String(prop).startsWith('present')) return (...a) => { sys.trace('presenter', cfg.delivery === 'cli' ? `CliPresenter.${String(prop)}(…) → text + exit code` : `RecordingPresenter records ${String(prop)}(…)`, { inverted: true }); return v(...a); };
        return v;
      } });
      if (cfg.delivery === 'cli') {
        sys.trace('client', `$ screening ${kind} ${kind === 'open' ? '--name "Viktor Albescu" --type INDIVIDUAL --dob 1961-03-14 --country RO' : short(caseId)}`);
        sys.trace('endpoint', 'ScreeningCli.main(args): picocli parses the command line');
        sys.trace('controller', `CliController builds ${useCase}Request from the arguments – same request model the web controller builds`);
        sys.trace('boundary', `${useCase}.execute(request, presenter)`);
      } else {
        sys.trace('endpoint', `CaseUseCasesTest: new ${useCase}Interactor(TestWorld fakes…).execute(request, recordingPresenter) – no HTTP, no Micronaut, no database`);
        sys.trace('boundary', `${useCase}.execute(request, presenter)`);
      }
      sys.interactors[useCase](request, wrapped);
      const vm = presenter.result();
      if (cfg.delivery === 'cli') {
        sys.trace('viewmodel', 'CliViewModel(text, exitCode)');
        sys.trace('endpoint', `print to stdout, System.exit(${vm.exit})`, { ok: vm.exit === 0, error: vm.exit !== 0 });
        output.querySelector('code').textContent = vm.text;
      } else {
        sys.trace('endpoint', `assertThat(presenter.calls()).containsExactly("${presenter.calls[0]}")`, { ok: true });
        output.querySelector('code').textContent = `// RecordingPresenter captured\ncalls = ${JSON.stringify(presenter.calls)}\nlast = ${json(presenter.last).slice(0, 900)}`;
      }
      return kind === 'open' ? [...sys.db.screening_case.keys()].pop() || null : null;
    }
    function recording() {
      const p = { calls: [], last: null, lastCaseId: null };
      for (const m of ['presentOpened', 'presentCase', 'presentInvalidRequest', 'presentRuleViolation', 'presentNotFound', 'presentConflict']) {
        p[m] = (...a) => { p.calls.push(m); p.last = a[0]; if (a[0] && a[0].caseId) p.lastCaseId = a[0].caseId; };
      }
      p.result = () => p;
      return p;
    }

    function run(kind, extra) {
      clearInterval(timer);
      trace = [];
      sys.onTrace((e) => trace.push(e));
      const id = viaDelivery(kind, extra);
      if (kind === 'open' && id) caseId = id;
      if (extra && extra.relay) sys.relay();
      if (cfg.delivery === 'test') {
        trace = trace.filter((e) => !['records', 'db', 'tx', 'idem', 'queue', 'scheduler', 'relay', 'sink'].includes(e.node))
          .map((e) => (e.node === 'sql-gw' ? { ...e, text: 'TestWorld.Cases (test fake in src/test) keeps aggregates in a HashMap – same CaseGateway interface' } : e));
      }
      pos = -1; renderSteps(); autoplay(); renderActions();
    }
    function renderActions() {
      actions.innerHTML = '';
      const rec = caseId && sys.caseRecord(caseId);
      const matches = caseId ? sys.matchesOf(caseId) : [];
      const pending = matches.find((m) => m.resolution === 'UNRESOLVED');
      const btn = (text, enabled, fn) => el('button', { class: 'btn small', disabled: !enabled, onclick: fn }, text);
      actions.append(
        btn('1 · Open case', !caseId, () => run('open')),
        btn('2 · Screen', !!rec && rec.status !== 'CLOSED', () => run('screen')),
        btn('3 · Try to close (rule violation)', !!rec && rec.status !== 'CLOSED', () => run('close')),
        btn(`4 · Resolve ${pending ? pending.profileId : 'match'}`, !!pending, () => run('resolve', { matchId: pending.id, resolution: pending.profileId === 'WC-1001' ? 'POSITIVE' : 'FALSE_POSITIVE' })),
        btn('5 · Close + relay events', !!rec && rec.status === 'REVIEWED', () => run('close', { relay: true })),
        el('button', { class: 'btn small secondary', onclick: reset }, 'Reset'));
    }
    function renderSteps() {
      steps.innerHTML = '';
      trace.forEach((e, i) => steps.append(el('li', { class: i === pos ? 'current' : i < pos ? 'past' : '', onclick: () => { clearInterval(timer); go(i); } },
        ringTag(e.ring), ' ', e.text, e.inverted ? el('span', { class: 'badge-inv' }, 'DIP') : null)));
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
      diagram.replay(trace.slice(Math.max(0, i - 6), i + 1).map((x) => x.node));
      stepBox.className = `verdict ${e.error ? 'bad' : e.ok ? 'good' : 'info'}`;
      stepBox.innerHTML = `<div>Step ${i + 1}/${trace.length}: ${Course.escape(e.text)}</div>`
        + `<div style="font-weight:400;font-size:13px;margin-top:4px">Ring: <b>${Clean.RING_LABEL[e.ring]}</b> · File: <code>${Course.escape(cfg.delivery !== 'web' && ['endpoint', 'controller', 'presenter', 'viewmodel'].includes(e.node) ? `(${cfg.delivery === 'cli' ? 'CLI' : 'test'} variant of) ` + fileOf(e, useCase) : fileOf(e, useCase))}</code></div>`
        + (e.inverted ? '<div style="font-weight:400;font-size:13px;margin-top:4px">Control leaves this ring through an interface the inner ring declares, so no inner file imports an outer one.</div>' : '');
      renderSteps();
      steps.children[i]?.scrollIntoView({ block: 'nearest' });
    }
    function autoplay() {
      clearInterval(timer);
      if (!trace.length) return;
      let i = 0;
      go(0);
      timer = setInterval(() => { i++; if (i >= trace.length) { clearInterval(timer); return; } go(i); }, 950);
    }
    reset();
  });

  // ------------------------------------------------------------------ Mission Control: the whole system
  const PRESETS = [
    ['Viktor Albescu · 1961-03-14 · RO (sanctions hit)', VIKTOR],
    ['Viktor Albescu · 1988-07-01 · MD (adverse-media namesake)', { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1988-07-01', country: 'MD' }],
    ['Viktor Albescu · no DOB/country (both profiles match)', { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '', country: '' }],
    ['Dimitri Walenko · 1958-11-30 · CY (alias spelling)', { name: 'Dimitri Walenko', entityType: 'INDIVIDUAL', dateOfBirth: '1958-11-30', country: 'CY' }],
    ['Reyes Quintanar Marisol (word order)', { name: 'Reyes Quintanar Marisol', entityType: 'INDIVIDUAL', dateOfBirth: '', country: 'MX' }],
    ['Orion Shipping Holdings Limited · PA (organisation)', { name: 'Orion Shipping Holdings Limited', entityType: 'ORGANISATION', dateOfBirth: '', country: 'PA' }],
    ['Jane Whitfield · GB (clean)', { name: 'Jane Whitfield', entityType: 'INDIVIDUAL', dateOfBirth: '1980-05-05', country: 'GB' }],
    ['Shape error: blank name, country "GBR" (→ 400 MALFORMED_REQUEST, ring 3)', { name: ' ', entityType: 'INDIVIDUAL', dateOfBirth: '', country: 'GBR' }],
    ['Meaning error: name "1234" (→ 400 INVALID_VALUE, ring 1)', { name: '1234', entityType: 'INDIVIDUAL', dateOfBirth: '', country: '' }],
    ['Meaning error: organisation with DOB (→ 400, ring 1)', { name: 'Golden Crescent Trading', entityType: 'ORGANISATION', dateOfBirth: '2001-01-01', country: 'AE' }],
  ];

  Course.sim('mission-control', (node) => {
    header(node, 'Mission Control – the complete Clean screening service running in your browser',
      'This is the code lab (all four Maven modules) ported to JavaScript. Every button sends the HTTP request the real API on port 8081 accepts. Watch it travel endpoint → controller → interactor → entities → gateways → presenter → view model, and watch the database, outbox and relay. Try to break it: close too early, downgrade your own POSITIVE, switch tenant, replay an Idempotency-Key, simulate a concurrent writer, take the broker down.');
    const sys = Clean.createSystem();
    const ui = { group: 'acme-bank', analyst: 'analyst-anna', speed: 300 };
    let currentCase = null;
    let busy = false;
    const select = (opts, onchange, value) => {
      const s = el('select', { onchange: (e) => onchange(e.target.value) }, opts.map(([v, t]) => el('option', { value: v }, t)));
      if (value != null) s.value = value;
      return s;
    };
    const thresholdLabel = el('b', {}, '80');
    node.append(el('div', { class: 'sim-row' },
      el('label', { class: 'field' }, 'Client group (from the URL)', select([['acme-bank', 'acme-bank'], ['globex-bank', 'globex-bank']], (v) => { ui.group = v; renderAll(); })),
      el('label', { class: 'field' }, 'Analyst (request body)', select([['analyst-anna', 'analyst-anna'], ['analyst-ben', 'analyst-ben']], (v) => { ui.analyst = v; })),
      el('label', { class: 'field' }, el('span', {}, 'screening.matching.threshold = ', thresholdLabel),
        el('input', { type: 'range', min: 50, max: 100, value: 80, oninput: (e) => { sys.threshold = +e.target.value; thresholdLabel.textContent = e.target.value; } })),
      el('label', { class: 'field' }, 'Animation', select([['600', 'slow'], ['300', 'normal'], ['0', 'instant']], (v) => { ui.speed = +v; }, '300')),
      el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:13px' }, el('input', { type: 'checkbox', onchange: (e) => { sys.concurrentWriter = e.target.checked; } }), 'next save meets a concurrent writer'),
      el('label', { style: 'display:flex;gap:6px;align-items:center;font-size:13px' }, el('input', { type: 'checkbox', onchange: (e) => { sys.sinkDown = e.target.checked; } }), 'broker down')));

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
        el('div', { class: 'sim-row' }, el('button', { class: 'btn teal', onclick: () => act('open') }, 'POST open case'),
          el('button', { class: 'btn small secondary', onclick: () => act('queue') }, 'GET work-queue'))),
      el('div', { class: 'panel', style: 'margin-top:12px' }, el('h5', {}, '② Work the case'), caseBox));

    const holder = el('div');
    const diagram = Course.cleanDiagram(holder);
    const reqPre = el('pre', { style: 'max-height:200px;margin:0 0 8px' }, el('code', { class: 'lang-text' }, '…'));
    const resPre = el('pre', { style: 'max-height:280px;margin:0' }, el('code', { class: 'lang-text' }, '…'));
    const log = el('div', { class: 'log', style: 'max-height:470px' });
    const right = el('div', {},
      el('div', { class: 'panel dark' }, el('h5', {}, 'HTTP exchange'), reqPre, resPre),
      el('div', { class: 'panel dark', style: 'margin-top:12px' }, el('h5', {}, 'Trace through the rings'), log));
    node.append(holder, el('div', { class: 'sim-grid mc-grid', style: 'margin-top:12px' }, left, right));

    const tabs = el('div', { class: 'sim-row' });
    const tableBox = el('div', { class: 'scroll-x' });
    let tab = 'screening_case';
    node.append(el('div', { class: 'panel', style: 'margin-top:14px' },
      el('h5', {}, '③ What is actually stored – tables and published events'), tabs, tableBox));
    const cell = (v) => el('td', {}, v == null ? '∅' : String(v));
    function renderTables() {
      tabs.innerHTML = '';
      for (const [id, label] of [['screening_case', 'screening_case'], ['case_match', 'case_match'], ['outbox_event', `outbox_event (${sys.pendingCount()} pending)`], ['idempotency_key', 'idempotency_key'], ['published', `published events (${sys.published.length})`]]) {
        tabs.append(el('button', { class: `btn small ${tab === id ? '' : 'secondary'}`, onclick: () => { tab = id; renderTables(); } }, label));
      }
      tabs.append(el('button', { class: 'btn small amber', onclick: () => act('relay') }, '▶ Run OutboxRelay now'));
      let head = []; let rows = [];
      if (tab === 'screening_case') {
        head = ['id', 'client_group_id', 'party_name', 'status', 'outcome', 'screening_count', 'version'];
        rows = [...sys.db.screening_case.values()].map((r) => [short(r.id), r.clientGroupId, r.partyName, r.status, r.outcome, r.screeningCount, r.version]);
      } else if (tab === 'case_match') {
        head = ['id', 'case_id', 'profile_id', 'category', 'score', 'resolution', 'resolved_by'];
        rows = [...sys.db.case_match.values()].map((m) => [short(m.id), short(m.caseId), m.profileId, m.category, m.score, m.resolution, m.resolvedBy]);
      } else if (tab === 'outbox_event') {
        head = ['id', 'event_type', 'aggregate_id', 'occurred_at', 'published_at'];
        rows = sys.db.outbox_event.map((r) => [short(r.id), r.eventType, short(r.aggregateId), r.occurredAt.slice(11, 19), r.publishedAt ? r.publishedAt.slice(11, 19) : null]);
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
      const r = sys.caseRecord(currentCase);
      caseBox.append(el('div', { style: 'font-size:13px' }, 'Case ', el('code', {}, short(currentCase)), ' owned by ', el('b', {}, r?.clientGroupId || '?')));
      if (r && r.clientGroupId !== ui.group) caseBox.append(el('div', { class: 'verdict bad', style: 'font-size:13px' }, `You are calling as "${ui.group}". CaseLookup will answer 404 – another tenant cannot even learn this case exists.`));
      if (r) {
        caseBox.append(el('div', { class: 'sim-row' }, el('span', { class: `status-pill status-${r.status}` }, r.status),
          r.outcome ? el('span', { class: 'status-pill status-CLOSED' }, r.outcome) : null,
          el('span', { style: 'font-size:13px;color:var(--slate)' }, `screened ×${r.screeningCount} · version ${r.version} · actions [${Clean.allowedActions(r.status).join(', ')}]`)));
      }
      caseBox.append(el('div', { class: 'sim-row' },
        el('button', { class: 'btn small', onclick: () => act('screen') }, 'POST screen'),
        el('button', { class: 'btn small', onclick: () => act('close') }, 'POST close'),
        el('button', { class: 'btn small secondary', onclick: () => act('get') }, 'GET case')));
      const matches = sys.matchesOf(currentCase);
      if (r && r.screeningCount > 0 && !matches.length) caseBox.append(el('div', { style: 'font-size:13px;color:var(--slate)' }, 'No matches at the current threshold.'));
      for (const m of matches) {
        const profile = WC.PROFILES.find((p) => p.id === m.profileId);
        const res = select([['POSITIVE', 'POSITIVE'], ['POSSIBLE', 'POSSIBLE'], ['FALSE_POSITIVE', 'FALSE_POSITIVE'], ['UNRESOLVED', 'UNRESOLVED (shape error)']], () => {});
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
      if (kind === 'open') {
        const body = { name: f.name.value, entityType: f.type.value, dateOfBirth: f.dob.value || null, country: f.country.value || null };
        return { method: 'POST', path: base, headers: f.key.value ? { 'Idempotency-Key': f.key.value } : {}, body };
      }
      if (kind === 'queue') return { method: 'GET', path: `/api/v1/client-groups/${ui.group}/work-queue`, headers: {}, body: null };
      if (kind === 'screen') return { method: 'POST', path: `${base}/${currentCase}/screenings`, headers: {}, body: null };
      if (kind === 'close') return { method: 'POST', path: `${base}/${currentCase}/closure`, headers: {}, body: { analystId: ui.analyst } };
      if (kind === 'get') return { method: 'GET', path: `${base}/${currentCase}`, headers: {}, body: null };
      return { method: 'PUT', path: `${base}/${currentCase}/matches/${extra.matchId}/resolution`, headers: {}, body: { resolution: extra.resolution, rationale: extra.rationale, analystId: ui.analyst } };
    }
    async function play(events) {
      diagram.clear();
      for (const e of events) {
        diagram.step(e.node);
        logLine(log, e);
        if (ui.speed) await sleep(ui.speed);
      }
    }
    async function act(kind, extra = {}) {
      if (busy) return;
      if (['screen', 'close', 'get', 'resolve'].includes(kind) && !currentCase) return;
      busy = true;
      const events = [];
      sys.onTrace((e) => events.push(e));
      log.append(el('div', { style: 'color:#E9A23B;border-bottom:1px solid #E9A23B' }, `── ${new Date().toLocaleTimeString()} ${kind.toUpperCase()} ──`));
      if (kind === 'relay') {
        sys.relay();
        await play(events);
        renderTables(); busy = false; return;
      }
      const req = buildRequest(kind, extra);
      reqPre.querySelector('code').textContent = `${req.method} ${req.path}\n${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}\n`).join('')}${req.body ? 'Content-Type: application/json\n\n' + json(req.body) : ''}`;
      const res = sys.http(req);
      if (kind === 'open' && res.status < 300) currentCase = res.body.caseId;
      await play(events);
      resPre.querySelector('code').textContent = Course.presenters.rest.render(res);
      resPre.style.borderLeft = `5px solid ${res.status < 300 ? '#3C9D5D' : res.status < 500 ? '#C8553D' : '#6D5BD0'}`;
      renderAll();
      node.querySelectorAll('input[type=checkbox]')[0].checked = sys.concurrentWriter;
      busy = false;
    }
    renderAll();
  });

  // ------------------------------------------------------------------ presenter lab: one response model, many presenters
  Course.sim('presenter-lab', (node) => {
    header(node, 'Presenter lab – one interactor, four delivery mechanisms',
      'The interactor below is <b>the same object</b> every time. It calls one method on its output boundary. Pick the outcome, then compare what four presenters (all in ring 3) make of the same call. Status codes, HTML, CSV columns and exit codes are presentation decisions, so none of them appear in ring 2.');
    const sys = Clean.createSystem();
    const g = 'acme-bank';
    const base = `/api/v1/client-groups/${g}/cases`;
    const opened = sys.http({ method: 'POST', path: base, body: VIKTOR }).body.caseId;
    const created = Clean.caseResponse(sys.gateways.caseGateway.findById(opened));
    const screenedId = sys.http({ method: 'POST', path: base, body: VIKTOR }).body.caseId;
    sys.http({ method: 'POST', path: `${base}/${screenedId}/screenings` });
    const screened = Clean.caseResponse(sys.gateways.caseGateway.findById(screenedId));
    const OUTCOMES = [
      ['Case opened (new)', 'presentOpened', [created, true], 'OpenCaseInteractor after COMMIT, newlyOpened = true'],
      ['Case opened (idempotent replay)', 'presentOpened', [created, false], 'OpenCaseInteractor found the Idempotency-Key, newlyOpened = false'],
      ['Case screened, 3 matches', 'presentCase', [screened], 'ScreenCaseInteractor after COMMIT'],
      ['Rule violation: close too early', 'presentRuleViolation', ['MATCHES_AWAITING_REVIEW', `3 match(es) are unresolved or possible on case ${screenedId}`], 'Outcomes.presentingFailures caught DomainException from ScreeningCase.close()'],
      ['Invalid value: bad case id', 'presentInvalidRequest', ['INVALID_VALUE', 'Case id must be a UUID: not-a-uuid'], 'CaseId.of(…) threw DomainException(INVALID_VALUE)'],
      ['Not found / other tenant', 'presentNotFound', [screenedId], 'CaseLookup.load threw CaseNotFoundException'],
      ['Concurrent update', 'presentConflict', [screenedId], 'CaseGateway.save threw ConcurrentCaseUpdateException'],
    ];
    let pick = 2;
    const callBox = el('pre', {}, el('code', { class: 'lang-java' }));
    const grid = el('div', { class: 'sim-grid cols-2' });
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Use-case outcome', el('select', { onchange: (e) => { pick = +e.target.value; render(); } }, OUTCOMES.map(([t], i) => el('option', { value: i, selected: i === pick }, t))))),
      el('div', { class: 'panel' }, el('h5', {}, 'Ring 2 – the call the interactor makes (identical for every presenter)'), callBox), grid,
      el('p', { class: 'sim-intro' }, 'Adding the CSV or CLI presenter is a ring-3 change plus a ring-4 entry point. Nothing in screening-usecases or screening-entities is recompiled – that is what "the inner rings don\'t know the delivery mechanism" buys you.'));
    function render() {
      const [, method, args, why] = OUTCOMES[pick];
      const shown = args.map((a) => (typeof a === 'object' ? `CaseResponse[caseId=${short(a.caseId)}…, status=${a.status}, matches=${a.matches.length}]` : typeof a === 'boolean' ? String(a) : `"${a}"`));
      callBox.querySelector('code').textContent = `// ${why}\npresenter.${method}(${shown.join(', ')});`;
      grid.innerHTML = '';
      for (const [, p] of Object.entries(Course.presenters)) {
        const presenter = p.make();
        presenter[method](...args);
        grid.append(el('div', { class: 'panel dark' }, el('h5', {}, p.name), el('pre', { style: 'margin:0;max-height:260px' }, el('code', { class: 'lang-text' }, p.render(presenter.result())))));
      }
    }
    render();
  });

  // ------------------------------------------------------------------ control flow vs source-code dependency
  Course.sim('control-vs-dependency', (node) => {
    header(node, 'Control flow vs source-code dependency – three designs, one build',
      'The interactor must save a case and then hand the result to the web layer. Control flows <b>outward</b> both times. Pick a design, look at which way the <code>import</code> arrows point, then press <i>mvn install</i>. Orange arrows are runtime calls; black arrows are compile-time imports; red means an import points outward.');
    const DESIGNS = {
      direct: {
        name: 'A · Interactor imports SqlCaseGateway and returns CaseJson',
        code: `// screening-usecases\nimport training.clean.screening.adapters.persistence.SqlCaseGateway;   // ring 3!\nimport training.clean.screening.adapters.web.CaseJson;                  // ring 3!\n\npublic final class ScreenCaseInteractor {\n    private final SqlCaseGateway cases;\n    public CaseJson execute(ScreenCaseRequest request) { … }\n}`,
        deps: [['uc', 'sql', true], ['uc', 'json', true], ['sql', 'ent', false]],
        build: `[ERROR] The projects in the reactor contain a cyclic reference:\n  Edge between 'Vertex{label='training.clean:screening-interface-adapters'}'\n  and 'Vertex{label='training.clean:screening-usecases'}' introduces a cycle\n  in the graph training.clean:screening-usecases --> screening-interface-adapters\n  --> training.clean:screening-usecases\n[INFO] BUILD FAILURE`,
        ok: false,
        verdict: 'Maven refuses: adapters already depend on use cases, so the reverse import creates a cycle. In a single-module project this would compile – which is exactly why the lab uses one module per ring.',
      },
      ret: {
        name: 'B · Gateway interface in ring 2, interactor returns CaseResponse',
        code: `// screening-usecases\npublic interface CaseGateway { Optional<ScreeningCase> findById(CaseId id); void save(ScreeningCase c); }\n\npublic final class ScreenCaseInteractor {\n    private final CaseGateway cases;               // owned by ring 2\n    public CaseResponse execute(ScreenCaseRequest request) { … }   // controller maps it\n}`,
        deps: [['sql', 'gw', false], ['uc', 'gw', false], ['ctl', 'uc', false]],
        build: '[INFO] screening-entities ............ SUCCESS\n[INFO] screening-usecases ............ SUCCESS\n[INFO] screening-interface-adapters .. SUCCESS\n[INFO] screening-app ................. SUCCESS\n[INFO] BUILD SUCCESS',
        ok: true,
        verdict: 'Legal Clean Architecture and a common simplification. The controller must catch exceptions to choose 404/409/422, so status decisions spread across the controller and an exception handler. Fine for small services; the trade-off is that the controller gains presentation logic.',
      },
      dip: {
        name: 'C · Gateway + output boundary both owned by ring 2 (the lab)',
        code: `// screening-usecases\npublic interface CaseGateway { … }\npublic interface CaseOutputBoundary { void presentCase(CaseResponse r); void presentNotFound(String id); … }\n\npublic final class ScreenCaseInteractor implements ScreenCase {\n    public void execute(ScreenCaseRequest request, CaseOutputBoundary presenter) { … }\n}\n// screening-interface-adapters\npublic final class CasePresenter implements CaseOutputBoundary { … }`,
        deps: [['sql', 'gw', false], ['uc', 'gw', false], ['pre', 'out', false], ['uc', 'out', false]],
        build: '[INFO] screening-entities ............ SUCCESS\n[INFO] screening-usecases ............ SUCCESS\n[INFO] screening-interface-adapters .. SUCCESS\n[INFO] screening-app ................. SUCCESS\n[INFO] BUILD SUCCESS   (ArchUnit: 6 rules passed)',
        ok: true,
        verdict: 'Both outward calls go through interfaces ring 2 declares. Every outcome – success, 400, 404, 409, 422 – is a method on the output boundary, so the presenter is the only place that knows status codes. This is the lab\'s design.',
      },
    };
    const BOX = { ent: [40, 140, 150, 50, 'ScreeningCase', 'entity'], uc: [250, 140, 170, 50, 'ScreenCaseInteractor', 'usecase'], gw: [250, 40, 170, 44, '«CaseGateway»', 'usecase'], out: [250, 240, 170, 44, '«CaseOutputBoundary»', 'usecase'], sql: [500, 40, 160, 44, 'SqlCaseGateway', 'iadapter'], pre: [500, 240, 160, 44, 'CasePresenter', 'iadapter'], json: [500, 140, 160, 50, 'CaseJson', 'iadapter'], ctl: [500, 320, 160, 40, 'CaseController', 'iadapter'] };
    const COLOR = { entity: '#C99A1E', usecase: '#E07A5F', iadapter: '#5FAD56' };
    const CONTROL = { direct: [['uc', 'sql'], ['uc', 'json']], ret: [['uc', 'gw'], ['gw', 'sql'], ['uc', 'ctl']], dip: [['uc', 'gw'], ['gw', 'sql'], ['uc', 'out'], ['out', 'pre']] };
    let design = 'direct';
    const svgBox = el('div', { class: 'cleanlive' });
    const codeBox = el('pre', {}, el('code', { class: 'lang-java' }));
    const buildBox = el('pre', {}, el('code', { class: 'lang-text' }, '$ mvn -q install'));
    const verdict = el('div');
    const buttons = el('div', { class: 'sim-row' });
    node.append(buttons, el('div', { class: 'sim-grid cols-2' }, el('div', {}, svgBox, codeBox),
      el('div', {}, el('button', { class: 'btn amber', onclick: build }, '▶ mvn install'), buildBox, verdict)));
    const mid = (k) => { const [x, y, w, h] = BOX[k]; return [x + w / 2, y + h / 2]; };
    function edge(a, b, cls, bend) {
      const [x1, y1] = mid(a); const [x2, y2] = mid(b);
      const mx = (x1 + x2) / 2 + bend; const my = (y1 + y2) / 2 - bend;
      return `<path d="M${x1},${y1} Q${mx},${my} ${x2},${y2}" ${cls}/>`;
    }
    function render() {
      buttons.innerHTML = '';
      for (const [k, d] of Object.entries(DESIGNS)) buttons.append(el('button', { class: `btn small ${k === design ? '' : 'secondary'}`, onclick: () => { design = k; render(); } }, d.name));
      const d = DESIGNS[design];
      const used = new Set([...d.deps.flatMap(([a, b]) => [a, b]), ...CONTROL[design].flat(), 'ent', 'uc']);
      let s = '<svg viewBox="0 0 700 380" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, Arial, sans-serif">'
        + '<defs><marker id="cvd-dep" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#1D2733"/></marker>'
        + '<marker id="cvd-bad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#C8553D"/></marker>'
        + '<marker id="cvd-ctl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#E9A23B"/></marker></defs>'
        + '<rect x="0" y="0" width="225" height="380" fill="#FDF5DE"/><rect x="225" y="0" width="245" height="380" fill="#FCEDE8"/><rect x="470" y="0" width="230" height="380" fill="#ECF6EA"/>'
        + '<text x="10" y="372" font-size="11" font-weight="800" fill="#8A6A12">ENTITIES</text><text x="235" y="372" font-size="11" font-weight="800" fill="#9C3D24">USE CASES</text><text x="480" y="372" font-size="11" font-weight="800" fill="#2F6B28">INTERFACE ADAPTERS</text>';
      for (const [k, [x, y, w, h, label, ring]] of Object.entries(BOX)) {
        if (!used.has(k)) continue;
        const dash = label.startsWith('«') ? ' stroke-dasharray="5 3"' : '';
        s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#fff" stroke="${COLOR[ring]}" stroke-width="2"${dash}/><text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#1D2733">${label}</text>`;
      }
      for (const [a, b] of CONTROL[design]) s += edge(a, b, 'fill="none" stroke="#E9A23B" stroke-width="3" stroke-dasharray="8 5" marker-end="url(#cvd-ctl)"', 18);
      for (const [a, b, bad] of d.deps) s += edge(a, b, `fill="none" stroke="${bad ? '#C8553D' : '#1D2733'}" stroke-width="${bad ? 3 : 2}" marker-end="url(#${bad ? 'cvd-bad' : 'cvd-dep'})"`, -18);
      s += '</svg>';
      svgBox.innerHTML = s;
      codeBox.querySelector('code').textContent = d.code;
      buildBox.querySelector('code').textContent = '$ mvn -q install';
      verdict.innerHTML = '';
    }
    function build() {
      const d = DESIGNS[design];
      buildBox.querySelector('code').textContent = `$ mvn -q install\n${d.build}`;
      buildBox.style.borderLeft = `5px solid ${d.ok ? '#3C9D5D' : '#C8553D'}`;
      verdict.innerHTML = '';
      verdict.append(el('div', { class: `verdict ${d.ok ? 'good' : 'bad'}` }, d.ok ? 'Builds' : 'Does not build'), el('p', { style: 'font-size:14.5px' }, d.verdict));
    }
    render();
  });

  // ------------------------------------------------------------------ request pipeline driven by the real model
  Course.sim('request-pipeline', (node) => {
    header(node, 'Request pipeline – which ring said no?',
      'Each request below is sent through the real browser model. The stages light up from the trace it produced, and the request stops where a ring answered. Learn to read a status code and know immediately which ring – and which file – made the decision.');
    const STAGES = [
      ['router', 'framework', 'Netty + router', 'CaseEndpoint route table (compile-time). No route → Micronaut 404, no ring-3 code runs.'],
      ['binding', 'framework', 'Serde binding', 'JSON → Forms record. Unparseable JSON or a bad LocalDate → MalformedBodyHandler → 400 "body: cannot be read".'],
      ['shape', 'iadapter', 'Controller shape check', 'Forms.errors(): present, right format, right length. Failure → 400 MALFORMED_REQUEST; no use case runs.'],
      ['boundary', 'usecase', 'Input boundary', 'The controller calls OpenCase / ScreenCase … with a request model of plain strings.'],
      ['values', 'entity', 'Value objects', 'ClientGroupId, CaseId, PartyName, Party… validate meaning. Failure → presentInvalidRequest → 400 INVALID_VALUE.'],
      ['lookup', 'usecase', 'Interactor + CaseLookup', 'Application rules: tenant check (404), transaction boundaries, idempotency, ordering.'],
      ['rules', 'entity', 'Aggregate rules', 'ScreeningCase invariants: four-eyes, closure, rationale. Failure → presentRuleViolation → 422.'],
      ['gateways', 'iadapter', 'Gateways + drivers', 'SqlCaseGateway → Micronaut records → H2. Stale version → ConcurrentCaseUpdateException → 409.'],
      ['presenter', 'iadapter', 'Presenter', 'Turns the outcome into a ViewModel: status, Location, labels, problem+json.'],
      ['response', 'framework', 'Responses.of(viewModel)', 'Copies status, headers and body. Makes no decisions.'],
    ];
    const STAGE_OF = (e, seen) => {
      if (e.node === 'client') return null;
      if (e.node === 'endpoint') return seen.has('router') ? 'response' : 'router';
      if (e.node === 'binding') return 'binding';
      if (e.node === 'controller') return 'shape';
      if (e.node === 'boundary') return 'boundary';
      if (e.node === 'entity' || e.node === 'policy') return /value object|validated/.test(e.text) ? 'values' : 'rules';
      if (e.node === 'interactor' && /DomainException/.test(e.text)) return /INVALID_VALUE/.test(e.text) ? 'values' : 'rules';
      if (e.node === 'interactor' || e.node === 'gw-tx' || e.node === 'tx' || e.node === 'gw-idem' || e.node === 'idem') return 'lookup';
      if (['gw-case', 'sql-gw', 'records', 'db', 'gw-outbox', 'outbox-gw', 'gw-ref', 'ref-gw', 'gw-queue', 'queue'].includes(e.node)) return 'gateways';
      if (['presenter', 'output', 'response'].includes(e.node)) return 'presenter';
      return null;
    };
    const sys = Clean.createSystem();
    const g = '/api/v1/client-groups/acme-bank';
    const fresh = () => sys.http({ method: 'POST', path: `${g}/cases`, body: VIKTOR }).body.caseId;
    const screened = () => { const id = fresh(); sys.http({ method: 'POST', path: `${g}/cases/${id}/screenings` }); return id; };
    const SCENARIOS = [
      ['Valid open-case request', () => ({ method: 'POST', path: `${g}/cases`, body: VIKTOR })],
      ['DELETE a case (no such route)', () => ({ method: 'DELETE', path: `${g}/cases/${fresh()}` })],
      ['Body is not JSON: {"name": ', () => ({ method: 'POST', path: `${g}/cases`, body: '{"name": ' })],
      ['dateOfBirth "1961-02-30"', () => ({ method: 'POST', path: `${g}/cases`, body: { ...VIKTOR, dateOfBirth: '1961-02-30' } })],
      ['Blank name, entityType "ROBOT"', () => ({ method: 'POST', path: `${g}/cases`, body: { name: '', entityType: 'ROBOT' } })],
      ['Name "1234" (no letters)', () => ({ method: 'POST', path: `${g}/cases`, body: { name: '1234', entityType: 'INDIVIDUAL' } })],
      ['GET /cases/not-a-uuid', () => ({ method: 'GET', path: `${g}/cases/not-a-uuid` })],
      ['GET a case owned by another client group', () => ({ method: 'GET', path: `/api/v1/client-groups/globex-bank/cases/${fresh()}` })],
      ['Close a case with UNRESOLVED matches', () => ({ method: 'POST', path: `${g}/cases/${screened()}/closure`, body: { analystId: 'ana' } })],
      ['Screen while another analyst commits', () => { const id = fresh(); sys.concurrentWriter = true; return { method: 'POST', path: `${g}/cases/${id}/screenings` }; }],
      ['Work queue with limit=500', () => ({ method: 'GET', path: `${g}/work-queue?limit=500` })],
    ];
    const list = el('ol', { class: 'step-list' });
    const verdict = el('div');
    const pick = el('select', { onchange: () => run(+pick.value) }, SCENARIOS.map(([t], i) => el('option', { value: i }, t)));
    node.append(el('div', { class: 'sim-row' }, el('label', { class: 'field' }, 'Request', pick), el('button', { class: 'btn small amber', onclick: () => run(+pick.value) }, '▶ Send')),
      el('div', { class: 'sim-grid cols-2' }, el('div', { class: 'panel' }, el('h5', {}, 'Pipeline'), list), verdict));
    let timer;
    function run(i) {
      clearInterval(timer);
      const req = SCENARIOS[i][1]();
      const trace = [];
      sys.onTrace((e) => trace.push(e));
      const res = sys.http(req);
      sys.onTrace(() => {});
      const seen = new Set();
      let decided = null;
      for (const e of trace) {
        const st = STAGE_OF(e, seen);
        if (!st) continue;
        seen.add(st);
        if (e.error && !decided && e.node !== 'tx') decided = st;
      }
      const path = STAGES.map((s) => s[0]).filter((s) => seen.has(s));
      if (!decided) decided = res.status >= 400 ? path[path.length - 1] : 'presenter';
      let k = 0;
      verdict.innerHTML = '';
      const tick = () => {
        list.innerHTML = '';
        STAGES.forEach(([id, ring, name, desc]) => {
          const idx = path.indexOf(id);
          const cls = idx === -1 || idx > k ? '' : idx === k ? 'current' : 'past';
          list.append(el('li', { class: cls, style: idx === -1 && k >= path.length - 1 ? 'opacity:.35' : '' }, ringTag(ring), ' ', el('b', {}, name), el('div', { style: 'font-size:12.5px;color:var(--slate)' }, desc)));
        });
        if (k >= path.length - 1) {
          clearInterval(timer);
          const stage = STAGES.find((s) => s[0] === decided);
          verdict.append(el('div', { class: `verdict ${res.status < 400 ? 'good' : 'bad'}`, style: 'font-size:22px' }, `HTTP ${res.status}${res.body && res.body.rule ? ' · ' + res.body.rule : ''}`),
            el('p', {}, 'Decided in ', ringTag(stage[1]), ' ', el('b', {}, stage[2])),
            el('pre', { style: 'max-height:220px' }, el('code', { class: 'lang-text' }, json(res.body))));
        }
        k++;
      };
      tick();
      timer = setInterval(tick, 380);
    }
    run(0);
  });

  // ------------------------------------------------------------------ optimistic locking race
  Course.sim('concurrency', (node) => {
    header(node, 'Two analysts, one case – optimistic locking across the rings',
      'Anna and Ben both load the same case through <code>CaseGateway</code> (one UNRESOLVED match). Each decides something different. Choose the order of saves and whether <code>MicronautCaseRecords</code> checks the version. With the check, ring 4\'s <code>OptimisticLockException</code> becomes ring 3\'s <code>StaleRecordException</code>, then ring 2\'s <code>ConcurrentCaseUpdateException</code>, then the presenter\'s 409. Without it, the second save silently overwrites the first.');
    const out = el('div');
    const log = el('div', { class: 'log' });
    let locking = true;
    const toggle = el('label', { style: 'display:flex;gap:8px;align-items:center;font-size:14px' },
      el('input', { type: 'checkbox', checked: true, onchange: (e) => { locking = e.target.checked; reset(); } }), 'MicronautCaseRecords checks @Version (WHERE version = ?)');
    let sys; let caseId; let anna; let ben; let matchId;
    const annaBox = el('div', { class: 'panel' });
    const benBox = el('div', { class: 'panel' });
    node.append(el('div', { class: 'sim-row' }, toggle, el('button', { class: 'btn small secondary', onclick: () => reset() }, 'Reset')),
      el('div', { class: 'sim-grid cols-2' }, annaBox, benBox), out, el('div', { class: 'panel dark' }, el('h5', {}, 'What each ring did'), log));
    function reset() {
      sys = Clean.createSystem();
      sys.versionCheck = locking;
      const g = '/api/v1/client-groups/acme-bank/cases';
      caseId = sys.http({ method: 'POST', path: g, body: VIKTOR }).body.caseId;
      matchId = sys.http({ method: 'POST', path: `${g}/${caseId}/screenings` }).body.matches[0].matchId;
      sys.onTrace((e) => { if (['records', 'sql-gw', 'tx'].includes(e.node)) logLine(log, e); });
      log.innerHTML = '';
      anna = { c: sys.gateways.caseGateway.findById(caseId) };
      ben = { c: sys.gateways.caseGateway.findById(caseId) };
      log.append(el('div', {}, `-- both analysts loaded version ${sys.caseRecord(caseId).version}`));
      render();
    }
    function save(who) {
      const s = who === 'anna' ? anna : ben;
      if (s.saved) return;
      const now = new Date().toISOString();
      if (who === 'anna') s.c.resolveMatch(matchId, 'POSITIVE', 'DOB and country match exactly', 'analyst-anna', now);
      else s.c.resolveMatch(matchId, 'FALSE_POSITIVE', 'Different middle name in passport', 'analyst-ben', now);
      const presenter = new Clean.CasePresenter((n, text, extra) => logLine(log, { node: n, ring: 'iadapter', text, ...extra }));
      try {
        sys.gateways.transactions.write(() => { sys.gateways.caseGateway.save(s.c); sys.gateways.outboxGateway.append(s.c.pullEvents()); });
        presenter.presentCase(Clean.caseResponse(s.c));
        s.saved = 'ok';
      } catch (e) {
        if (!(e instanceof Clean.ConcurrentUpdate)) throw e;
        presenter.presentConflict(caseId);
        s.saved = 'conflict';
      }
      render();
    }
    function render() {
      const stored = sys.matchesOf(caseId).find((m) => m.id === matchId);
      for (const [box, who, s, decision] of [[annaBox, 'anna', anna, 'POSITIVE'], [benBox, 'ben', ben, 'FALSE_POSITIVE']]) {
        box.innerHTML = '';
        box.append(el('h5', {}, who === 'anna' ? 'Analyst Anna' : 'Analyst Ben'),
          el('div', { style: 'font-size:14px' }, 'Loaded the case · decides ', el('span', { class: `status-pill res-${decision}` }, decision)),
          s.saved === 'ok' ? el('div', { class: 'verdict good' }, '200 OK – saved')
            : s.saved === 'conflict' ? el('div', { class: 'verdict bad' }, '409 Conflict · CONCURRENT_UPDATE – reload, see the other decision, decide again')
              : el('button', { class: 'btn small', onclick: () => save(who) }, `Save ${who === 'anna' ? 'Anna' : 'Ben'}'s decision`));
      }
      out.innerHTML = '';
      out.append(el('div', { class: 'verdict info' }, `Stored now: version ${sys.caseRecord(caseId).version}, match `, el('span', { class: `status-pill res-${stored.resolution}` }, stored.resolution), stored.resolvedBy ? ` by ${stored.resolvedBy}` : ''));
      if (anna.saved && ben.saved) {
        const events = sys.db.outbox_event.filter((r) => r.eventType === 'MatchResolved').length;
        out.append(locking
          ? el('div', { class: 'verdict good' }, 'One decision won; the other analyst was told by a 409. The outbox holds one MatchResolved per committed decision. Note who translated what: ring 4 knows Micronaut\'s exception, ring 3 knows records, ring 2 knows only its own ConcurrentCaseUpdateException.')
          : el('div', { class: 'verdict bad' }, `Lost update: both saves "succeeded", ${events} MatchResolved events are in the outbox, but the stored case only shows the last writer. If Anna's POSITIVE was overwritten by a FALSE_POSITIVE, a sanctioned person was just cleared – and four-eyes never ran, because Ben's aggregate never saw Anna's decision.`));
      }
    }
    reset();
  });

  // ------------------------------------------------------------------ outbox crash points
  Course.sim('outbox-crash', (node) => {
    header(node, 'Crash-point simulator – dual write vs transactional outbox',
      'In the lab, <code>CloseCaseInteractor</code> calls <code>cases.save</code> and <code>outbox.append</code> inside one <code>transactions.write</code>. Choose a strategy and the moment the process dies. The simulator replays the steps and shows whether the database and the event stream agree afterwards.');
    const STRATS = {
      dual: { name: 'Dual write (interactor calls a Publisher gateway after commit)', steps: ['BEGIN', 'UPDATE screening_case', 'COMMIT', 'publisher.publish(CaseClosed)', 'presenter.presentCase → 200'] },
      dualInside: { name: 'Publish inside the transaction', steps: ['BEGIN', 'UPDATE screening_case', 'publisher.publish(CaseClosed)', 'COMMIT', 'presenter.presentCase → 200'] },
      outbox: { name: 'Transactional outbox + OutboxRelay (the lab)', steps: ['BEGIN', 'UPDATE screening_case', 'INSERT outbox_event', 'COMMIT', 'presenter.presentCase → 200', 'relay: SELECT unpublished', 'relay: sink.publish', 'relay: UPDATE published_at'] },
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
        committed = has('COMMIT'); published = has('publisher.publish(CaseClosed)');
        if (crashAt === steps.length + 1) note = 'No crash: works on a good day. That is why dual writes survive code review.';
      } else if (strat === 'dualInside') {
        published = has('publisher.publish(CaseClosed)'); committed = has('COMMIT');
        if (published && !committed) note = 'Downstream systems were told the case closed. The database rolled back. Nobody can un-send that message.';
      } else {
        committed = has('COMMIT');
        published = committed;
        if (committed && !has('relay: UPDATE published_at') && has('relay: sink.publish')) note = 'The relay crashed after publishing but before marking the row: on restart it publishes again. Consumers see a duplicate with the same eventId and must de-duplicate (idempotent consumer).';
        else if (committed && !has('relay: sink.publish')) note = 'The row is safely in outbox_event. When the relay restarts it finds it and publishes. Delay, not loss.';
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
        el('div', { class: `verdict ${consistent ? 'good' : 'bad'}` }, consistent ? 'Consistent' : committed ? 'INCONSISTENT – state changed, event lost forever.' : 'INCONSISTENT – event published for a change that never happened.'),
        note ? el('p', { style: 'font-size:14.5px' }, note) : null,
        el('p', { style: 'font-size:13px;color:var(--slate)' }, 'Clean Architecture note: the interactor only knows EventOutboxGateway. Whether a row is written or a broker is called is a ring-3/4 decision – but the transaction boundary is an application rule, so TransactionRunner is a ring-2 interface.'));
    }
    render();
  });
})();
