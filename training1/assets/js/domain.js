/* JavaScript port of ring 1 (Entities) of the code lab.
   Kept rule-for-rule identical to code-lab/screening-entities so the simulators teach the real behaviour.
   Rings 2-4 are modelled in clean-system.js. */
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

  // ---------------- identifier value objects (ClientGroupId, AnalystId, CaseId, MatchId) ----------------
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  WC.clientGroupId = (v) => {
    if (v == null || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(v)) throw invalid(`Client group id must be 2-64 lowercase letters, digits or '-': ${v}`);
    return v;
  };
  WC.analystId = (v) => {
    if (v == null || v.trim() === '' || v.length > 64) throw invalid('Analyst id must be 1-64 characters');
    return v.trim();
  };
  WC.caseId = (raw) => { if (raw == null || !UUID_RE.test(raw)) throw invalid(`Case id must be a UUID: ${raw}`); return raw.toLowerCase(); };
  WC.matchId = (raw) => { if (raw == null || !UUID_RE.test(raw)) throw invalid(`Match id must be a UUID: ${raw}`); return raw.toLowerCase(); };

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

})();
