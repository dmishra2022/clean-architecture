// Runs the in-browser model (domain.js + clean-system.js) through the same HTTP session as the code lab's
// CaseApiTest and curl walkthrough, and fails if any status, rule or field differs from the Java service.
// Usage: node tools/check-model.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../assets/js/', import.meta.url);
const ctx = { window: {}, crypto: globalThis.crypto, structuredClone, console, URLSearchParams };
vm.createContext(ctx);
for (const f of ['domain.js', 'clean-system.js']) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
const { WC, Clean } = ctx.window;
ctx.WC = WC;

const sys = Clean.createSystem();
const trace = [];
sys.onTrace((e) => trace.push(e));
const base = '/api/v1/client-groups/acme-bank/cases';
const http = (method, path, body, headers) => sys.http({ method, path, body: body === undefined ? null : body, headers });
let n = 0;
const check = (label, fn) => { fn(); n++; console.log('  ok  ' + label); };

const viktor = { name: 'Viktor Albescu', entityType: 'INDIVIDUAL', dateOfBirth: '1961-03-14', country: 'RO' };
let id, matchId;

check('open → 201 + Location, CREATED, allowedActions [screen]', () => {
  const r = http('POST', base, viktor, { 'Idempotency-Key': 'k-1' });
  assert.equal(r.status, 201);
  id = r.body.caseId;
  assert.equal(r.location, `${base}/${id}`);
  assert.equal(r.body.status, 'CREATED');
  assert.equal(r.body.statusLabel, 'Not screened yet');
  assert.deepEqual([...r.body.allowedActions], ['screen']);
  assert.equal('closedAt' in r.body, false, 'non_null inclusion drops nulls');
});
check('same Idempotency-Key → 200, same case, no second CaseOpened', () => {
  const r = http('POST', base, viktor, { 'Idempotency-Key': 'k-1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.caseId, id);
  assert.equal(r.location, null);
  assert.equal(sys.db.outbox_event.filter((e) => e.eventType === 'CaseOpened').length, 1);
});
check('screen → PENDING_REVIEW, WC-1001 score 100 with label', () => {
  const r = http('POST', `${base}/${id}/screenings`);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'PENDING_REVIEW');
  const top = r.body.matches[0];
  assert.equal(top.profileId, 'WC-1001');
  assert.equal(top.score, 100);
  assert.equal(top.categoryLabel, 'Sanctions');
  matchId = top.matchId;
});
check('close too early → 422 MATCHES_AWAITING_REVIEW, nothing written', () => {
  const before = sys.db.outbox_event.length;
  const r = http('POST', `${base}/${id}/closure`, { analystId: 'ana' });
  assert.equal(r.status, 422);
  assert.equal(r.contentType, 'application/problem+json');
  assert.equal(r.body.rule, 'MATCHES_AWAITING_REVIEW');
  assert.equal(sys.db.outbox_event.length, before);
});
check('resolve every match then close → CLOSED, allowedActions []', () => {
  for (const m of http('GET', `${base}/${id}`).body.matches) {
    const r = http('PUT', `${base}/${id}/matches/${m.matchId}/resolution`, { resolution: m.matchId === matchId ? 'POSITIVE' : 'FALSE_POSITIVE', rationale: 'Checked passport and address', analystId: 'ana' });
    assert.equal(r.status, 200);
  }
  const r = http('POST', `${base}/${id}/closure`, { analystId: 'ana' });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'CLOSED');
  assert.equal(r.body.outcome, 'RISK_CONFIRMED');
  assert.deepEqual([...r.body.allowedActions], []);
});
check('another tenant → 404 (no existence leak)', () => {
  const r = http('GET', `/api/v1/client-groups/other-bank/cases/${id}`);
  assert.equal(r.status, 404);
  assert.equal(r.body.title, 'Case not found');
});
check('shape errors → 400 MALFORMED_REQUEST with errors, no use case ran', () => {
  const r = http('POST', base, { name: '', entityType: 'ROBOT', country: 'GBR' });
  assert.equal(r.status, 400);
  assert.equal(r.body.rule, 'MALFORMED_REQUEST');
  assert.deepEqual([...r.body.errors], ['name: must not be blank', 'entityType: must be one of INDIVIDUAL, ORGANISATION', 'country: must be two letters']);
});
check('unreadable body / bad date → 400 "body: cannot be read"; no body → "body: required"', () => {
  assert.deepEqual([...http('POST', base, '{"name": ').body.errors], ['body: cannot be read']);
  assert.deepEqual([...http('POST', base, { ...viktor, dateOfBirth: '1961-02-30' }).body.errors], ['body: cannot be read']);
  assert.deepEqual([...http('POST', base, null).body.errors], ['body: required']);
});
check('bad case id → 400 INVALID_VALUE from the CaseId value object', () => {
  const r = http('GET', `${base}/not-a-uuid`);
  assert.equal(r.status, 400);
  assert.equal(r.body.rule, 'INVALID_VALUE');
  assert.equal(r.body.detail, 'Case id must be a UUID: not-a-uuid');
});
check('organisation with a date of birth → 400 INVALID_VALUE (entity rule, not a shape rule)', () => {
  const r = http('POST', base, { name: 'Orion Shipping', entityType: 'ORGANISATION', dateOfBirth: '1990-01-01' });
  assert.equal(r.status, 400);
  assert.equal(r.body.detail, 'An organisation has no date of birth');
});
check('stale version → 409 CONCURRENT_UPDATE and rollback', () => {
  const open = http('POST', base, viktor);
  const cid = open.body.caseId;
  const c = sys.gateways.caseGateway.findById(cid);
  http('POST', `${base}/${cid}/screenings`);
  c.screen([], 80, new Date().toISOString());
  const rows = sys.db.outbox_event.length;
  assert.throws(() => sys.gateways.transactions.write(() => { sys.gateways.caseGateway.save(c); sys.gateways.outboxGateway.append(c.pullEvents()); }), Clean.ConcurrentUpdate);
  assert.equal(sys.db.outbox_event.length, rows);
});
check('concurrent writer during a request → HTTP 409 problem+json', () => {
  const cid = http('POST', base, viktor).body.caseId;
  sys.concurrentWriter = true;
  const r = http('POST', `${base}/${cid}/screenings`);
  assert.equal(r.status, 409);
  assert.equal(r.body.rule, 'CONCURRENT_UPDATE');
  assert.equal(sys.caseRecord(cid).status, 'CREATED');
});
check('work queue → HIGH before LOW, href per item; limit 0 and 500 → 400', () => {
  const s2 = Clean.createSystem();
  const h = (m, p, b) => s2.http({ method: m, path: p, body: b ?? null });
  const quiet = h('POST', base, { name: 'Zelda Quietname', entityType: 'INDIVIDUAL' }).body.caseId;
  h('POST', `${base}/${quiet}/screenings`);
  const hot = h('POST', base, viktor).body.caseId;
  h('POST', `${base}/${hot}/screenings`);
  const q = h('GET', '/api/v1/client-groups/acme-bank/work-queue');
  assert.equal(q.status, 200);
  assert.deepEqual([...q.body.items.map((i) => i.priority)], ['HIGH', 'LOW']);
  assert.equal(q.body.items[0].caseId, hot);
  assert.equal(q.body.items[0].href, `${base}/${hot}`);
  assert.equal(h('GET', '/api/v1/client-groups/acme-bank/work-queue?limit=0').status, 400);
  assert.equal(h('GET', '/api/v1/client-groups/acme-bank/work-queue?limit=500').body.detail, 'Limit must be 1-100: 500');
});
check('relay publishes oldest first, stops at first failure, resumes', () => {
  const pending = sys.pendingCount();
  assert.ok(pending > 0);
  sys.sinkDown = true;
  assert.equal(sys.relay(), 0);
  assert.equal(sys.pendingCount(), pending);
  sys.sinkDown = false;
  assert.equal(sys.relay(), pending);
  assert.equal(sys.published[0].type, 'CaseOpened');
  assert.equal(sys.published[0].schemaVersion, 1);
});
check('unknown route → framework 404, no ring-3 code ran', () => {
  trace.length = 0;
  assert.equal(http('DELETE', `${base}/${id}`).status, 404);
  assert.ok(!trace.some((e) => e.ring === 'iadapter' || e.ring === 'usecase'));
});
check('trace: every node is known, and control crosses outward only via inner-ring interfaces', () => {
  trace.length = 0;
  http('POST', base, viktor);
  for (const e of trace) assert.ok(Clean.NODES[e.node], 'unknown node ' + e.node);
  const rings = new Set(trace.map((e) => e.ring));
  for (const r of ['outside', 'framework', 'iadapter', 'usecase', 'entity']) assert.ok(rings.has(r), 'missing ring ' + r);
  assert.ok(trace.some((e) => e.node === 'presenter' && e.inverted));
});
console.log(`\n${n} checks passed – the browser model behaves like the Java service.`);
