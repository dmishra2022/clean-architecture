/* JavaScript port of the code lab's domain and application layer.
   Kept rule-for-rule identical to code-lab/src/main/java/.../domain so the simulators teach the real behaviour. */
(function () {
  const WC = {};
  window.WC = WC;

  // ---------------- DomainException ----------------
  class DomainException extends Error {
    constructor(rule, message) { super(message); this.rule = rule; }
  }
  WC.DomainException = DomainException;
  const invalid = (m) => new DomainException('INVALID_VALUE', m);

  // ---------------- PartyName / tokens ----------------
  WC.normalise = (raw) => raw.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  WC.tokens = (raw) => { const n = WC.normalise(raw); return n ? n.split(' ') : []; };

  WC.validateName = (value) => {
    if (value == null) throw invalid('Name is required');
    const v = value.trim().replace(/\s+/g, ' ');
    if (v.length < 2 || v.length > 200) throw invalid('Name must be 2-200 characters');
    if (!/\p{L}/u.test(v)) throw invalid('Name must contain at least one letter');
    return v;
  };
  WC.validateCountry = (raw) => {
    if (raw == null || raw.trim() === '') return null;
    const v = raw.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(v)) throw invalid('Country must be an ISO 3166-1 alpha-2 code: ' + v);
    return v;
  };
  WC.validateRationale = (raw) => {
    const v = (raw || '').trim();
    if (v.length < 10 || v.length > 2000) throw invalid('Rationale must be 10-2000 characters');
    return v;
  };
  WC.makeParty = ({ name, entityType, dateOfBirth, country }) => {
    const party = { name: WC.validateName(name), type: entityType, dateOfBirth: dateOfBirth || null, country: WC.validateCountry(country) };
    if (!['INDIVIDUAL', 'ORGANISATION'].includes(party.type)) throw invalid('Entity type must be INDIVIDUAL or ORGANISATION');
    if (party.type === 'ORGANISATION' && party.dateOfBirth) throw invalid('An organisation has no date of birth');
    if (party.dateOfBirth && party.dateOfBirth > new Date().toISOString().slice(0, 10)) throw invalid('Date of birth cannot be in the future');
    return Object.freeze(party);
  };

  // ---------------- NameMatchingPolicy ----------------
  const NOISE = new Set(['LTD', 'LIMITED', 'LLC', 'INC', 'PLC', 'CORP', 'CORPORATION', 'CO', 'GMBH', 'SA', 'AG', 'BV']);
  WC.SAME_DOB = 8; WC.DIFFERENT_BIRTH_YEAR = -30; WC.SAME_COUNTRY = 4; WC.DIFFERENT_COUNTRY = -8;

  WC.meaningfulTokens = (name, type) => {
    const t = WC.tokens(name);
    return type === 'ORGANISATION' ? t.filter((x) => !NOISE.has(x)) : t;
  };
  WC.ratio = (a, b) => {
    if (!a.length && !b.length) return 1;
    let prev = new Array(b.length + 1).fill(0);
    let cur = new Array(b.length + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      }
      [prev, cur] = [cur, prev];
    }
    return (2 * prev[b.length]) / (a.length + b.length);
  };
  const sortedUnique = (arr) => [...new Set(arr)].sort();
  WC.similarityBreakdown = (a, b) => {
    if (!a.length || !b.length) return { plain: 0, sorted: 0, set: null, best: 0 };
    const plain = WC.ratio(a.join(' '), b.join(' '));
    const sorted = WC.ratio(sortedUnique(a).join(' '), sortedUnique(b).join(' '));
    let best = Math.max(plain, sorted);
    let set = null;
    const common = sortedUnique(a.filter((x) => new Set(b).has(x)));
    if (common.length >= 2) {
      const inter = common.join(' ');
      const restA = sortedUnique(a.filter((x) => !common.includes(x))).join(' ');
      const restB = sortedUnique(b.filter((x) => !common.includes(x))).join(' ');
      const withA = restA ? `${inter} ${restA}` : inter;
      const withB = restB ? `${inter} ${restB}` : inter;
      set = Math.max(WC.ratio(inter, withA), WC.ratio(inter, withB), WC.ratio(withA, withB));
      best = Math.max(best, set);
    }
    return { plain, sorted, set, best: Math.round(best * 100) };
  };
  WC.nameSimilarity = (a, b) => WC.similarityBreakdown(a, b).best;
  WC.dobAdjustment = (p, r) => {
    if (!p || !r) return 0;
    if (p === r) return WC.SAME_DOB;
    return p.slice(0, 4) === r.slice(0, 4) ? 0 : WC.DIFFERENT_BIRTH_YEAR;
  };
  WC.countryAdjustment = (p, r) => (!p || !r ? 0 : p === r ? WC.SAME_COUNTRY : WC.DIFFERENT_COUNTRY);

  WC.evaluate = (party, profile, threshold = 80) => {
    if (party.type !== profile.type) return { match: false, reason: 'entity types differ', score: 0 };
    const pt = WC.meaningfulTokens(party.name, party.type);
    let best = { name: profile.primaryName, similarity: -1 };
    for (const n of [profile.primaryName, ...profile.aliases]) {
      const s = WC.nameSimilarity(pt, WC.meaningfulTokens(n, profile.type));
      if (s > best.similarity) best = { name: n, similarity: s };
    }
    const dob = WC.dobAdjustment(party.dateOfBirth, profile.dateOfBirth);
    const ctry = WC.countryAdjustment(party.country, profile.country);
    const score = Math.round(Math.max(0, Math.min(100, best.similarity + dob + ctry)));
    return { match: score >= threshold, matchedName: best.name, nameSimilarity: best.similarity, dob, country: ctry, score };
  };

  // ---------------- reference data (same fictional profiles as InMemoryReferenceDataSource) ----------------
  const ind = (id, primaryName, aliases, category, dateOfBirth, country) => ({ id, primaryName, aliases, type: 'INDIVIDUAL', category, dateOfBirth, country });
  const org = (id, primaryName, aliases, category, country) => ({ id, primaryName, aliases, type: 'ORGANISATION', category, dateOfBirth: null, country });
  WC.PROFILES = [
    ind('WC-1001', 'Viktor Ionel Albescu', ['Victor Albescu', 'V. I. Albescu'], 'SANCTIONS', '1961-03-14', 'RO'),
    ind('WC-1002', 'Marisol Quintanar Reyes', ['Marisol Quintanar'], 'PEP', '1975-09-02', 'MX'),
    ind('WC-1003', 'Dmitri Valenko', ['Dmitry Valenko', 'Dimitri Walenko'], 'SANCTIONS', '1958-11-30', 'CY'),
    org('WC-1004', 'Orion Shipping Holdings Ltd', ['Orion Maritime Holdings'], 'SANCTIONS', 'PA'),
    org('WC-1005', 'Golden Crescent Trading LLC', ['Golden Crescent General Trading'], 'LAW_ENFORCEMENT', 'AE'),
    ind('WC-1006', 'Amara Okonkwo-Bell', [], 'ADVERSE_MEDIA', '1982-06-21', 'GB'),
    ind('WC-1007', 'Henrik Faldström', ['Henrik Faldstrom'], 'PEP', '1969-01-08', 'SE'),
    ind('WC-1008', 'Lucia Ferrante', ['Lucia M. Ferrante'], 'LAW_ENFORCEMENT', '1990-04-17', 'IT'),
    org('WC-1009', 'Northwind Capital Partners SA', [], 'ADVERSE_MEDIA', 'LU'),
    ind('WC-1010', 'Viktor Albescu', [], 'ADVERSE_MEDIA', '1988-07-01', 'MD'),
    ind('WC-1011', 'Tomas Reyes Quintana', [], 'PEP', '1971-12-05', 'ES'),
    ind('WC-1012', 'Sofia Albescu', [], 'PEP', '1964-02-19', 'RO'),
  ];
  const blockingKeys = (name) => new Set(WC.tokens(name).filter((t) => t.length >= 3).map((t) => t.slice(0, 3)));
  WC.candidatesFor = (party) => {
    const keys = blockingKeys(party.name);
    return WC.PROFILES.filter((p) => [p.primaryName, ...p.aliases].some((n) => [...blockingKeys(n)].some((k) => keys.has(k))));
  };

  // ---------------- ScreeningCase aggregate ----------------
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  }));
  WC.uuid = uuid;
  const blocksClosure = (r) => r === 'UNRESOLVED' || r === 'POSSIBLE';

  class ScreeningCase {
    constructor(snapshot) {
      Object.assign(this, structuredClone(snapshot));
      this.pendingEvents = [];
    }
    static open(id, clientGroup, party, now) {
      const c = new ScreeningCase({ id, clientGroup, party, openedAt: now, version: 0, status: 'CREATED', outcome: null, screeningCount: 0, lastScreenedAt: null, closedAt: null, closedBy: null, matches: [] });
      c.raise('CaseOpened', now, { entityType: party.type });
      return c;
    }
    static rehydrate(snapshot) { return new ScreeningCase(snapshot); }
    snapshot() { const { pendingEvents, ...s } = this; return structuredClone(s); }

    screen(candidates, threshold, now, trace = () => {}) {
      this.requireOpen('screen');
      let newMatches = 0;
      for (const profile of candidates) {
        const e = WC.evaluate(this.party, profile, threshold);
        trace(`evaluate ${profile.id} "${profile.primaryName}" → name ${e.nameSimilarity ?? 0}, dob ${e.dob ?? 0}, country ${e.country ?? 0} = ${e.score}${e.match ? ' ✓ match' : ' (below threshold)'}`);
        if (!e.match) continue;
        const existing = this.matches.find((m) => m.profileId === profile.id);
        if (existing) existing.score = e.score;
        else {
          this.matches.push({ id: uuid(), profileId: profile.id, category: profile.category, matchedName: e.matchedName, score: e.score, resolution: 'UNRESOLVED', rationale: null, resolvedBy: null, resolvedAt: null });
          newMatches++;
        }
      }
      this.screeningCount++;
      this.lastScreenedAt = now;
      this.recalculate();
      this.raise('CaseScreened', now, { newMatches, totalMatches: this.matches.length, screeningCount: this.screeningCount });
    }

    resolveMatch(matchId, resolution, rationale, analyst, now) {
      this.requireOpen('resolve a match on');
      if (!resolution || resolution === 'UNRESOLVED') throw new DomainException('RESOLUTION_REQUIRED', 'A resolution must be POSITIVE, POSSIBLE or FALSE_POSITIVE');
      if (rationale == null) throw new DomainException('RESOLUTION_REQUIRED', 'A rationale is required for every resolution');
      const m = this.matches.find((x) => x.id === matchId);
      if (!m) throw new DomainException('MATCH_NOT_FOUND', `No match ${matchId} on case ${this.id}`);
      const previous = m.resolution;
      if (previous === 'POSITIVE' && resolution !== 'POSITIVE' && m.resolvedBy === analyst) {
        throw new DomainException('FOUR_EYES', `A confirmed positive can only be downgraded by a different analyst than ${analyst}`);
      }
      Object.assign(m, { resolution, rationale, resolvedBy: analyst, resolvedAt: now });
      this.recalculate();
      this.raise('MatchResolved', now, { matchId, profileId: m.profileId, previousResolution: previous, resolution, analystId: analyst });
    }

    close(analyst, now) {
      this.requireOpen('close');
      if (this.screeningCount === 0) throw new DomainException('NOT_SCREENED', `Case ${this.id} has never been screened`);
      const awaiting = this.matches.filter((m) => blocksClosure(m.resolution)).length;
      if (awaiting > 0) throw new DomainException('MATCHES_AWAITING_REVIEW', `${awaiting} match(es) are unresolved or possible on case ${this.id}`);
      this.outcome = this.matches.some((m) => m.resolution === 'POSITIVE') ? 'RISK_CONFIRMED' : 'CLEAR';
      this.status = 'CLOSED';
      this.closedAt = now;
      this.closedBy = analyst;
      this.raise('CaseClosed', now, { outcome: this.outcome, closedBy: analyst });
    }

    pullEvents() { const e = this.pendingEvents; this.pendingEvents = []; return e; }
    belongsTo(group) { return this.clientGroup === group; }
    requireOpen(action) { if (this.status === 'CLOSED') throw new DomainException('CASE_CLOSED', `Cannot ${action} closed case ${this.id}`); }
    recalculate() {
      if (this.screeningCount === 0) this.status = 'CREATED';
      else if (this.matches.some((m) => blocksClosure(m.resolution))) this.status = 'PENDING_REVIEW';
      else this.status = 'REVIEWED';
    }
    raise(type, occurredAt, extra) {
      this.pendingEvents.push({ schemaVersion: 1, eventId: uuid(), type, caseId: this.id, clientGroupId: this.clientGroup, occurredAt, ...extra });
    }
  }
  WC.ScreeningCase = ScreeningCase;

  // ---------------- in-browser "service": tables, outbox, application service with a trace ----------------
  class CaseNotFound extends Error { constructor(id) { super('Case not found: ' + id); } }
  class ConcurrentUpdate extends Error { constructor(id) { super(`Case ${id} was changed by someone else; reload and retry`); } }
  WC.CaseNotFound = CaseNotFound;
  WC.ConcurrentUpdate = ConcurrentUpdate;

  WC.createSystem = function ({ threshold = 80 } = {}) {
    const db = { screening_case: new Map(), case_match: new Map(), outbox_event: [], idempotency_key: new Map() };
    const published = [];
    let trace = () => {};
    const sys = {
      db, published, threshold,
      onTrace(fn) { trace = fn; },
      clock: () => new Date().toISOString(),
    };
    const t = (node, ring, text, extra = {}) => trace({ node, ring, text, ...extra });

    // driven adapter: JDBC-like repository with optimistic locking
    sys.repository = {
      findById(id) {
        t('jdbc', 'adapter', `SELECT * FROM screening_case WHERE id = '${id.slice(0, 8)}…'`);
        const row = db.screening_case.get(id);
        if (!row) return null;
        const matches = [...db.case_match.values()].filter((m) => m.case_id === id).sort((a, b) => b.score - a.score);
        return ScreeningCase.rehydrate({ ...row.snapshot, version: row.version, matches: matches.map((m) => m.snapshot) });
      },
      save(c) {
        const s = c.snapshot();
        const row = db.screening_case.get(s.id);
        if (row) {
          if (row.version !== s.version) {
            t('jdbc', 'adapter', `UPDATE … WHERE version = ${s.version} → 0 rows (current ${row.version})`, { error: true });
            throw new ConcurrentUpdate(s.id);
          }
          t('jdbc', 'adapter', `UPDATE screening_case SET status='${s.status}', version=${row.version + 1} WHERE id=… AND version=${s.version}`);
          row.version += 1;
          row.snapshot = { ...s, matches: undefined };
        } else {
          t('jdbc', 'adapter', `INSERT INTO screening_case (id, status, version) VALUES (…, '${s.status}', 0)`);
          db.screening_case.set(s.id, { version: 0, snapshot: { ...s, matches: undefined } });
        }
        for (const m of s.matches) {
          db.case_match.set(m.id, { case_id: s.id, score: m.score, snapshot: m });
        }
        if (s.matches.length) t('jdbc', 'adapter', `UPSERT case_match × ${s.matches.length}`);
      },
    };
    sys.outbox = {
      append(events) {
        for (const e of events) db.outbox_event.push({ id: e.eventId, type: e.type, aggregate_id: e.caseId, payload: e, published_at: null });
        if (events.length) t('outbox', 'adapter', `INSERT INTO outbox_event × ${events.length} (${events.map((e) => e.type).join(', ')})`);
      },
    };
    sys.idempotency = {
      find(group, key) { return db.idempotency_key.get(`${group}:${key}`) || null; },
      remember(group, key, caseId) { db.idempotency_key.set(`${group}:${key}`, caseId); t('jdbc', 'adapter', `INSERT INTO idempotency_key ('${group}:${key}')`); },
    };
    sys.referenceData = {
      candidatesFor(party) {
        const c = WC.candidatesFor(party);
        t('ref', 'adapter', `blocking on 3-letter prefixes → ${c.length} candidate profile(s): ${c.map((p) => p.id).join(', ') || 'none'}`);
        return c;
      },
    };
    // unit of work: snapshot + restore on failure (what a DB rollback gives you)
    sys.uow = {
      write(fn) {
        t('uow', 'adapter', 'BEGIN');
        const backup = { cases: structuredClone([...db.screening_case]), matches: structuredClone([...db.case_match]), outbox: db.outbox_event.length, keys: new Map(db.idempotency_key) };
        try {
          const r = fn();
          t('uow', 'adapter', 'COMMIT', { ok: true });
          return r;
        } catch (e) {
          db.screening_case = new Map(backup.cases); db.case_match = new Map(backup.matches);
          sys.db.screening_case = db.screening_case; sys.db.case_match = db.case_match;
          db.outbox_event.length = backup.outbox; db.idempotency_key = backup.keys; sys.db.idempotency_key = backup.keys;
          t('uow', 'adapter', `ROLLBACK (${e.rule || e.constructor.name})`, { error: true });
          throw e;
        }
      },
      read(fn) { return fn(); },
    };

    const load = (group, id) => {
      const c = sys.repository.findById(id);
      if (!c || !c.belongsTo(group)) {
        t('app', 'application', `tenant check: case not visible to '${group}' → CaseNotFound`, { error: true });
        throw new CaseNotFound(id);
      }
      t('app', 'application', `tenant check: belongs to '${group}' ✓`);
      return c;
    };
    const commit = (c) => {
      sys.repository.save(c);
      sys.outbox.append(c.pullEvents());
      return c.snapshot();
    };

    // application service (port.in implementations)
    sys.app = {
      open({ clientGroup, party, idempotencyKey }) {
        t('portin', 'application', 'OpenCaseUseCase.open(command)');
        return sys.uow.write(() => {
          if (idempotencyKey) {
            const existing = sys.idempotency.find(clientGroup, idempotencyKey);
            if (existing) { t('app', 'application', `idempotency key '${idempotencyKey}' seen → return existing case`); return load(clientGroup, existing).snapshot(); }
          }
          t('domain', 'domain', 'ScreeningCase.open(…) → raises CaseOpened');
          const c = ScreeningCase.open(uuid(), clientGroup, party, sys.clock());
          const view = commit(c);
          if (idempotencyKey) sys.idempotency.remember(clientGroup, idempotencyKey, c.id);
          return view;
        });
      },
      screen({ clientGroup, caseId }) {
        t('portin', 'application', 'ScreenCaseUseCase.screen(command)');
        const party = load(clientGroup, caseId).party;
        t('app', 'application', 'fetch candidates OUTSIDE the write transaction');
        const candidates = sys.referenceData.candidatesFor(party);
        return sys.uow.write(() => {
          const c = load(clientGroup, caseId);
          t('domain', 'domain', `ScreeningCase.screen(candidates, policy[threshold=${sys.threshold}])`);
          c.screen(candidates, sys.threshold, sys.clock(), (msg) => t('domain', 'domain', msg));
          return commit(c);
        });
      },
      resolve({ clientGroup, caseId, matchId, resolution, rationale, analyst }) {
        t('portin', 'application', 'ResolveMatchUseCase.resolve(command)');
        return sys.uow.write(() => {
          const c = load(clientGroup, caseId);
          t('domain', 'domain', `ScreeningCase.resolveMatch(${resolution}, analyst=${analyst}) → check invariants`);
          c.resolveMatch(matchId, resolution, rationale, analyst, sys.clock());
          return commit(c);
        });
      },
      close({ clientGroup, caseId, analyst }) {
        t('portin', 'application', 'CloseCaseUseCase.close(command)');
        return sys.uow.write(() => {
          const c = load(clientGroup, caseId);
          t('domain', 'domain', 'ScreeningCase.close() → screened? none UNRESOLVED/POSSIBLE?');
          c.close(analyst, sys.clock());
          return commit(c);
        });
      },
    };

    sys.relay = () => {
      const pending = db.outbox_event.filter((r) => !r.published_at);
      t('relay', 'adapter', `OutboxRelay: ${pending.length} unpublished row(s)`);
      for (const row of pending) {
        published.push(row.payload);
        row.published_at = sys.clock();
        t('sink', 'adapter', `publish ${row.type} (eventId ${row.id.slice(0, 8)}…)`, { event: true });
      }
      return pending.length;
    };
    return sys;
  };
})();
