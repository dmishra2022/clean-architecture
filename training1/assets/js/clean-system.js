/* JavaScript port of rings 2-4 of the code lab (screening-usecases, screening-interface-adapters, screening-app).
   Mirrors the Java class by class so the simulators show the real flow of control:
   endpoint → controller → input boundary → interactor → entities / gateways → output boundary → presenter → view model.
   Every step emits a trace event tagged with its ring and with the Java file it corresponds to. */
(function () {
  const Clean = {};
  window.Clean = Clean;

  Clean.RING_LABEL = { entity: 'ENTITIES', usecase: 'USE CASES', iadapter: 'ADAPTERS', framework: 'FRAMEWORK', main: 'MAIN', outside: 'OUTSIDE' };

  // node id → [ring, Java file]
  Clean.NODES = {
    client: ['outside', 'outside the service (analyst UI, curl, another system)'],
    endpoint: ['framework', 'screening-app/…/app/web/CaseEndpoint.java'],
    binding: ['framework', 'Micronaut Serde + MalformedBodyHandler.java (screening-app)'],
    controller: ['iadapter', 'screening-interface-adapters/…/adapters/web/CaseController.java + Forms.java'],
    boundary: ['usecase', 'screening-usecases/…/usecases/<usecase>/<UseCase>.java (input boundary)'],
    interactor: ['usecase', 'screening-usecases/…/usecases/<usecase>/<UseCase>Interactor.java'],
    entity: ['entity', 'screening-entities/…/entities/model/ScreeningCase.java'],
    policy: ['entity', 'screening-entities/…/entities/policy/NameMatchingPolicy.java'],
    'gw-case': ['usecase', 'screening-usecases/…/usecases/gateway/CaseGateway.java (interface)'],
    'gw-outbox': ['usecase', 'screening-usecases/…/usecases/gateway/EventOutboxGateway.java (interface)'],
    'gw-ref': ['usecase', 'screening-usecases/…/usecases/gateway/ReferenceDataGateway.java (interface)'],
    'gw-tx': ['usecase', 'screening-usecases/…/usecases/gateway/TransactionRunner.java (interface)'],
    'gw-idem': ['usecase', 'screening-usecases/…/usecases/gateway/IdempotencyGateway.java (interface)'],
    'gw-queue': ['usecase', 'screening-usecases/…/usecases/workqueue/WorkQueueGateway.java (interface)'],
    'sql-gw': ['iadapter', 'screening-interface-adapters/…/adapters/persistence/SqlCaseGateway.java + CaseRecordMapper.java'],
    'outbox-gw': ['iadapter', 'screening-interface-adapters/…/adapters/events/OutboxEventGateway.java + EventJson.java'],
    'ref-gw': ['iadapter', 'screening-interface-adapters/…/adapters/reference/InMemoryReferenceData.java'],
    records: ['framework', 'screening-app/…/app/persistence/MicronautCaseRecords.java + MicronautOutboxRecords.java'],
    tx: ['framework', 'screening-app/…/app/persistence/MicronautTransactionRunner.java'],
    idem: ['framework', 'screening-app/…/app/persistence/JdbcIdempotencyGateway.java'],
    queue: ['framework', 'screening-app/…/app/persistence/JdbcWorkQueueGateway.java'],
    db: ['framework', 'H2 in-memory database (Flyway V1__screening_schema.sql)'],
    response: ['usecase', 'screening-usecases/…/usecases/shared/CaseResponse.java (response model)'],
    output: ['usecase', 'screening-usecases/…/usecases/shared/CaseOutputBoundary.java (interface)'],
    presenter: ['iadapter', 'screening-interface-adapters/…/adapters/web/CasePresenter.java'],
    viewmodel: ['iadapter', 'screening-interface-adapters/…/adapters/web/ViewModel.java + CaseJson / ProblemJson'],
    relay: ['iadapter', 'screening-interface-adapters/…/adapters/events/OutboxRelay.java'],
    scheduler: ['framework', 'screening-app/…/app/events/ScheduledOutboxRelay.java'],
    sink: ['framework', 'screening-app/…/app/events/LoggingEventSink.java'],
    main: ['main', 'screening-app/…/app/config/MainWiring.java'],
  };

  class CaseNotFound extends Error { constructor(id) { super('Case not found: ' + id); this.caseId = id; } }
  class ConcurrentUpdate extends Error { constructor(id) { super(`Case ${id} was changed by someone else; reload and retry`); this.caseId = id; } }
  class StaleRecord extends Error { constructor(id) { super(`Row ${id} has a newer version`); } }
  Clean.CaseNotFound = CaseNotFound;
  Clean.ConcurrentUpdate = ConcurrentUpdate;

  const ENTITY_TYPES = ['INDIVIDUAL', 'ORGANISATION'];
  const RESOLUTIONS = ['FALSE_POSITIVE', 'POSITIVE', 'POSSIBLE'];
  const STATUS_LABELS = { CREATED: 'Not screened yet', PENDING_REVIEW: 'Waiting for analyst review', REVIEWED: 'Reviewed, ready to close', CLOSED: 'Closed' };
  const CATEGORY_LABELS = { SANCTIONS: 'Sanctions', PEP: 'Politically exposed person', LAW_ENFORCEMENT: 'Law enforcement', ADVERSE_MEDIA: 'Adverse media' };
  const short = (id) => (id ? String(id).slice(0, 8) : '');

  /** Micronaut Serde with inclusion non_null: nulls disappear, empty lists stay. */
  Clean.nonNull = function nonNull(v) {
    if (Array.isArray(v)) return v.map(nonNull);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => x != null).map(([k, x]) => [k, nonNull(x)]));
    return v;
  };

  // ---------------------------------------------------------------- ring 3: presenters, view models, forms
  Clean.allowedActions = (status) => ({ CREATED: ['screen'], PENDING_REVIEW: ['screen', 'resolve'], REVIEWED: ['screen', 'resolve', 'close'] }[status] || []);
  Clean.locationOf = (r) => `/api/v1/client-groups/${r.clientGroupId}/cases/${r.caseId}`;
  const problem = (status, title, detail, rule, errors) => ({ type: 'about:blank', title, status, detail, rule: rule ?? null, errors: errors ?? null });
  const vm = (status, contentType, location, body) => ({ status, contentType, location: location ?? null, body });
  const JSON_T = 'application/json';
  const PROBLEM_T = 'application/problem+json';
  Clean.malformed = (errors) => vm(400, PROBLEM_T, null, problem(400, 'Malformed request', errors.join('; '), 'MALFORMED_REQUEST', errors));

  Clean.caseJson = (r) => ({
    caseId: r.caseId, clientGroupId: r.clientGroupId, partyName: r.partyName, entityType: r.entityType, dateOfBirth: r.dateOfBirth, country: r.country,
    status: r.status, statusLabel: STATUS_LABELS[r.status] || r.status, outcome: r.outcome, screeningCount: r.screeningCount,
    openedAt: r.openedAt, lastScreenedAt: r.lastScreenedAt, closedAt: r.closedAt, closedBy: r.closedBy, allowedActions: Clean.allowedActions(r.status),
    matches: r.matches.map((m) => ({ matchId: m.matchId, profileId: m.profileId, category: m.category, categoryLabel: CATEGORY_LABELS[m.category] || m.category, matchedName: m.matchedName, score: m.score, resolution: m.resolution, rationale: m.rationale, resolvedBy: m.resolvedBy, resolvedAt: m.resolvedAt })),
  });

  /** CasePresenter: the only place that knows about status codes, Location, labels and problem details. */
  Clean.CasePresenter = class {
    constructor(t = () => {}) { this.t = t; this.viewModel = null; this.calls = []; }
    presentOpened(response, newlyOpened) {
      this.calls.push('presentOpened');
      this.viewModel = newlyOpened ? vm(201, JSON_T, Clean.locationOf(response), Clean.caseJson(response)) : vm(200, JSON_T, null, Clean.caseJson(response));
      this.t('presenter', `presentOpened(response, newlyOpened=${newlyOpened}) → ${newlyOpened ? '201 Created + Location' : '200 OK (idempotent replay)'}, labels, allowedActions`, { inverted: true });
    }
    presentCase(response) {
      this.calls.push('presentCase');
      this.viewModel = vm(200, JSON_T, null, Clean.caseJson(response));
      this.t('presenter', `presentCase(response) → 200, statusLabel "${STATUS_LABELS[response.status]}", allowedActions [${Clean.allowedActions(response.status).join(', ')}]`, { inverted: true });
    }
    presentInvalidRequest(rule, message) {
      this.calls.push('presentInvalidRequest');
      this.viewModel = vm(400, PROBLEM_T, null, problem(400, 'Invalid value', message, rule));
      this.t('presenter', `presentInvalidRequest(${rule}) → 400 problem+json`, { inverted: true, error: true });
    }
    presentRuleViolation(rule, message) {
      this.calls.push('presentRuleViolation');
      this.viewModel = vm(422, PROBLEM_T, null, problem(422, 'Business rule violated', message, rule));
      this.t('presenter', `presentRuleViolation(${rule}) → 422 problem+json`, { inverted: true, error: true });
    }
    presentNotFound(caseId) {
      this.calls.push('presentNotFound');
      this.viewModel = vm(404, PROBLEM_T, null, problem(404, 'Case not found', 'Case not found: ' + caseId, null));
      this.t('presenter', 'presentNotFound(caseId) → 404 problem+json (same answer for "missing" and "another tenant\'s")', { inverted: true, error: true });
    }
    presentConflict(caseId) {
      this.calls.push('presentConflict');
      this.viewModel = vm(409, PROBLEM_T, null, problem(409, 'Concurrent update', `Case ${caseId} was changed by someone else; reload and retry`, 'CONCURRENT_UPDATE'));
      this.t('presenter', 'presentConflict(caseId) → 409 CONCURRENT_UPDATE', { inverted: true, error: true });
    }
    result() {
      if (!this.viewModel) throw new Error('The use case finished without presenting an outcome');
      return this.viewModel;
    }
  };

  Clean.WorkQueuePresenter = class {
    constructor(t = () => {}) { this.t = t; this.viewModel = null; }
    presentWorkQueue(r) {
      this.viewModel = vm(200, JSON_T, null, {
        clientGroupId: r.clientGroupId, size: r.items.length,
        items: r.items.map(({ entry: e, priority }) => ({ caseId: e.caseId, partyName: e.partyName, status: e.status, priority, unresolvedMatches: e.unresolvedMatches, highestScore: e.highestScore, openedAt: e.openedAt, href: `/api/v1/client-groups/${r.clientGroupId}/cases/${e.caseId}` })),
      });
      this.t('presenter', `WorkQueuePresenter.presentWorkQueue(${r.items.length} items) → 200 with an href per item`, { inverted: true });
    }
    presentInvalidRequest(rule, message) {
      this.viewModel = vm(400, PROBLEM_T, null, problem(400, 'Invalid value', message, rule));
      this.t('presenter', `WorkQueuePresenter.presentInvalidRequest(${rule}) → 400`, { inverted: true, error: true });
    }
    result() { if (!this.viewModel) throw new Error('The use case finished without presenting an outcome'); return this.viewModel; }
  };

  const blank = (v) => v == null || String(v).trim() === '';
  Clean.formErrors = {
    open(f) {
      const e = [];
      if (blank(f.name)) e.push('name: must not be blank');
      if (f.name != null && String(f.name).length > 200) e.push('name: size must be at most 200');
      if (f.entityType == null || !ENTITY_TYPES.includes(f.entityType)) e.push(`entityType: must be one of ${ENTITY_TYPES.join(', ')}`);
      if (!blank(f.country) && !/^[A-Za-z]{2}$/.test(f.country)) e.push('country: must be two letters');
      return e;
    },
    resolve(f) {
      const e = [];
      if (f.resolution == null || !RESOLUTIONS.includes(f.resolution)) e.push(`resolution: must be one of ${RESOLUTIONS.join(', ')}`);
      if (blank(f.rationale)) e.push('rationale: must not be blank');
      if (blank(f.analystId)) e.push('analystId: must not be blank');
      return e;
    },
    close(f) { return blank(f.analystId) ? ['analystId: must not be blank'] : []; },
  };

  // ---------------------------------------------------------------- the running system
  Clean.createSystem = function ({ threshold = 80 } = {}) {
    const db = { screening_case: new Map(), case_match: new Map(), outbox_event: [], idempotency_key: new Map() };
    const published = [];
    let listener = () => {};
    const sys = { db, published, threshold, sinkDown: false, versionCheck: true, concurrentWriter: false, clock: () => new Date().toISOString() };
    sys.onTrace = (fn) => { listener = fn; };
    const t = (node, text, extra = {}) => listener({ node, ring: (Clean.NODES[node] || ['outside'])[0], text, ...extra });
    sys.trace = t;

    // ---------------- ring 4: drivers (Micronaut Data, transactions) ----------------
    const records = {
      findCase(id) { t('records', `SELECT * FROM screening_case WHERE id = '${short(id)}…'`); const r = db.screening_case.get(id); return r ? structuredClone(r) : null; },
      findMatches(caseId) { return [...db.case_match.values()].filter((m) => m.caseId === caseId).sort((a, b) => b.score - a.score).map((m) => structuredClone(m)); },
      insertCase(r) { t('records', `INSERT INTO screening_case (…, status='${r.status}', version=${r.version})`); db.screening_case.set(r.id, structuredClone(r)); },
      updateCase(r) {
        const stored = db.screening_case.get(r.id);
        if (sys.versionCheck && stored.version !== r.version) {
          t('records', `UPDATE screening_case … WHERE id = ? AND version = ${r.version} → 0 rows (stored version ${stored.version}) → OptimisticLockException`, { error: true });
          throw new StaleRecord(r.id);
        }
        const next = sys.versionCheck ? r.version + 1 : stored.version + 1;
        t('records', sys.versionCheck ? `UPDATE screening_case SET status='${r.status}', version=${next} WHERE id = ? AND version = ${r.version} → 1 row` : `UPDATE screening_case SET status='${r.status}' WHERE id = ?   -- no version check!`);
        db.screening_case.set(r.id, { ...structuredClone(r), version: next });
      },
      insertMatch(m) { db.case_match.set(m.id, structuredClone(m)); },
      updateMatch(m) { db.case_match.set(m.id, structuredClone(m)); },
    };
    const outboxRecords = {
      insert(row) { db.outbox_event.push(structuredClone(row)); },
      findUnpublished(limit) { return db.outbox_event.filter((r) => !r.publishedAt).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).slice(0, limit); },
      markPublished(id, at) { const r = db.outbox_event.find((x) => x.id === id); if (r) r.publishedAt = at; },
      countUnpublished() { return db.outbox_event.filter((r) => !r.publishedAt).length; },
    };
    let depth = 0;
    const transactions = {
      write(work) {
        if (depth > 0) return work();
        t('tx', 'MicronautTransactionRunner.write → BEGIN (TransactionOperations.executeWrite)', { inverted: true });
        const backup = structuredClone({ c: [...db.screening_case], m: [...db.case_match], o: db.outbox_event, k: [...db.idempotency_key] });
        depth++;
        try {
          const r = work();
          t('tx', 'COMMIT – case rows, match rows and outbox rows become visible together', { ok: true });
          return r;
        } catch (e) {
          db.screening_case = new Map(backup.c); db.case_match = new Map(backup.m); db.outbox_event = backup.o; db.idempotency_key = new Map(backup.k);
          t('tx', `ROLLBACK (${e.rule || e.constructor.name}) – nothing written, no event in the outbox`, { error: true });
          throw e;
        } finally { depth--; }
      },
      read(work) { t('tx', 'MicronautTransactionRunner.read → read-only transaction', { inverted: true }); return work(); },
    };
    const idempotency = {
      find(group, key) { t('idem', `JdbcIdempotencyGateway.find → SELECT … FROM idempotency_key WHERE id = '${group}:${key}'`, { inverted: true }); return db.idempotency_key.get(`${group}:${key}`) || null; },
      remember(group, key, caseId) { t('idem', `JdbcIdempotencyGateway.remember → INSERT INTO idempotency_key ('${group}:${key}')`, { inverted: true }); db.idempotency_key.set(`${group}:${key}`, caseId); },
    };
    const workQueueGateway = {
      openCases(group) {
        t('queue', 'JdbcWorkQueueGateway: SELECT cases WHERE client_group_id = ? AND status IN (open) + SELECT matches WHERE case_id IN (…) – no aggregate loaded', { inverted: true });
        const open = [...db.screening_case.values()].filter((c) => c.clientGroupId === group && c.status !== 'CLOSED');
        return open.map((c) => {
          const pending = [...db.case_match.values()].filter((m) => m.caseId === c.id && m.resolution === 'UNRESOLVED');
          return { caseId: c.id, partyName: c.partyName, status: c.status, unresolvedMatches: pending.length, highestScore: pending.reduce((a, m) => Math.max(a, m.score), 0), openedAt: c.openedAt };
        });
      },
    };
    const sink = {
      publish(event) {
        if (sys.sinkDown) { t('sink', `LoggingEventSink.publish(${event.type}) → broker unavailable`, { error: true }); throw new Error('broker unavailable'); }
        published.push(event);
        t('sink', `published ${event.type} (eventId ${short(event.eventId)}…)`, { event: true });
      },
    };

    // ---------------- ring 3: gateway implementations (translation) ----------------
    const toRecord = (s) => ({ id: s.id, clientGroupId: s.clientGroup, partyName: s.party.name, entityType: s.party.type, dateOfBirth: s.party.dateOfBirth, country: s.party.country, status: s.status, outcome: s.outcome, screeningCount: s.screeningCount, openedAt: s.openedAt, lastScreenedAt: s.lastScreenedAt, closedAt: s.closedAt, closedBy: s.closedBy, version: s.version });
    const toMatchRecord = (caseId, m) => ({ id: m.id, caseId, profileId: m.profileId, category: m.category, matchedName: m.matchedName, score: m.score, resolution: m.resolution, rationale: m.rationale, resolvedBy: m.resolvedBy, resolvedAt: m.resolvedAt });
    const toSnapshot = (r, ms) => ({ id: r.id, clientGroup: r.clientGroupId, party: { name: r.partyName, type: r.entityType, dateOfBirth: r.dateOfBirth, country: r.country }, status: r.status, outcome: r.outcome, screeningCount: r.screeningCount, openedAt: r.openedAt, lastScreenedAt: r.lastScreenedAt, closedAt: r.closedAt, closedBy: r.closedBy, version: r.version, matches: ms.map(({ caseId, ...m }) => m) });
    const caseGateway = {
      findById(id) {
        t('sql-gw', 'SqlCaseGateway.findById: records → CaseRecordMapper.toSnapshot → ScreeningCase.rehydrate', { inverted: true });
        const r = records.findCase(id);
        return r ? WC.ScreeningCase.rehydrate(toSnapshot(r, records.findMatches(id))) : null;
      },
      save(c) {
        const s = c.snapshot();
        t('sql-gw', `SqlCaseGateway.save: aggregate → CaseRecord + ${s.matches.length} MatchRecord(s)`, { inverted: true });
        const rec = toRecord(s);
        const exists = !!db.screening_case.get(rec.id);
        if (exists && sys.concurrentWriter) {
          sys.concurrentWriter = false;
          db.screening_case.get(rec.id).version++;
          t('db', 'meanwhile another analyst committed a change to this case (stored version is now newer)', { error: true });
        }
        if (exists) {
          try { records.updateCase(rec); } catch (e) {
            if (e instanceof StaleRecord) { t('sql-gw', 'StaleRecordException → ConcurrentCaseUpdateException (the use cases\' own exception type)', { error: true }); throw new ConcurrentUpdate(s.id); }
            throw e;
          }
        } else records.insertCase(rec);
        const stored = new Set(exists ? records.findMatches(rec.id).map((m) => m.id) : []);
        for (const m of s.matches) (stored.has(m.id) ? records.updateMatch : records.insertMatch)(toMatchRecord(s.id, m));
      },
    };
    const outboxGateway = {
      append(events) {
        if (!events.length) return;
        t('outbox-gw', `OutboxEventGateway.append: EventJson (published language v1) → INSERT INTO outbox_event × ${events.length} (${events.map((e) => e.type).join(', ')})`, { inverted: true });
        for (const e of events) outboxRecords.insert({ id: e.eventId, aggregateId: e.caseId, clientGroupId: e.clientGroupId, eventType: e.type, payload: JSON.stringify(e), occurredAt: e.occurredAt, publishedAt: null });
      },
    };
    const referenceData = {
      candidatesFor(party) {
        const c = WC.candidatesFor(party);
        t('ref-gw', `InMemoryReferenceData: blocking on 3-letter prefixes → ${c.length} candidate(s) ${c.map((p) => p.id).join(', ') || ''}`, { inverted: true });
        return c;
      },
    };
    sys.gateways = { caseGateway, outboxGateway, referenceData, transactions, idempotency, workQueueGateway };
    sys.records = records;
    sys.relay = function publishPending() {
      t('scheduler', '@Scheduled tick → OutboxRelay.publishPending()');
      const batch = outboxRecords.findUnpublished(100);
      t('relay', `OutboxRelay: ${batch.length} unpublished row(s), oldest first`);
      let delivered = 0;
      for (const row of batch) {
        try { sink.publish({ ...JSON.parse(row.payload) }); } catch (e) {
          t('relay', `delivery failed for ${row.eventType} → stop here so order is preserved; retry next tick`, { error: true });
          break;
        }
        outboxRecords.markPublished(row.id, sys.clock());
        delivered++;
      }
      return delivered;
    };
    sys.pendingCount = () => outboxRecords.countUnpublished();

    // ---------------- ring 2: interactors ----------------
    const caseResponse = (c) => {
      const s = c.snapshot();
      return { caseId: s.id, clientGroupId: s.clientGroup, partyName: s.party.name, entityType: s.party.type, dateOfBirth: s.party.dateOfBirth, country: s.party.country, status: s.status, outcome: s.outcome, screeningCount: s.screeningCount, openedAt: s.openedAt, lastScreenedAt: s.lastScreenedAt, closedAt: s.closedAt, closedBy: s.closedBy, matches: s.matches.map((m) => ({ matchId: m.id, profileId: m.profileId, category: m.category, matchedName: m.matchedName, score: m.score, resolution: m.resolution, rationale: m.rationale, resolvedBy: m.resolvedBy, resolvedAt: m.resolvedAt })) };
    };
    Clean.caseResponse = caseResponse;
    const presentingFailures = (presenter, work) => {
      try { work(); } catch (e) {
        if (e instanceof WC.DomainException) {
          t('interactor', `Outcomes.presentingFailures caught DomainException ${e.rule} → ${e.rule === 'INVALID_VALUE' ? 'presentInvalidRequest' : 'presentRuleViolation'}`, { error: true });
          if (e.rule === 'INVALID_VALUE') presenter.presentInvalidRequest(e.rule, e.message); else presenter.presentRuleViolation(e.rule, e.message);
        } else if (e instanceof CaseNotFound) {
          t('interactor', 'Outcomes.presentingFailures caught CaseNotFoundException → presentNotFound', { error: true });
          presenter.presentNotFound(e.caseId);
        } else if (e instanceof ConcurrentUpdate) {
          t('interactor', 'Outcomes.presentingFailures caught ConcurrentCaseUpdateException → presentConflict', { error: true });
          presenter.presentConflict(e.caseId);
        } else throw e;
      }
    };
    const lookup = (group, id) => {
      const c = caseGateway.findById(id);
      if (!c || !c.belongsTo(group)) { t('interactor', `CaseLookup.load: ${c ? `case belongs to '${c.clientGroup}', not '${group}'` : 'no such case'} → CaseNotFoundException`, { error: true }); throw new CaseNotFound(id); }
      t('interactor', `CaseLookup.load: case belongs to '${group}' ✓`);
      return c;
    };
    const entityType = (raw) => {
      const v = raw == null ? null : String(raw).trim().toUpperCase();
      if (!ENTITY_TYPES.includes(v)) throw new WC.DomainException('INVALID_VALUE', 'Entity type must be INDIVIDUAL or ORGANISATION' + (raw == null ? '' : ': ' + raw));
      return v;
    };
    const resolution = (raw) => {
      const v = raw == null ? null : String(raw).trim().toUpperCase();
      if (![...RESOLUTIONS, 'UNRESOLVED'].includes(v)) throw new WC.DomainException('INVALID_VALUE', 'Resolution must be POSITIVE, POSSIBLE or FALSE_POSITIVE' + (raw == null ? '' : ': ' + raw));
      return v;
    };
    const rationale = (raw) => WC.validateRationale(raw);
    const party = (req) => {
      const name = WC.validateName(req.name);
      const type = entityType(req.entityType);
      const country = WC.validateCountry(req.country);
      return WC.makeParty({ name, entityType: type, dateOfBirth: req.dateOfBirth || null, country });
    };

    const interactors = {
      OpenCase(req, presenter) {
        t('interactor', 'OpenCaseInteractor.execute(OpenCaseRequest) – build value objects from plain request data');
        presentingFailures(presenter, () => {
          const group = WC.clientGroupId(req.clientGroupId);
          t('entity', 'new ClientGroupId / PartyName / CountryCode / Party – each value object validates itself');
          const p = party(req);
          const key = blank(req.idempotencyKey) ? null : String(req.idempotencyKey).trim();
          t('gw-tx', 'transactions.write(…) via TransactionRunner (owned by use cases)', { inverted: true });
          const result = transactions.write(() => {
            if (key) {
              t('gw-idem', 'idempotency.find(group, key) via IdempotencyGateway', { inverted: true });
              const existing = idempotency.find(group, key);
              if (existing) { t('interactor', `key '${key}' already used → load that case, newlyOpened = false`); return { response: caseResponse(lookup(group, existing)), newlyOpened: false }; }
            }
            t('entity', 'ScreeningCase.open(…) → status CREATED, raises CaseOpened');
            const c = WC.ScreeningCase.open(WC.uuid(), group, p, sys.clock());
            t('gw-case', 'cases.save(case) via CaseGateway', { inverted: true });
            caseGateway.save(c);
            t('gw-outbox', 'outbox.append(case.pullEvents()) via EventOutboxGateway', { inverted: true });
            outboxGateway.append(c.pullEvents());
            if (key) idempotency.remember(group, key, c.id);
            return { response: caseResponse(c), newlyOpened: true };
          });
          t('response', `CaseResponse.from(case) – plain strings, no entity escapes (status ${result.response.status})`);
          t('output', 'presenter.presentOpened(response, newlyOpened) via CaseOutputBoundary – after COMMIT', { inverted: true });
          presenter.presentOpened(result.response, result.newlyOpened);
        });
      },
      ScreenCase(req, presenter) {
        t('interactor', 'ScreenCaseInteractor.execute(ScreenCaseRequest)');
        presentingFailures(presenter, () => {
          const group = WC.clientGroupId(req.clientGroupId);
          const id = WC.caseId(req.caseId);
          const p = transactions.read(() => lookup(group, id).party);
          t('gw-ref', 'referenceData.candidatesFor(party) via ReferenceDataGateway – OUTSIDE the write transaction (slow, remote)', { inverted: true });
          const candidates = referenceData.candidatesFor(p);
          const response = transactions.write(() => {
            const c = lookup(group, id);
            t('policy', `ScreeningCase.screen(candidates, NameMatchingPolicy[threshold=${sys.threshold}])`);
            c.screen(candidates, sys.threshold, sys.clock(), (msg) => t('policy', msg));
            t('entity', `status → ${c.status}, raises CaseScreened`);
            t('gw-case', 'cases.save(case) via CaseGateway', { inverted: true });
            caseGateway.save(c);
            t('gw-outbox', 'outbox.append(case.pullEvents())', { inverted: true });
            outboxGateway.append(c.pullEvents());
            return caseResponse(c);
          });
          t('response', `CaseResponse.from(case) – ${response.matches.length} match(es)`);
          t('output', 'presenter.presentCase(response) via CaseOutputBoundary', { inverted: true });
          presenter.presentCase(response);
        });
      },
      ResolveMatch(req, presenter) {
        t('interactor', 'ResolveMatchInteractor.execute(ResolveMatchRequest)');
        presentingFailures(presenter, () => {
          const group = WC.clientGroupId(req.clientGroupId);
          const id = WC.caseId(req.caseId);
          const mid = WC.matchId(req.matchId);
          const res = resolution(req.resolution);
          const why = rationale(req.rationale);
          const analyst = WC.analystId(req.analystId);
          t('entity', 'MatchId / Resolution / ResolutionRationale (10-2000 chars) / AnalystId built and validated');
          const response = transactions.write(() => {
            const c = lookup(group, id);
            t('entity', `ScreeningCase.resolveMatch(${res}, analyst=${analyst}) – four-eyes, rationale, open-case checks`);
            c.resolveMatch(mid, res, why, analyst, sys.clock());
            t('gw-case', 'cases.save(case) via CaseGateway', { inverted: true });
            caseGateway.save(c);
            outboxGateway.append(c.pullEvents());
            return caseResponse(c);
          });
          t('output', 'presenter.presentCase(response)', { inverted: true });
          presenter.presentCase(response);
        });
      },
      CloseCase(req, presenter) {
        t('interactor', 'CloseCaseInteractor.execute(CloseCaseRequest)');
        presentingFailures(presenter, () => {
          const group = WC.clientGroupId(req.clientGroupId);
          const id = WC.caseId(req.caseId);
          const analyst = WC.analystId(req.analystId);
          const response = transactions.write(() => {
            const c = lookup(group, id);
            t('entity', 'ScreeningCase.close() – screened at least once? nothing UNRESOLVED or POSSIBLE?');
            c.close(analyst, sys.clock());
            t('gw-case', 'cases.save(case) via CaseGateway', { inverted: true });
            caseGateway.save(c);
            outboxGateway.append(c.pullEvents());
            return caseResponse(c);
          });
          t('output', 'presenter.presentCase(response)', { inverted: true });
          presenter.presentCase(response);
        });
      },
      ViewCase(req, presenter) {
        t('interactor', 'ViewCaseInteractor.execute(ViewCaseRequest)');
        presentingFailures(presenter, () => {
          const group = WC.clientGroupId(req.clientGroupId);
          const id = WC.caseId(req.caseId);
          const response = transactions.read(() => caseResponse(lookup(group, id)));
          t('output', 'presenter.presentCase(response)', { inverted: true });
          presenter.presentCase(response);
        });
      },
      ListWorkQueue(req, presenter) {
        t('interactor', 'ListWorkQueueInteractor.execute – application rule: triage order');
        let group;
        try {
          group = WC.clientGroupId(req.clientGroupId);
          if (req.limit < 1 || req.limit > 100) throw new WC.DomainException('INVALID_VALUE', `Limit must be 1-100: ${req.limit}`);
        } catch (e) {
          t('interactor', `${e.rule}: ${e.message} → presentInvalidRequest`, { error: true });
          presenter.presentInvalidRequest(e.rule, e.message);
          return;
        }
        t('gw-queue', 'queue.openCases(group) via WorkQueueGateway – a read model, no aggregate', { inverted: true });
        const entries = transactions.read(() => workQueueGateway.openCases(group));
        const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const items = entries.map((entry) => ({ entry, priority: Clean.priorityOf(entry) }))
          .sort((a, b) => rank[a.priority] - rank[b.priority] || a.entry.openedAt.localeCompare(b.entry.openedAt)).slice(0, req.limit);
        t('interactor', `priority: HIGH if unresolved > 0 and highestScore ≥ 95, MEDIUM if unresolved > 0, else LOW → ${items.map((i) => i.priority[0]).join('') || 'empty'}`);
        presenter.presentWorkQueue({ clientGroupId: group, items });
      },
    };
    sys.interactors = interactors;

    // ---------------- ring 3: controllers ----------------
    const present = (name, presenter, request) => {
      t('controller', `pack ${name}Request(${Object.entries(request).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${String(v).length > 14 ? String(v).slice(0, 12) + '…' : v}`).join(', ')}) → new CasePresenter()`);
      t('boundary', `${name}.execute(request, presenter) – the controller only knows the input boundary interface`);
      interactors[name](request, presenter);
      return presenter.result();
    };
    const shape = (kind, form) => {
      if (form == null) { t('controller', 'no body → 400 MALFORMED_REQUEST, no use case runs', { error: true }); return Clean.malformed(['body: required']); }
      const errors = Clean.formErrors[kind](form);
      if (errors.length) { t('controller', `Forms shape check failed: ${errors.join('; ')} → 400, no use case runs`, { error: true }); return Clean.malformed(errors); }
      t('controller', 'Forms shape check ✓ (present, right format, right length – meaning is the entities\' job)');
      return null;
    };
    const presenterFor = () => new Clean.CasePresenter((node, text, extra) => t(node, text, extra));
    sys.controller = {
      open(group, key, form) { return shape('open', form) || present('OpenCase', presenterFor(), { clientGroupId: group, idempotencyKey: key, name: form.name, entityType: form.entityType, dateOfBirth: form.dateOfBirth, country: form.country }); },
      screen(group, caseId) { return present('ScreenCase', presenterFor(), { clientGroupId: group, caseId }); },
      resolve(group, caseId, matchId, form) { return shape('resolve', form) || present('ResolveMatch', presenterFor(), { clientGroupId: group, caseId, matchId, resolution: form.resolution, rationale: form.rationale, analystId: form.analystId }); },
      close(group, caseId, form) { return shape('close', form) || present('CloseCase', presenterFor(), { clientGroupId: group, caseId, analystId: form.analystId }); },
      view(group, caseId) { return present('ViewCase', presenterFor(), { clientGroupId: group, caseId }); },
      workQueue(group, limit) {
        const p = new Clean.WorkQueuePresenter((node, text, extra) => t(node, text, extra));
        t('controller', `WorkQueueController: limit ${limit == null ? 'absent → default 20' : limit} → WorkQueueRequest`);
        interactors.ListWorkQueue({ clientGroupId: group, limit: limit == null ? 20 : limit }, p);
        return p.result();
      },
    };

    // ---------------- ring 4: the endpoint (humble object) ----------------
    const ROUTES = [
      ['POST', /^\/api\/v1\/client-groups\/([^/]+)\/cases$/, 'open'],
      ['GET', /^\/api\/v1\/client-groups\/([^/]+)\/cases\/([^/]+)$/, 'view'],
      ['POST', /^\/api\/v1\/client-groups\/([^/]+)\/cases\/([^/]+)\/screenings$/, 'screen'],
      ['PUT', /^\/api\/v1\/client-groups\/([^/]+)\/cases\/([^/]+)\/matches\/([^/]+)\/resolution$/, 'resolve'],
      ['POST', /^\/api\/v1\/client-groups\/([^/]+)\/cases\/([^/]+)\/closure$/, 'close'],
      ['GET', /^\/api\/v1\/client-groups\/([^/]+)\/work-queue$/, 'workQueue'],
    ];
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
    sys.http = function ({ method, path, headers = {}, body = null }) {
      const [pathOnly, query = ''] = path.split('?');
      t('client', `${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, (m) => short(m) + '…')}`);
      const route = ROUTES.find(([m, re]) => m === method && re.test(pathOnly));
      if (!route) { t('endpoint', 'Micronaut router: no route matches → 404 from the framework; no ring-3 code ran', { error: true }); return { status: 404, contentType: JSON_T, location: null, body: { message: 'Not Found', _links: { self: { href: path } } } }; }
      const [, re, action] = route;
      const p = pathOnly.match(re).slice(1).map(decodeURIComponent);
      t('endpoint', `${action === 'workQueue' ? 'WorkQueueEndpoint' : 'CaseEndpoint'}.${action}: route matched, @ExecuteOn(BLOCKING), bind path, headers and body`);
      let form = body;
      if (typeof body === 'string') {
        if (body.trim() === '') form = null;
        else {
          try { form = JSON.parse(body); } catch { t('binding', 'Serde cannot parse the JSON → ConversionErrorException → MalformedBodyHandler', { error: true }); return finish(Clean.malformed(['body: cannot be read'])); }
        }
      }
      if (action === 'open' && form && form.dateOfBirth != null && form.dateOfBirth !== '' && !isDate(form.dateOfBirth)) {
        t('binding', `"${form.dateOfBirth}" is not a LocalDate → ConversionErrorException → MalformedBodyHandler (400, same problem shape)`, { error: true });
        return finish(Clean.malformed(['body: cannot be read']));
      }
      if (form && form.dateOfBirth === '') form = { ...form, dateOfBirth: null };
      let viewModel;
      if (action === 'open') viewModel = sys.controller.open(p[0], headers['Idempotency-Key'] ?? null, form);
      else if (action === 'view') viewModel = sys.controller.view(p[0], p[1]);
      else if (action === 'screen') viewModel = sys.controller.screen(p[0], p[1]);
      else if (action === 'resolve') viewModel = sys.controller.resolve(p[0], p[1], p[2], form);
      else if (action === 'close') viewModel = sys.controller.close(p[0], p[1], form);
      else {
        const limit = new URLSearchParams(query).get('limit');
        if (limit != null && !/^-?\d+$/.test(limit)) { t('binding', `limit "${limit}" is not an Integer → MalformedBodyHandler`, { error: true }); return finish(Clean.malformed(['limit: cannot be read'])); }
        viewModel = sys.controller.workQueue(p[0], limit == null ? null : +limit);
      }
      return finish(viewModel);
    };
    function finish(viewModel) {
      t('viewmodel', `ViewModel(status ${viewModel.status}, ${viewModel.contentType}${viewModel.location ? ', Location' : ''})`);
      t('endpoint', `Responses.of(viewModel): copy status, Content-Type${viewModel.location ? ', Location' : ''} and body – no decisions here`, { ok: viewModel.status < 400, error: viewModel.status >= 400 });
      return { ...viewModel, body: Clean.nonNull(viewModel.body) };
    }

    // helpers the simulators use to inspect state
    sys.caseRecord = (id) => db.screening_case.get(id) || null;
    sys.matchesOf = (id) => [...db.case_match.values()].filter((m) => m.caseId === id).sort((a, b) => b.score - a.score);
    return sys;
  };

  Clean.priorityOf = (e) => (e.unresolvedMatches > 0 && e.highestScore >= 95 ? 'HIGH' : e.unresolvedMatches > 0 ? 'MEDIUM' : 'LOW');
})();
