// Generates every course diagram as SVG into ../assets/diagrams.
// Run: node plan/training/tools/build-diagrams.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, svg, rect, text, box, line, path, label, pill, hexagon, sticky, cylinder, heading, legend } from './svg.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'diagrams');
mkdirSync(OUT, { recursive: true });
const diagrams = {};

// ---------------------------------------------------------------------------------------------
diagrams['01-layered-vs-hexagonal'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'Layered vs Hexagonal: where do dependencies point?',
    'Same features, different direction of source-code dependencies');

  // Layered
  b += text(320, 135, 'Classic layered (database-centric)', { size: 18, weight: 700, anchor: 'middle', fill: C.red });
  const layers = [
    ['Web / Controllers', 'CaseController, DTOs', C.slate],
    ['Service layer', 'CaseService (rules mixed with plumbing)', C.slate],
    ['Data access', 'CaseDao, JPA @Entity classes', C.slate],
    ['Database schema', 'tables drive the design', C.navyDark],
  ];
  layers.forEach(([t, s, f], i) => {
    const y = 160 + i * 120;
    b += box(110, y, 420, 80, t, [s], { fill: f });
    if (i < layers.length - 1) b += line(320, y + 82, 320, y + 116, { color: 'red', sw: 2.5 });
  });
  b += rect(80, 650, 480, 70, { fill: C.redLight, stroke: C.red, rx: 8, shadow: false });
  b += text(100, 677, 'Business rules depend on persistence. Change the DB or ORM', { size: 13.5, fill: C.ink });
  b += text(100, 699, 'and the "core" recompiles; tests need a database.', { size: 13.5, fill: C.ink });

  // Hexagonal
  b += text(960, 135, 'Hexagonal (domain-centric)', { size: 18, weight: 700, anchor: 'middle', fill: C.teal });
  b += hexagon(950, 400, 190, { fill: C.tealLight, stroke: C.teal });
  b += hexagon(950, 400, 95, { fill: C.navy, stroke: C.navy, shadow: true });
  b += text(950, 394, 'DOMAIN', { size: 18, weight: 800, fill: '#fff', anchor: 'middle' });
  b += text(950, 416, 'rules + language', { size: 13, fill: '#fff', anchor: 'middle' });
  b += text(950, 262, 'APPLICATION', { size: 13.5, weight: 800, fill: C.teal, anchor: 'middle' });
  b += text(950, 280, 'use cases + ports', { size: 12, fill: C.teal, anchor: 'middle' });
  const adapters = [
    [680, 250, 'REST adapter'], [680, 550, 'Test harness'], [1215, 250, 'JDBC adapter'], [1215, 550, 'Broker adapter'],
  ];
  for (const [x, y, t] of adapters) {
    b += box(x - 60, y - 24, 120, 48, t, [], { fill: C.amber, color: C.ink, titleSize: 13 });
  }
  b += line(742, 262, 812, 315, { color: 'teal', sw: 2.5 });
  b += line(742, 538, 812, 485, { color: 'teal', sw: 2.5 });
  b += line(1153, 262, 1088, 315, { color: 'teal', sw: 2.5, dash: '6 4', hollow: true });
  b += line(1153, 538, 1088, 485, { color: 'teal', sw: 2.5, dash: '6 4', hollow: true });
  b += rect(720, 650, 480, 70, { fill: C.tealLight, stroke: C.teal, rx: 8, shadow: false });
  b += text(740, 677, 'Every arrow points inward. Swap DB, broker or UI and the', { size: 13.5 });
  b += text(740, 699, 'domain does not recompile; tests run in milliseconds.', { size: 13.5 });
  return svg(W, H, 'Layered vs hexagonal architecture', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['02-subdomains'] = () => {
  const W = 1280, H = 700;
  let b = heading(W, 'World-Check problem space: subdomains',
    'Invest design effort where the competitive advantage is; buy or reuse the rest');
  const cols = [
    ['CORE', 'Why clients pay LSEG', C.navy, '#fff', [
      ['Screening & Matching', 'name + secondary-ID scoring, false-positive reduction'],
      ['Case remediation', 'resolutions, four-eyes, audit-grade rationale'],
      ['Ongoing monitoring', 'rescreen on corpus change, prioritised alerts'],
    ], 'Rich DDD: aggregates, events, best engineers, deep tests'],
    ['SUPPORTING', 'Needed, specific to us, not a differentiator', C.teal, '#fff', [
      ['Batch screening', 'file ingestion, chunking, replay'],
      ['Client & entitlements', 'client groups, product features, API keys'],
      ['Case reporting', 'exports, evidence packs for regulators'],
    ], 'Simpler models; CRUD is fine where rules are thin'],
    ['GENERIC', 'Solved problems; buy or reuse', C.slate, '#fff', [
      ['Identity & SSO', 'OIDC provider, MFA'],
      ['Notifications', 'email / webhook delivery'],
      ['Billing & usage metering', 'off-the-shelf or platform team'],
    ], 'Integrate through an ACL; never let their model leak in'],
  ];
  cols.forEach(([name, why, fill, color, items, strategy], i) => {
    const x = 40 + i * 410;
    b += rect(x, 120, 390, 540, { fill: C.mist, rx: 14, shadow: false });
    b += box(x, 120, 390, 74, name, [why], { fill, color, rx: 14, titleSize: 19 });
    items.forEach(([t, d], j) => {
      b += box(x + 20, 220 + j * 112, 350, 92, t, [d], { fill: '#fff', color: C.ink, stroke: fill, sw: 2, titleSize: 15.5, lineSize: 12.5 });
    });
    b += rect(x + 20, 566, 350, 72, { fill: fill === C.navy ? C.amberLight : '#fff', stroke: C.line, rx: 8, shadow: false });
    b += text(x + 36, 592, 'Strategy', { size: 12, weight: 700, fill: C.slate });
    b += text(x + 36, 614, strategy, { size: 12.5 });
  });
  return svg(W, H, 'World-Check subdomains', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['03-context-map'] = () => {
  const W = 1280, H = 820;
  let b = heading(W, 'Context map: World-Check screening landscape',
    'Bounded contexts and the relationship pattern on every edge (U = upstream, D = downstream)');
  const ctx = {
    clients: [60, 140, 250, 90, 'API & UI clients', ['banks, fintechs, WC One UI'], C.slate],
    screening: [470, 300, 340, 130, 'Screening & Case', ['THIS COURSE: ScreeningCase aggregate', 'core domain'], C.navy],
    corpus: [980, 140, 260, 100, 'Risk Intelligence Data', ['profiles, sources, versions'], C.teal],
    monitoring: [980, 330, 260, 100, 'Ongoing Monitoring', ['rescreen triggers, alerts'], C.navy],
    entitlements: [60, 330, 250, 100, 'Client & Entitlements', ['groups, features, API keys'], C.teal],
    audit: [470, 560, 340, 100, 'Audit & Reporting', ['immutable history, evidence'], C.teal],
    identity: [60, 560, 250, 100, 'Identity (generic)', ['OIDC / SSO provider'], C.slate],
    notify: [980, 560, 260, 100, 'Notifications (generic)', ['email, webhooks'], C.slate],
  };
  for (const [, [x, y, w, h, t, ls, f]] of Object.entries(ctx)) b += box(x, y, w, h, t, ls, { fill: f });
  // edges
  b += line(310, 205, 470, 330, { color: 'navy', sw: 2.5 });
  b += label(390, 252, 'OHS / PL: REST API v1');
  b += line(980, 200, 812, 330, { color: 'teal', sw: 2.5 });
  b += label(900, 245, 'U → D, ACL in Screening');
  b += line(810, 380, 978, 380, { color: 'purple', sw: 2.5 });
  b += label(894, 362, 'events (PL)');
  b += path('M980,410 C900,460 860,430 812,415', { color: 'purple', sw: 2.5, dash: '7 4' });
  b += label(900, 452, 'RescreenCase (C/S)');
  b += line(1110, 240, 1110, 330, { color: 'teal', sw: 2.2 });
  b += label(1110, 286, 'ProfileUpdated');
  b += line(310, 380, 470, 370, { color: 'teal', sw: 2.5 });
  b += label(390, 400, 'Customer / Supplier');
  b += line(640, 430, 640, 560, { color: 'purple', sw: 2.5 });
  b += label(640, 495, 'events → Conformist');
  b += line(185, 560, 185, 432, { color: 'slate', sw: 2, dash: '5 4' });
  b += label(185, 497, 'Conformist (OIDC)');
  b += line(1110, 432, 1110, 560, { color: 'purple', sw: 2.2 });
  b += label(1110, 497, 'alerts (PL)');
  b += rect(40, 700, 1200, 96, { fill: C.mist, rx: 10, shadow: false });
  b += text(60, 728, 'Patterns used', { size: 14, weight: 700, fill: C.navy });
  b += text(60, 752, 'OHS / PL – Open Host Service with a Published Language: one documented, versioned contract for many consumers.   ACL – Anti-Corruption Layer: translate upstream model at the border.', { size: 12.5 });
  b += text(60, 774, 'Customer / Supplier – downstream needs are negotiated into upstream backlog.   Conformist – downstream adopts upstream model as-is (cheap, but couples).', { size: 12.5 });
  return svg(W, H, 'Context map', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['04-event-storming'] = () => {
  const W = 1400, H = 760;
  let b = heading(W, 'Event Storming: screening a party (process level)',
    'Read left to right. Orange = what happened. Everything else explains why and who.');
  const S = 112, G = 16;
  const row1 = [
    ['Onboarding\nanalyst', C.stickyActor], ['Submit party\nfor screening', C.stickyCommand], ['Screening\nCase', C.stickyAggregate],
    ['Case\nOpened', C.stickyEvent], ['Whenever opened\n→ screen it', C.stickyPolicy], ['Screen\ncase', C.stickyCommand],
    ['Risk data\ncorpus', C.stickyExternal], ['Case\nScreened', C.stickyEvent], ['Analyst\nwork queue', C.stickyReadModel],
  ];
  const row2 = [
    ['Analyst', C.stickyActor], ['Resolve\nmatch', C.stickyCommand], ['Screening\nCase', C.stickyAggregate], ['Match\nResolved', C.stickyEvent],
    ['Who may\ndowngrade a\npositive?', C.stickyHotspot], ['Close\ncase', C.stickyCommand], ['Case\nClosed', C.stickyEvent],
    ['Whenever closed\nwith risk →\nnotify client', C.stickyPolicy], ['Notifications', C.stickyExternal],
  ];
  const draw = (row, y) => row.forEach(([t, c], i) => {
    const x = 50 + i * (S + G + 20);
    b += sticky(x, y, S, S * 0.82, t, c, { size: 12.5, rotate: i % 2 ? 1 : -1 });
    if (i < row.length - 1) b += line(x + S + 2, y + S * 0.41, x + S + G + 18, y + S * 0.41, { color: 'slate', sw: 1.6 });
  });
  b += line(50, 300, 1350, 300, { color: 'ink', sw: 2 });
  b += text(1350, 290, 'time →', { size: 13, anchor: 'end', fill: C.slate, weight: 700 });
  draw(row1, 140);
  draw(row2, 340);
  b += rect(50, 470, 640, 250, { fill: C.mist, rx: 12, shadow: false });
  b += text(70, 500, 'Legend', { size: 15, weight: 700, fill: C.navy });
  b += legend(70, 530, [
    [C.stickyEvent, 'Domain event – past tense, business language'], [C.stickyCommand, 'Command – intention, imperative'],
    [C.stickyAggregate, 'Aggregate – accepts/rejects commands, emits events'], [C.stickyPolicy, 'Policy – "whenever X, then Y" (reactive logic)'],
    [C.stickyReadModel, 'Read model – data a person needs to decide'], [C.stickyExternal, 'External system / other context'],
    [C.stickyHotspot, 'Hotspot – question, conflict, risk'],
  ], { gap: 25 });
  b += rect(720, 470, 630, 250, { fill: C.amberLight, rx: 12, shadow: false });
  b += text(740, 500, 'What this board told us', { size: 15, weight: 700, fill: C.navy });
  const notes = [
    '• One aggregate (Screening Case) handles all four commands → one consistency boundary.',
    '• "Whenever opened → screen it" is a policy: can be automatic or a button – a product choice.',
    '• Risk data is another context → we need a port (ReferenceDataSource) and an ACL.',
    '• Hotspot became an invariant: FOUR_EYES (a 2nd analyst must downgrade a positive).',
    '• "Notify client" crosses a context → integration event via outbox, not a direct call.',
    '• Event names became Java records: CaseOpened, CaseScreened, MatchResolved, CaseClosed.',
  ];
  notes.forEach((n, i) => { b += text(740, 532 + i * 30, n, { size: 13 }); });
  return svg(W, H, 'Event storming board', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['05-case-aggregate'] = () => {
  const W = 1280, H = 820;
  let b = heading(W, 'The ScreeningCase aggregate', 'One consistency boundary = one transaction = one repository');
  b += rect(40, 115, 760, 560, { fill: '#F7FAFC', stroke: C.navy, sw: 2.5, dash: '10 6', rx: 18, shadow: false });
  b += text(60, 142, 'AGGREGATE BOUNDARY', { size: 13, weight: 800, fill: C.navy });
  b += box(250, 160, 340, 150, 'ScreeningCase  «root»', [
    'id: CaseId    clientGroup: ClientGroupId', 'status: CaseStatus (derived)', 'outcome, screeningCount, version',
    'screen() · resolveMatch() · close()',
  ], { fill: C.navy, lineSize: 12.5, mono: false });
  b += box(80, 380, 300, 120, 'Match  «entity»', ['id: MatchId   profileId: ProfileId', 'score, resolution, rationale', 'no public setters'], { fill: C.teal });
  b += box(460, 380, 300, 120, 'Match  «entity»', ['one per ReferenceProfile', 'never removed (audit)', 'changed only via the root'], { fill: C.teal });
  b += line(330, 312, 240, 378, { color: 'navy', sw: 2 });
  b += line(510, 312, 600, 378, { color: 'navy', sw: 2 });
  b += label(285, 345, '0..*');
  const vos = ['Party', 'PartyName', 'CountryCode', 'MatchScore', 'Resolution\nRationale'];
  vos.forEach((v, i) => { b += box(70 + i * 146, 540, 132, 70, v, [], { fill: C.amber, color: C.ink, titleSize: 13.5 }); });
  b += text(420, 645, 'Value objects: immutable records, validate themselves, equal by value', { size: 13, anchor: 'middle', fill: C.slate, italic: true });

  // outside refs
  b += box(860, 140, 380, 80, 'Client & Entitlements context', ['referenced by ClientGroupId only'], { fill: C.slate });
  b += box(860, 250, 380, 80, 'Risk Intelligence Data context', ['referenced by ProfileId only'], { fill: C.slate });
  b += line(592, 200, 858, 180, { color: 'slate', dash: '6 4' });
  b += line(762, 430, 858, 300, { color: 'slate', dash: '6 4' });
  b += box(860, 370, 380, 150, 'Domain events (raised, not sent)', ['CaseOpened', 'CaseScreened', 'MatchResolved', 'CaseClosed'], { fill: C.purple, mono: true });
  b += line(592, 260, 858, 420, { color: 'purple', sw: 2.5 });

  b += rect(860, 545, 380, 245, { fill: C.mist, rx: 12, shadow: false });
  b += text(878, 572, 'Invariants the root guarantees', { size: 14, weight: 700, fill: C.navy });
  ['1  Closed case accepts no commands', '2  ≤ 1 match per profile; rescreen keeps resolutions', '3  Matches are never deleted',
    '4  Resolution ≠ UNRESOLVED and has a rationale', '5  Four-eyes on downgrading a POSITIVE', '6  Close only if screened, none UNRESOLVED/POSSIBLE',
    '7  Status is derived, never set'].forEach((t, i) => { b += text(878, 600 + i * 26, t, { size: 12.8 }); });
  b += rect(40, 700, 760, 90, { fill: C.amberLight, rx: 10, shadow: false });
  b += text(60, 728, 'Design rules (Vernon)', { size: 14, weight: 700, fill: C.navy });
  b += text(60, 752, 'Model true invariants in consistency boundaries · design small aggregates ·', { size: 13 });
  b += text(60, 774, 'reference other aggregates by identity · use eventual consistency outside the boundary', { size: 13 });
  return svg(W, H, 'ScreeningCase aggregate', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['06-hexagon-ports-adapters'] = () => {
  const W = 1300, H = 860;
  let b = heading(W, 'Hexagonal architecture: Screening & Case service',
    'Ports are interfaces owned by the core. Adapters live outside and depend on them.');
  const cx = 650, cy = 440;
  b += hexagon(cx, cy, 300, { fill: C.tealLight, stroke: C.teal, sw: 3 });
  b += hexagon(cx, cy, 128, { fill: C.navy, stroke: C.navy, shadow: true });
  b += text(cx, cy - 30, 'DOMAIN', { size: 20, weight: 800, fill: '#fff', anchor: 'middle' });
  ['ScreeningCase · Match', 'Party · MatchScore', 'NameMatchingPolicy', 'CaseOpened … CaseClosed'].forEach((t, i) => {
    b += text(cx, cy - 4 + i * 20, t, { size: 12.5, fill: '#fff', anchor: 'middle' });
  });
  b += text(cx, 200, 'APPLICATION', { size: 16, weight: 800, fill: C.teal, anchor: 'middle' });
  b += text(cx, 222, 'CaseApplicationService: load → tenant check → domain call → save → outbox', { size: 12.5, fill: C.ink, anchor: 'middle' });
  b += text(cx, 684, 'plain Java – no framework imports (enforced by ArchUnit)', { size: 12.5, fill: C.slate, anchor: 'middle', italic: true });

  const inPorts = ['OpenCaseUseCase', 'ScreenCaseUseCase', 'ResolveMatchUseCase', 'CloseCaseUseCase', 'FindCaseQuery'];
  const outPorts = ['CaseRepository', 'IdempotencyStore', 'ReferenceDataSource', 'DomainEventOutbox', 'UnitOfWork'];
  inPorts.forEach((p, i) => { b += pill(345, 340 + i * 42, 182, 30, p, { stroke: C.teal }); });
  outPorts.forEach((p, i) => { b += pill(773, 340 + i * 42, 182, 30, p, { stroke: C.teal }); });
  b += text(436, 325, 'driving ports (port.in)', { size: 12, weight: 700, fill: C.teal, anchor: 'middle' });
  b += text(864, 325, 'driven ports (port.out)', { size: 12, weight: 700, fill: C.teal, anchor: 'middle' });

  const left = [
    [270, 'REST adapter', ['CaseController', '@Controller · @ExecuteOn(BLOCKING)']],
    [430, 'Tests', ['CaseApplicationServiceTest (fakes)', 'CaseApiTest (@MicronautTest)']],
    [590, 'Scheduler (exercise)', ['@Scheduled rescreen job', 'Kafka consumer']],
  ];
  left.forEach(([y, t, ls]) => {
    b += box(30, y, 250, 96, t, ls, { fill: C.amber, color: C.ink, titleSize: 14.5, lineSize: 11.8 });
  });
  b += line(282, 318, 343, 355, { color: 'navy', sw: 2.4 });
  b += line(282, 470, 343, 440, { color: 'navy', sw: 2.4 });
  b += line(282, 630, 343, 515, { color: 'navy', sw: 2.4, dash: '4 4' });

  const right = [
    [250, 'Micronaut Data JDBC', ['JdbcCaseRepository', 'JdbcIdempotencyStore (@Version lock)'], [355, 397]],
    [370, 'Reference data', ['InMemoryReferenceDataSource', 'HttpReferenceDataSource (ACL)'], [439]],
    [490, 'Outbox', ['OutboxEventAppender', 'OutboxRelay → IntegrationEventSink'], [481]],
    [610, 'Transactions', ['JdbcUnitOfWork', 'TransactionOperations<Connection>'], [523]],
  ];
  right.forEach(([y, t, ls, targets]) => {
    b += box(1020, y, 255, 96, t, ls, { fill: C.amber, color: C.ink, titleSize: 14.5, lineSize: 11.8 });
    targets.forEach((ty) => { b += line(1018, y + 48, 957, ty, { color: 'navy', sw: 2.2, dash: '6 4', hollow: true }); });
  });
  b += text(155, 250, 'DRIVING (primary) adapters', { size: 13, weight: 800, fill: C.ink, anchor: 'middle' });
  b += text(1147, 236, 'DRIVEN (secondary) adapters', { size: 13, weight: 800, fill: C.ink, anchor: 'middle' });

  b += rect(30, 745, 1245, 54, { fill: C.purpleLight, stroke: C.purple, rx: 10, shadow: false });
  b += text(50, 778, 'config.ApplicationWiring (@Factory) – composition root: builds CaseApplicationService and lets Micronaut plug the selected adapters into its ports.', { size: 13.5, weight: 600 });
  b += legend(40, 828, [['navy', 'uses (driving adapter calls a port)', 'line']]);
  b += legend(330, 828, [['navy', 'implements (driven adapter realises a port)', 'dash']]);
  b += text(1275, 832, 'All source-code dependencies point toward the domain.', { size: 13, weight: 700, fill: C.navy, anchor: 'end' });
  return svg(W, H, 'Hexagonal architecture ports and adapters', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['07-request-sequence'] = () => {
  const W = 1360, H = 980;
  let b = heading(W, 'One request end to end: PUT …/matches/{id}/resolution',
    'Who does what, in which ring, inside which transaction');
  const lanes = [
    ['Client', 120, C.slate], ['CaseController', 290, C.amber], ['CaseApplicationService', 490, C.teal], ['JdbcUnitOfWork', 680, C.amber],
    ['JdbcCaseRepository', 870, C.amber], ['ScreeningCase', 1060, C.navy], ['OutboxEventAppender', 1250, C.amber],
  ];
  lanes.forEach(([n, x, f]) => {
    b += box(x - 88, 112, 176, 44, n, [], { fill: f, color: f === C.amber ? C.ink : '#fff', titleSize: 12.5 });
    b += line(x, 158, x, 900, { color: C.line, sw: 1.5, dash: '4 5', head: 'none' });
  });
  b += rect(470, 300, 870, 400, { fill: 'rgba(42,157,143,0.07)', stroke: C.teal, sw: 1.5, dash: '8 5', rx: 8, shadow: false });
  b += text(1330, 318, 'one DB transaction', { size: 12, weight: 700, fill: C.teal, anchor: 'end' });
  const X = Object.fromEntries(lanes.map(([n, x]) => [n, x]));
  let y = 190;
  const msg = (from, to, t, { dashed = false, color = 'navy' } = {}) => {
    const x1 = X[from], x2 = X[to];
    b += line(x1, y, x2 + (x2 > x1 ? -4 : 4), y, { color, sw: 2, dash: dashed ? '6 4' : null });
    b += text((x1 + x2) / 2, y - 7, t, { size: 12, anchor: 'middle', mono: true });
    y += 44;
  };
  const self = (who, t, color = C.ink) => {
    const x = X[who];
    const leftward = x > 950;
    b += path(leftward ? `M${x},${y - 10} h-34 v20 h30` : `M${x},${y - 10} h34 v20 h-30`, { color: 'slate', sw: 1.6 });
    const w = Math.round(t.length * 6.4 + 16);
    const bx = leftward ? x - 42 - w : x + 40;
    b += rect(bx, y - 11, w, 22, { fill: '#fff', stroke: C.line, sw: 1, rx: 6, shadow: false });
    b += text(bx + 8, y + 4, t, { size: 12, fill: color });
    y += 44;
  };
  msg('Client', 'CaseController', 'PUT {resolution, rationale, analystId}');
  self('CaseController', '@Valid DTO → value objects → ResolveMatchCommand');
  msg('CaseController', 'CaseApplicationService', 'resolveMatch.resolve(cmd)   «port.in»');
  msg('CaseApplicationService', 'JdbcUnitOfWork', 'write(() -> …)  BEGIN');
  msg('CaseApplicationService', 'JdbcCaseRepository', 'findById(caseId)   «port.out»');
  msg('JdbcCaseRepository', 'CaseApplicationService', 'rehydrate(snapshot)  [SELECT case + matches]', { dashed: true, color: 'slate' });
  self('CaseApplicationService', 'belongsTo(clientGroup)? else CaseNotFound (404)');
  msg('CaseApplicationService', 'ScreeningCase', 'resolveMatch(matchId, POSITIVE, rationale, analyst, now)');
  self('ScreeningCase', 'invariants: open? rationale? four-eyes? → raise MatchResolved', C.navy);
  msg('CaseApplicationService', 'JdbcCaseRepository', 'save(case)  UPDATE … WHERE version = ?');
  msg('CaseApplicationService', 'OutboxEventAppender', 'append(case.pullEvents())  INSERT outbox_event');
  self('JdbcUnitOfWork', 'COMMIT  (or ROLLBACK on any exception)', C.teal);
  y += 6;
  msg('CaseApplicationService', 'CaseController', 'CaseView', { dashed: true, color: 'slate' });
  msg('CaseController', 'Client', '200 CaseResponse (application/json)', { dashed: true, color: 'slate' });

  b += rect(40, 790, 640, 160, { fill: C.redLight, rx: 10, shadow: false });
  b += text(60, 818, 'Failure paths', { size: 14, weight: 700, fill: C.red });
  ['DomainException (rule) → ROLLBACK → 422 problem+json {rule}', 'DomainException (INVALID_VALUE) → 400', 'OptimisticLockException → ConcurrentCaseUpdateException → 409',
    'Bean Validation on DTO → 400 before the core is touched'].forEach((t, i) => { b += text(60, 846 + i * 25, t, { size: 12.8, mono: true }); });
  b += rect(700, 790, 620, 160, { fill: C.purpleLight, rx: 10, shadow: false });
  b += text(720, 818, 'Later, asynchronously', { size: 14, weight: 700, fill: C.purple });
  ['OutboxRelay @Scheduled(fixedDelay = 2s)', '  SELECT … WHERE published_at IS NULL ORDER BY occurred_at', '  IntegrationEventSink.publish(event)   (log / Kafka)',
    '  UPDATE outbox_event SET published_at = now()'].forEach((t, i) => { b += text(720, 846 + i * 25, t, { size: 12.8, mono: true }); });
  return svg(W, H, 'Request sequence diagram', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['08-micronaut-compile-time-di'] = () => {
  const W = 1320, H = 760;
  let b = heading(W, 'Micronaut: dependency injection decided at compile time',
    'Annotation processors generate bean metadata, so runtime does no classpath scanning and no reflection');
  b += text(40, 135, 'Micronaut', { size: 18, weight: 800, fill: C.teal });
  const top = [
    ['Your source', ['@Singleton @Factory', '@Controller @Client', '@JdbcRepository', '@Serdeable @Valid'], C.slate],
    ['javac + processors', ['micronaut-inject-java', 'micronaut-data-processor', 'micronaut-serde-processor', 'validation-processor'], C.navy],
    ['Generated classes', ['$CaseController$Definition', '$…$Introspection', 'SQL for findByCaseId…', 'serializers, validators'], C.teal],
    ['Runtime BeanContext', ['loads definitions via', 'ServiceLoader (indexed)', 'calls constructors directly', 'no proxies via reflection'], C.navy],
  ];
  top.forEach(([t, ls, f], i) => {
    const x = 40 + i * 320;
    b += box(x, 155, 280, 160, t, ls, { fill: f, lineSize: 12.3, mono: i > 0 && i < 3 });
    if (i < top.length - 1) b += line(x + 282, 235, x + 318, 235, { color: 'teal', sw: 3 });
  });
  b += text(40, 368, 'Reflection-based DI (for comparison)', { size: 18, weight: 800, fill: C.red });
  const bottom = [
    ['Your source', ['annotations kept', 'for runtime'], C.slate],
    ['Startup: scan classpath', ['read every class', 'find annotations'], C.red],
    ['Startup: reflection', ['resolve constructors', 'build bytecode proxies'], C.red],
    ['Metadata in heap', ['caches, proxies', 'grow with app size'], C.red],
  ];
  bottom.forEach(([t, ls, f], i) => {
    const x = 40 + i * 320;
    b += box(x, 388, 280, 110, t, ls, { fill: f });
    if (i < bottom.length - 1) b += line(x + 282, 443, x + 318, 443, { color: 'red', sw: 3 });
  });
  b += rect(40, 530, 1240, 200, { fill: C.mist, rx: 12, shadow: false });
  b += text(60, 560, 'What that buys a regulated, high-scale platform', { size: 15, weight: 700, fill: C.navy });
  const pts = [
    ['Fast startup, low memory', 'scale-out pods start quickly; cheaper per instance'],
    ['Errors at build time', 'missing bean / bad query method name fails compilation, not production'],
    ['GraalVM native-image ready', 'little reflection config needed'],
    ['Predictable AOP', '@Transactional, @Validated, @Retryable woven at compile time'],
    ['Trade-off', 'annotation processors must be on the compiler path; incremental builds matter'],
  ];
  pts.forEach(([h, d], i) => {
    b += text(60, 592 + i * 27, `${h}:`, { size: 13.5, weight: 700 });
    b += text(300, 592 + i * 27, d, { size: 13.5 });
  });
  return svg(W, H, 'Micronaut compile-time dependency injection', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['09-outbox'] = () => {
  const W = 1320, H = 800;
  let b = heading(W, 'Transactional outbox: never save a case without its events',
    'The aggregate change and the event are written in the same database transaction');
  b += rect(40, 120, 470, 330, { fill: 'rgba(42,157,143,0.08)', stroke: C.teal, sw: 2, dash: '9 6', rx: 14, shadow: false });
  b += text(60, 148, 'ONE TRANSACTION (JdbcUnitOfWork)', { size: 13, weight: 800, fill: C.teal });
  b += box(70, 170, 410, 60, 'UPDATE screening_case', ['… WHERE id = ? AND version = ?'], { fill: C.navy, mono: false, lineSize: 12 });
  b += box(70, 245, 410, 60, 'INSERT / UPDATE case_match', ['one row per match'], { fill: C.navy, lineSize: 12 });
  b += box(70, 320, 410, 60, 'INSERT outbox_event', ['id = eventId, payload = published language JSON'], { fill: C.purple, lineSize: 12 });
  b += text(275, 420, 'COMMIT – all three, or none', { size: 14, weight: 700, fill: C.teal, anchor: 'middle' });
  b += cylinder(590, 180, 170, 210, 'H2 / Postgres', ['screening_case', 'case_match', 'outbox_event']);
  b += line(512, 285, 588, 285, { color: 'teal', sw: 3 });
  b += box(840, 140, 210, 100, 'OutboxRelay', ['@Scheduled 2s', 'oldest first'], { fill: C.amber, color: C.ink });
  b += path('M762,240 C800,240 800,190 838,190', { color: 'amber', sw: 2.5 });
  b += text(790, 175, 'poll', { size: 12, fill: C.slate });
  b += box(840, 290, 210, 100, 'Broker topic', ['screening.case-events', 'key = caseId'], { fill: C.slate, mono: false });
  b += line(945, 242, 945, 288, { color: 'slate', sw: 2.5 });
  const consumers = ['Ongoing Monitoring', 'Audit & Reporting', 'Client notifications'];
  consumers.forEach((c, i) => {
    b += box(1110, 130 + i * 100, 180, 76, c, ['dedupe by eventId'], { fill: C.navy, titleSize: 13.5, lineSize: 11.5 });
    b += line(1052, 340, 1108, 168 + i * 100, { color: 'purple', sw: 2 });
  });
  b += rect(40, 480, 620, 290, { fill: C.greenLight, rx: 12, shadow: false });
  b += text(60, 510, 'Outbox: what happens on a crash', { size: 15, weight: 700, fill: C.green });
  [
    ['Crash before COMMIT', 'nothing saved, nothing sent ✓'],
    ['Crash after COMMIT, before publish', 'relay sends it on restart ✓'],
    ['Crash after publish, before mark', 'sent twice → consumer dedupes ✓'],
    ['Broker down', 'rows wait in outbox, retried in order ✓'],
  ].forEach(([a, c], i) => {
    b += text(60, 548 + i * 52, a, { size: 13.5, weight: 700 });
    b += text(60, 570 + i * 52, c, { size: 13.5 });
  });
  b += rect(680, 480, 600, 290, { fill: C.redLight, rx: 12, shadow: false });
  b += text(700, 510, 'Dual write (save, then kafka.send) – why not', { size: 15, weight: 700, fill: C.red });
  [
    ['Crash between save and send', 'case changed, event lost forever ✗'],
    ['Send first, then DB fails', 'phantom event for a change that never happened ✗'],
    ['Send inside the DB transaction', 'broker latency holds row locks; still not atomic ✗'],
    ['Audit impact', 'monitoring/audit silently diverge from the case ✗'],
  ].forEach(([a, c], i) => {
    b += text(700, 548 + i * 52, a, { size: 13.5, weight: 700 });
    b += text(700, 570 + i * 52, c, { size: 13.5 });
  });
  return svg(W, H, 'Transactional outbox pattern', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['10-package-structure'] = () => {
  const W = 1320, H = 840;
  let b = heading(W, 'Package structure of the code lab', 'Packages mirror the rings; ArchUnit fails the build if an arrow points outward');
  b += rect(40, 115, 700, 600, { fill: C.amberLight, stroke: C.amber, sw: 2, rx: 22, shadow: false });
  b += text(60, 145, 'adapter  (Micronaut lives here)', { size: 15, weight: 800, fill: '#9A6512' });
  b += text(60, 170, 'in.rest · out.persistence · out.events · out.reference', { size: 13, mono: true });
  b += rect(100, 195, 580, 440, { fill: C.tealLight, stroke: C.teal, sw: 2, rx: 20, shadow: false });
  b += text(120, 225, 'application  (plain Java)', { size: 15, weight: 800, fill: C.teal });
  b += text(120, 250, 'CaseApplicationService · port.in.* · port.out.*', { size: 13, mono: true });
  b += rect(170, 280, 440, 280, { fill: C.navy, rx: 18, shadow: true });
  b += text(190, 312, 'domain  (plain Java, zero dependencies)', { size: 15, weight: 800, fill: '#fff' });
  ['model: ScreeningCase, Match, Party, …', 'event: CaseOpened … CaseClosed', 'service: NameMatchingPolicy', 'DomainException'].forEach((t, i) => {
    b += text(190, 345 + i * 26, t, { size: 13, fill: '#fff', mono: true });
  });
  b += text(190, 480, 'imports: java.* only', { size: 13, fill: '#F6C177', mono: true });
  b += line(390, 700, 390, 640, { color: 'navy', sw: 3 });
  b += label(540, 670, 'adapters → ports + domain');
  b += line(390, 625, 390, 566, { color: 'navy', sw: 3 });
  b += label(520, 597, 'application → domain');
  b += rect(40, 735, 700, 70, { fill: C.purpleLight, stroke: C.purple, rx: 12, shadow: false });
  b += text(60, 765, 'config  (composition root) → may see every ring', { size: 14, weight: 700, fill: C.purple });
  b += text(60, 787, 'ApplicationWiring @Factory, MatchingProperties @ConfigurationProperties', { size: 12.5, mono: true });

  const tree = [
    'src/main/java/training/worldcheck/screening/',
    '├── Application.java',
    '├── domain/',
    '│   ├── DomainException.java',
    '│   ├── model/   ScreeningCase, Match, Party, PartyName,',
    '│   │            CaseId, MatchScore, Resolution, …Snapshot',
    '│   ├── event/   DomainEvent (sealed), CaseOpened, …',
    '│   └── service/ NameMatchingPolicy, MatchEvaluation',
    '├── application/',
    '│   ├── CaseApplicationService.java',
    '│   ├── port/in/  OpenCaseUseCase, …, CaseView',
    '│   └── port/out/ CaseRepository, UnitOfWork, …',
    '├── adapter/',
    '│   ├── in/rest/          CaseController, ApiModels,',
    '│   │                     ProblemHandlers',
    '│   ├── out/persistence/  JdbcCaseRepository, rows,',
    '│   │                     JdbcUnitOfWork',
    '│   ├── out/events/       OutboxEventAppender, OutboxRelay',
    '│   └── out/reference/    InMemory…, Http… (ACL)',
    '└── config/  ApplicationWiring, MatchingProperties',
    '',
    'src/main/resources/db/migration/V1__screening_schema.sql',
    'src/test/java/…/architecture/HexagonalArchitectureTest',
  ];
  b += rect(770, 115, 510, 690, { fill: '#0F1B2D', rx: 14, shadow: true });
  tree.forEach((t, i) => { b += text(790, 148 + i * 27.5, t, { size: 12.4, fill: '#DCE6F2', mono: true }); });
  return svg(W, H, 'Package structure', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['11-test-pyramid'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'Testing strategy per ring', 'Most confidence from the cheapest tests; the hexagon is what makes them cheap');
  const levels = [
    ['E2E / consumer contracts', 'Pact / OpenAPI diff · few staging journeys', C.slate, 200],
    ['Adapter integration – @MicronautTest', 'CaseApiTest (HTTP), JdbcCaseRepositoryTest (H2 + Flyway) · 8 tests · ~2 s', C.amber, 380],
    ['Application – fakes for every port', 'CaseApplicationServiceTest · 6 tests · ms · no framework', C.teal, 560],
    ['Domain unit tests', 'ScreeningCaseTest, NameMatchingPolicyTest · 27 tests · ms · pure Java', C.navy, 740],
  ];
  const cx = 480;
  levels.forEach(([t, d, f, w], i) => {
    const y = 130 + i * 140;
    const nextW = w + 180;
    b += `  <polygon points="${cx - w / 2},${y} ${cx + w / 2},${y} ${cx + nextW / 2},${y + 128} ${cx - nextW / 2},${y + 128}" fill="${f}" filter="url(#shadow)"/>\n`;
    b += text(cx, y + 56, t, { size: 16, weight: 800, fill: f === C.amber ? C.ink : '#fff', anchor: 'middle' });
    b += text(cx, y + 82, d, { size: 12.5, fill: f === C.amber ? C.ink : '#fff', anchor: 'middle' });
  });
  b += rect(1010, 130, 240, 548, { fill: C.purple, rx: 14, shadow: true });
  b += text(1130, 175, 'Architecture', { size: 17, weight: 800, fill: '#fff', anchor: 'middle' });
  b += text(1130, 198, 'tests (ArchUnit)', { size: 17, weight: 800, fill: '#fff', anchor: 'middle' });
  ['5 rules, every build:', '', '• dependencies point', '  inwards (onion rule)', '• domain: plain Java', '• application: plain Java', '• adapters call ports,', '  never the service', '• only storage adapters', '  touch Micronaut Data'].forEach((t, i) => {
    b += text(1030, 240 + i * 24, t, { size: 13, fill: '#fff' });
  });
  b += text(40, 724, 'Run all 46: cd plan/training/code-lab && ../../../mvnw test', { size: 14, mono: true, fill: C.navy, weight: 700 });
  return svg(W, H, 'Test pyramid', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['12-bean-resolution'] = () => {
  const W = 1280, H = 700;
  let b = heading(W, 'Swapping an adapter with configuration, not code',
    'Micronaut evaluates @Requires at startup and injects exactly one ReferenceDataSource');
  b += box(40, 130, 330, 140, 'application.yml', ['screening:', '  reference-data:', '    mode: in-memory   # or http'], { fill: '#0F1B2D', mono: true, align: 'start', lineSize: 13 });
  b += box(40, 300, 330, 110, 'or override at launch', ['-Dscreening.reference-data.mode=http', 'SCREENING_REFERENCE_DATA_MODE=http'], { fill: '#0F1B2D', mono: true, align: 'start', lineSize: 12 });
  b += box(450, 150, 360, 110, 'InMemoryReferenceDataSource', ['@Requires(property = "…mode",', '  value = "in-memory", defaultValue = "in-memory")'], { fill: C.amber, color: C.ink, mono: true, lineSize: 11.2, titleSize: 14 });
  b += box(450, 300, 360, 110, 'HttpReferenceDataSource', ['@Requires(property = "…mode", value = "http")', '+ @Client("reference-data") + ACL translate()'], { fill: C.amber, color: C.ink, mono: true, lineSize: 11.2, titleSize: 14 });
  b += line(372, 200, 448, 205, { color: 'green', sw: 2.6 });
  b += line(372, 355, 448, 355, { color: 'slate', sw: 2, dash: '5 4' });
  b += label(410, 182, 'active');
  b += box(890, 210, 350, 140, 'ApplicationWiring', ['caseApplicationService(', '  …, ReferenceDataSource referenceData, …)', '→ new CaseApplicationService(...)'], { fill: C.purple, mono: true, lineSize: 11.5 });
  b += line(812, 205, 888, 250, { color: 'green', sw: 2.6 });
  b += line(812, 355, 888, 320, { color: 'slate', sw: 2, dash: '5 4' });
  b += rect(40, 450, 1200, 210, { fill: C.mist, rx: 12, shadow: false });
  b += text(60, 480, 'Other selection tools you will use', { size: 15, weight: 700, fill: C.navy });
  [
    ['@Requires(env = "test")', 'bean only exists in tests (e.g. a fake clock)'],
    ['@Requires(notEnv = Environment.TEST)', 'keep a scheduler out of unit tests'],
    ['@Requires(beans = DataSource.class)', 'only when another bean exists'],
    ['@Replaces(InMemoryReferenceDataSource.class)', 'override a bean from a library or test'],
    ['@Named("primary") / @Primary', 'choose among several beans of one type'],
    ['@MockBean (micronaut-test)', 'replace a port with a mock inside @MicronautTest'],
  ].forEach(([a, d], i) => {
    b += text(60, 512 + i * 24, a, { size: 13, mono: true, weight: 700 });
    b += text(520, 512 + i * 24, d, { size: 13 });
  });
  return svg(W, H, 'Micronaut bean resolution', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['13-ongoing-monitoring-saga'] = () => {
  const W = 1320, H = 760;
  let b = heading(W, 'Across contexts: ongoing monitoring as a process manager',
    'Eventual consistency between aggregates and contexts, driven by events and commands');
  const lanes = [
    ['Risk Intelligence\nData', C.teal], ['Ongoing Monitoring\n(process manager)', C.purple], ['Screening & Case', C.navy], ['Notifications', C.slate],
  ];
  lanes.forEach(([n, f], i) => {
    const y = 120 + i * 140;
    b += rect(40, y, 1240, 124, { fill: i % 2 ? C.mist : '#fff', stroke: C.line, rx: 8, shadow: false });
    b += box(40, y, 210, 124, n, [], { fill: f, titleSize: 14, rx: 8 });
  });
  const step = (x, lane, t, color, n) => {
    const y = 140 + lane * 140;
    b += box(x, y, 190, 84, t, [], { fill: '#fff', color: C.ink, stroke: color, sw: 2.2, titleSize: 12.8 });
    b += `  <circle cx="${x}" cy="${y}" r="13" fill="${color}"/>\n` + text(x, y + 4.5, String(n), { size: 12.5, weight: 800, fill: '#fff', anchor: 'middle' });
  };
  step(290, 0, 'ProfileUpdated\n(WC-1001 new alias)', C.teal, 1);
  step(520, 1, 'Find open cases\nmatching profile', C.purple, 2);
  step(750, 1, 'for each case:\nsend RescreenCase', C.purple, 3);
  step(750, 2, 'ScreenCaseUseCase\n(same port as REST)', C.navy, 4);
  step(980, 2, 'CaseScreened\n(newMatches = 1)', C.navy, 5);
  step(980, 1, 'newMatches > 0 ?\nraise alert', C.purple, 6);
  step(1080, 3, 'Notify client\ncompliance team', C.slate, 7);
  b += line(482, 182, 518, 322, { color: 'teal', sw: 2.2 });
  b += line(712, 322, 748, 322, { color: 'purple', sw: 2.2 });
  b += line(845, 366, 845, 418, { color: 'purple', sw: 2.2 });
  b += line(942, 462, 978, 462, { color: 'navy', sw: 2.2 });
  b += line(1075, 418, 1075, 366, { color: 'navy', sw: 2.2 });
  b += line(1120, 366, 1150, 558, { color: 'purple', sw: 2.2 });
  b += rect(40, 690, 1240, 50, { fill: C.amberLight, rx: 8, shadow: false });
  b += text(60, 721, 'Rules: one aggregate per transaction · commands are idempotent (caseId + profile version) · the process manager keeps its own state, never edits a ScreeningCase directly.', { size: 13 });
  return svg(W, H, 'Ongoing monitoring process manager', b);
};

for (const [name, render] of Object.entries(diagrams)) {
  writeFileSync(join(OUT, `${name}.svg`), render());
  console.log(`wrote ${name}.svg`);
}
