// Generates every course diagram as SVG into ../assets/diagrams.
// Run: node plan/training1/tools/build-diagrams.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, svg, rect, text, box, line, path, label, pill, sticky, cylinder, heading, legend } from './svg.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'diagrams');
mkdirSync(OUT, { recursive: true });
const diagrams = {};

const RING = {
  ent: { fill: C.entLight, stroke: C.ent, ink: C.entDark, name: 'ENTITIES' },
  uc: { fill: C.ucLight, stroke: C.uc, ink: C.ucDark, name: 'USE CASES' },
  ia: { fill: C.iaLight, stroke: C.ia, ink: C.iaDark, name: 'INTERFACE ADAPTERS' },
  fw: { fill: C.fwLight, stroke: C.fw, ink: C.fwDark, name: 'FRAMEWORKS & DRIVERS' },
  main: { fill: C.purpleLight, stroke: C.purple, ink: C.purple, name: 'MAIN' },
};
/** A white box outlined in its ring's colour; interfaces are dashed. */
const rbox = (x, y, w, h, ring, title, lines = [], opts = {}) => box(x, y, w, h, title, lines, {
  fill: opts.fill ?? '#fff', color: C.ink, stroke: RING[ring].stroke, sw: 2.2, titleSize: opts.titleSize ?? 14, lineSize: opts.lineSize ?? 12, mono: opts.mono ?? false, shadow: false, dash: opts.dash ?? null, align: opts.align ?? 'middle', sub: opts.sub ?? null,
});
const iface = (x, y, w, h, ring, title, lines = [], opts = {}) => rbox(x, y, w, h, ring, title, lines, { ...opts, dash: '6 4' });
const band = (x, y, w, h, ring, caption, { rx = 18, size = 13 } = {}) => rect(x, y, w, h, { fill: RING[ring].fill, stroke: RING[ring].stroke, sw: 2, rx, shadow: false })
  + text(x + 14, y + 22, caption ?? RING[ring].name, { size, weight: 800, fill: RING[ring].ink });
const note = (x, y, w, h, str, { fill = C.amberLight, size = 13 } = {}) => rect(x, y, w, h, { fill, rx: 8, shadow: false }) + text(x + 16, y + 26, str, { size, lineHeight: 1.45 });
const circle = (cx, cy, r, fill, stroke, sw = 2.5) => `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>\n`;

// ---------------------------------------------------------------------------------------------
diagrams['01-clean-rings'] = () => {
  const W = 1280, H = 820;
  let b = heading(W, 'Clean Architecture: four rings and one rule',
    'Source-code dependencies point inward only. Each ring is a Maven module in the code lab.');
  const cx = 470, cy = 455;
  b += circle(cx, cy, 335, RING.fw.fill, RING.fw.stroke);
  b += circle(cx, cy, 255, RING.ia.fill, RING.ia.stroke);
  b += circle(cx, cy, 175, RING.uc.fill, RING.uc.stroke);
  b += circle(cx, cy, 92, RING.ent.fill, RING.ent.stroke, 3);
  b += text(cx, cy - 300, 'FRAMEWORKS & DRIVERS', { size: 14, weight: 800, fill: RING.fw.ink, anchor: 'middle' });
  b += text(cx, cy - 280, 'Micronaut · Netty · Data JDBC · H2 · Serde', { size: 12, fill: RING.fw.ink, anchor: 'middle' });
  b += text(cx, cy - 222, 'INTERFACE ADAPTERS', { size: 14, weight: 800, fill: RING.ia.ink, anchor: 'middle' });
  b += text(cx, cy - 202, 'controllers · presenters · gateway implementations', { size: 12, fill: RING.ia.ink, anchor: 'middle' });
  b += text(cx, cy - 140, 'USE CASES', { size: 14, weight: 800, fill: RING.uc.ink, anchor: 'middle' });
  b += text(cx, cy - 120, 'interactors · boundaries · gateways', { size: 12, fill: RING.uc.ink, anchor: 'middle' });
  b += text(cx, cy - 6, 'ENTITIES', { size: 16, weight: 800, fill: RING.ent.ink, anchor: 'middle' });
  b += text(cx, cy + 16, 'ScreeningCase', { size: 12.5, fill: C.ink, anchor: 'middle' });
  b += text(cx, cy + 34, 'value objects · policy', { size: 12, fill: C.ink, anchor: 'middle' });
  b += text(cx, cy + 140, 'OpenCase · ScreenCase · ResolveMatch · …', { size: 12, fill: RING.uc.ink, anchor: 'middle' });
  b += text(cx, cy + 222, 'CaseController · CasePresenter · SqlCaseGateway', { size: 12, fill: RING.ia.ink, anchor: 'middle' });
  b += text(cx, cy + 300, 'CaseEndpoint · Micronaut*Records · MainWiring', { size: 12, fill: RING.fw.ink, anchor: 'middle' });
  for (const [x1, x2] of [[140, 208], [222, 288], [302, 370]]) b += line(x1, cy, x2, cy, { color: 'ink', sw: 3 });
  for (const [x1, x2] of [[800, 732], [718, 652], [638, 570]]) b += line(x1, cy, x2, cy, { color: 'ink', sw: 3 });
  b += label(cx - 255, cy - 26, 'dependencies point inward', { size: 12 });
  const rows = [
    ['ent', 'Entities · screening-entities', ['Enterprise business rules: true even with paper', 'ScreeningCase, Match, value objects,', 'NameMatchingPolicy, sealed DomainEvent', 'Depends on: the JDK only']],
    ['uc', 'Use cases · screening-usecases', ['Application business rules of this system', 'Interactors, input/output boundaries,', 'request/response models, gateway interfaces', 'Depends on: entities']],
    ['ia', 'Interface adapters · …-interface-adapters', ['Convert between use-case and outside formats', 'Controllers, presenters, view models,', 'SqlCaseGateway, OutboxRelay, ProfileTranslator', 'Depends on: use cases (and entities)']],
    ['fw', 'Frameworks & drivers · screening-app', ['Glue code and tools, kept humble', 'CaseEndpoint, Micronaut Data records, H2,', 'scheduler, sinks, and Main (MainWiring)', 'Depends on: everything + Micronaut']],
  ];
  rows.forEach(([r, t, ls], i) => {
    const y = 116 + i * 140;
    b += rect(850, y, 390, 128, { fill: RING[r].fill, stroke: RING[r].stroke, sw: 2, rx: 10, shadow: false });
    b += text(866, y + 26, t, { size: 14.5, weight: 800, fill: RING[r].ink });
    ls.forEach((l, k) => { b += text(866, y + 50 + k * 19, l, { size: 12.5, fill: C.ink, weight: k === 3 ? 700 : 400 }); });
  });
  b += note(850, 684, 390, 112, 'The Dependency Rule: "Nothing in an inner circle\ncan know anything at all about something in an\nouter circle" – no name, class, function or data\nformat declared outside.', { size: 13 });
  return svg(W, H, 'Clean Architecture rings', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['02-control-vs-dependency'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'Flow of control vs source-code dependency',
    'Control runs controller → interactor → presenter. Every import points into the use-case ring.');
  b += band(40, 120, 400, 590, 'ia', 'INTERFACE ADAPTERS (screening-interface-adapters)');
  b += band(470, 120, 400, 590, 'uc', 'USE CASES (screening-usecases)');
  b += rbox(70, 170, 340, 84, 'ia', 'CaseController', ['Forms shape check → ScreenCaseRequest', 'new CasePresenter() per request'], { mono: false });
  b += iface(500, 170, 340, 84, 'uc', '«input boundary» ScreenCase', ['void execute(ScreenCaseRequest,', '             CaseOutputBoundary)'], { mono: true });
  b += rbox(500, 340, 340, 90, 'uc', 'ScreenCaseInteractor', ['implements ScreenCase', 'uses CaseGateway, CaseOutputBoundary'], {});
  b += iface(500, 515, 340, 84, 'uc', '«output boundary» CaseOutputBoundary', ['presentCase(CaseResponse)', 'presentNotFound(id) · presentConflict(id) …'], { mono: false });
  b += rbox(70, 515, 340, 84, 'ia', 'CasePresenter', ['implements CaseOutputBoundary', 'builds ViewModel: status, labels, JSON'], {});
  b += line(410, 212, 498, 212, { color: 'ink', sw: 2.5 });
  b += label(454, 196, 'uses', { size: 11 });
  b += line(670, 340, 670, 256, { color: 'ink', sw: 2.5, hollow: true });
  b += label(706, 298, 'implements', { size: 11 });
  b += line(670, 430, 670, 513, { color: 'ink', sw: 2.5 });
  b += label(696, 472, 'uses', { size: 11 });
  b += line(410, 557, 498, 557, { color: 'ink', sw: 2.5, hollow: true });
  b += label(454, 541, 'implements', { size: 11 });
  b += path('M 300 256 C 330 330, 400 385, 498 385', { color: 'amber', sw: 3.5, dash: '10 6' });
  b += path('M 500 400 C 400 430, 330 455, 290 513', { color: 'amber', sw: 3.5, dash: '10 6' });
  b += label(300, 330, '① call', { size: 12, border: C.amber });
  b += label(318, 470, '② call back, outward', { size: 12, border: C.amber });
  b += text(900, 150, 'Why it works', { size: 18, weight: 800, fill: C.navy });
  b += note(900, 168, 340, 128, 'The interactor must call the presenter,\nwhich lives in an OUTER ring. It does so\nthrough CaseOutputBoundary – an interface\nthe use-case ring declares. Control goes\nout; the import still points in (DIP).', { size: 13, fill: C.ucLight });
  b += note(900, 312, 340, 128, 'Same trick for persistence: the interactor\ncalls CaseGateway (declared in ring 2);\nSqlCaseGateway in ring 3 implements it.\nIn the lab Maven enforces it: ring 2 has\nno dependency on ring 3 at all.', { size: 13, fill: C.ucLight });
  b += note(900, 456, 340, 106, 'Failures are outcomes, not exceptions\nthat leak: presentRuleViolation,\npresentNotFound, presentConflict – so\nonly the presenter knows 404/409/422.', { size: 13, fill: C.iaLight });
  b += legend(910, 600, [['ink', 'source-code dependency (import)', 'line'], ['ink', 'implements (interface)', 'dash'], ['amber', 'flow of control at runtime', 'line']], { size: 13 });
  return svg(W, H, 'Flow of control versus source-code dependency', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['03-architecture-mapping'] = () => {
  const W = 1280, H = 720;
  let b = heading(W, 'Layered, hexagonal, onion, Clean – the same idea with different vocabulary',
    'Hexagonal, onion and Clean all invert the database-centric layering; Clean adds explicit boundaries and a Main');
  const cols = [['Layered (classic)', C.slate], ['Hexagonal (Cockburn)', C.teal], ['Onion (Palermo)', C.purple], ['Clean (Martin)', C.uc]];
  const rows = [
    ['Business rules', ['Service layer, mixed\nwith plumbing', 'Domain inside the\nhexagon', 'Domain model at\nthe centre', 'Entities ring\n(enterprise rules)']],
    ['Orchestration', ['Same service layer', 'Application services', 'Domain services +\napplication services', 'Interactors\n(application rules)']],
    ['Interfaces to the\noutside', ['DAO interfaces next\nto implementations', 'Ports (driving +\ndriven), owned inside', 'Repository interfaces\nin inner layers', 'Input/output boundaries\n+ gateways in ring 2']],
    ['Delivery code', ['Controllers on top', 'Driving adapters', 'UI / tests in the\nouter layer', 'Controllers +\npresenters (ring 3)']],
    ['Persistence code', ['Bottom layer – the\nfoundation', 'Driven adapters', 'Infrastructure in\nthe outer layer', 'Gateway impls (ring 3)\n+ drivers (ring 4)']],
    ['Response shaping', ['Controller or\nentity serialised', 'Adapter maps a view\nreturned by the port', 'Outer layer', 'Presenter called via the\noutput boundary']],
    ['Wiring', ['Framework scans\neverything', 'Config / composition\nroot', 'Composition root', 'Main component\n(MainWiring)']],
  ];
  const x0 = 40, labW = 210, colW = 252, y0 = 120, rowH = 78;
  cols.forEach(([t, color], i) => {
    const x = x0 + labW + i * colW;
    b += rect(x + 4, y0, colW - 8, 40, { fill: color, rx: 8, shadow: false });
    b += text(x + colW / 2, y0 + 26, t, { size: 15, weight: 800, fill: '#fff', anchor: 'middle' });
  });
  rows.forEach(([name, cells], r) => {
    const y = y0 + 50 + r * rowH;
    b += rect(x0, y, labW - 8, rowH - 8, { fill: C.mist, rx: 8, shadow: false });
    b += text(x0 + 14, y + (name.includes('\n') ? 28 : 40), name, { size: 14, weight: 700, fill: C.navy });
    cells.forEach((c, i) => {
      const x = x0 + labW + i * colW;
      b += rect(x + 4, y, colW - 8, rowH - 8, { fill: i === 3 ? C.ucLight : '#fff', stroke: C.line, sw: 1, rx: 8, shadow: false });
      b += text(x + colW / 2, y + 30, c, { size: 13, anchor: 'middle', lineHeight: 1.35 });
    });
  });
  return svg(W, H, 'Mapping of architecture styles', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['04-component-principles'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'Component principles and the main sequence',
    'Cohesion decides what goes in a module; coupling decides how modules may depend on each other');
  const cards = [
    ['REP', 'Reuse/Release Equivalence', 'What you release together must make\nsense together (one version, one jar).', C.teal],
    ['CCP', 'Common Closure', 'Gather what changes for the same reason\n(SRP for components).', C.teal],
    ['CRP', 'Common Reuse', 'Don\'t force users to depend on classes\nthey don\'t use (ISP for components).', C.teal],
    ['ADP', 'Acyclic Dependencies', 'No cycles in the module graph. Maven\nrejects them for you.', C.uc],
    ['SDP', 'Stable Dependencies', 'Depend in the direction of stability:\ntoward lower instability I.', C.uc],
    ['SAP', 'Stable Abstractions', 'A stable module should be abstract so\nit can be extended without change.', C.uc],
  ];
  cards.forEach(([k, t, d, color], i) => {
    const x = 40 + (i % 2) * 300, y = 120 + Math.floor(i / 2) * 150;
    b += rect(x, y, 285, 136, { fill: '#fff', stroke: color, sw: 2, rx: 10, shadow: false });
    b += rect(x, y, 285, 34, { fill: color, rx: 10, shadow: false });
    b += text(x + 14, y + 23, `${k} · ${t}`, { size: 14.5, weight: 800, fill: '#fff' });
    b += text(x + 14, y + 62, d, { size: 13, lineHeight: 1.45 });
  });
  b += text(40, 590, 'Cohesion principles (teal) pull toward small, focused modules.\nCoupling principles (orange) constrain the arrows between them.', { size: 13.5, fill: C.slate, lineHeight: 1.45 });
  b += note(40, 640, 585, 92, 'I = Ce / (Ca + Ce)   A = abstract types / all types   D = |A + I − 1|\nCa = modules that depend on me · Ce = modules I depend on', { size: 13.5, fill: C.mist });
  const gx = 700, gy = 130, gs = 520;
  const X = (I) => gx + I * gs, Y = (A) => gy + gs - A * gs;
  b += rect(gx, gy, gs, gs, { fill: '#F7F9FB', stroke: C.line, rx: 0, shadow: false });
  b += path(`M ${X(0)} ${Y(0)} L ${X(0)} ${Y(0.35)} A ${gs * 0.35} ${gs * 0.35} 0 0 0 ${X(0.35)} ${Y(0)} Z`, { color: C.red, sw: 0, fill: 'rgba(200,85,61,.12)', head: 'none' });
  b += path(`M ${X(1)} ${Y(1)} L ${X(1)} ${Y(0.65)} A ${gs * 0.35} ${gs * 0.35} 0 0 1 ${X(0.65)} ${Y(1)} Z`, { color: C.slate, sw: 0, fill: 'rgba(91,107,127,.12)', head: 'none' });
  b += line(X(0), Y(1), X(1), Y(0), { color: C.teal, sw: 2.5, dash: '8 5', head: 'none' });
  b += text(X(0.56), Y(0.5) - 6, 'main sequence', { size: 13, weight: 700, fill: C.teal });
  b += text(X(0.03), Y(0.22), 'zone of pain', { size: 13, weight: 700, fill: C.red });
  b += text(X(0.98), Y(0.96), 'zone of uselessness', { size: 13, weight: 700, fill: C.slate, anchor: 'end' });
  b += text(gx + gs / 2, gy + gs + 36, 'Instability I →', { size: 13.5, anchor: 'middle' });
  b += `  <text x="${gx - 22}" y="${gy + gs / 2}" font-size="13.5" text-anchor="middle" transform="rotate(-90 ${gx - 22} ${gy + gs / 2})" fill="${C.ink}">Abstractness A →</text>\n`;
  const pts = [['entities', 0, 1 / 29, C.ent], ['usecases', 1 / 3, 14 / 37, C.uc], ['adapters', 2 / 3, 4 / 32, C.ia], ['app', 1, 5 / 25, C.fw]];
  for (const [n, I, A, col] of pts) {
    b += circle(X(I), Y(A), 11, col, C.ink, 1.5);
    const right = I < 0.5;
    b += text(X(I) + (right ? 16 : -16), Y(A) - 14, `${n}  I=${I.toFixed(2)} A=${A.toFixed(2)} D=${Math.abs(A + I - 1).toFixed(2)}`, { size: 12, weight: 700, anchor: right ? 'start' : 'end' });
  }
  return svg(W, H, 'Component principles and the main sequence', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['05-module-graph'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'The code lab as a component graph',
    'Four Maven modules, one per ring. Arrows are <dependency> entries; only screening-app sees a framework.');
  const mods = [
    ['fw', 'screening-app', 'Ca 0 · Ce 3 · I 1.00 · A 0.20', ['CaseEndpoint, WorkQueueEndpoint, MalformedBodyHandler', 'Micronaut*Records, JdbcIdempotencyGateway, JdbcWorkQueueGateway', 'ScheduledOutboxRelay, LoggingEventSink, MainWiring'], 130],
    ['ia', 'screening-interface-adapters', 'Ca 1 · Ce 2 · I 0.67 · A 0.13', ['web: CaseController, CasePresenter, ViewModel, Forms', 'persistence: SqlCaseGateway, CaseRecords, CaseRecordMapper', 'events: OutboxEventGateway, OutboxRelay · reference: ProfileTranslator'], 290],
    ['uc', 'screening-usecases', 'Ca 2 · Ce 1 · I 0.33 · A 0.38', ['opencase, screencase, resolvematch, closecase, viewcase, workqueue', 'shared: CaseOutputBoundary, CaseResponse, Outcomes, CaseLookup', 'gateway: CaseGateway, EventOutboxGateway, TransactionRunner, …'], 450],
    ['ent', 'screening-entities', 'Ca 3 · Ce 0 · I 0.00 · A 0.03', ['model: ScreeningCase, Match, PartyName, CaseId, …', 'policy: NameMatchingPolicy · event: sealed DomainEvent', 'no dependencies at all – plain Java 21'], 610],
  ];
  for (const [r, name, metrics, ls, y] of mods) {
    b += rect(250, y, 620, 120, { fill: RING[r].fill, stroke: RING[r].stroke, sw: 2.5, rx: 12, shadow: true });
    b += text(270, y + 28, name, { size: 17, weight: 800, fill: RING[r].ink, mono: true });
    b += text(850, y + 28, metrics, { size: 12.5, weight: 700, fill: RING[r].ink, anchor: 'end' });
    ls.forEach((l, k) => { b += text(270, y + 56 + k * 21, l, { size: 12.5, mono: true }); });
  }
  b += line(560, 252, 560, 288, { color: 'ink', sw: 3 });
  b += line(560, 412, 560, 448, { color: 'ink', sw: 3 });
  b += line(560, 572, 560, 608, { color: 'ink', sw: 3 });
  b += path('M 250 210 C 170 260, 170 470, 248 500', { color: 'ink', sw: 2, dash: '5 4' });
  b += path('M 250 190 C 120 260, 120 620, 248 660', { color: 'ink', sw: 2, dash: '5 4' });
  b += path('M 870 350 C 950 420, 950 600, 872 660', { color: 'ink', sw: 2, dash: '5 4' });
  b += text(92, 400, 'app also\nimports\nboth inner\nmodules', { size: 12, fill: C.slate, anchor: 'middle' });
  b += text(1000, 520, 'adapters use\nentities via\nusecases\'s\ntransitive\ndependency', { size: 12, fill: C.slate, anchor: 'middle' });
  b += rect(930, 130, 310, 120, { fill: C.mist, stroke: C.line, rx: 10, shadow: false });
  b += text(946, 156, 'External (ring 4 only)', { size: 14, weight: 800, fill: C.fwDark });
  b += text(946, 180, 'micronaut-http-server-netty\nmicronaut-data-jdbc · flyway · h2\nmicronaut-serde-jackson · logback', { size: 12, mono: true, lineHeight: 1.45 });
  b += line(928, 190, 872, 190, { color: 'fw', sw: 2.5 });
  b += note(930, 280, 310, 140, 'Arrows go down the page and\nnever up: the graph is acyclic\n(ADP) and points toward lower\ninstability (SDP). Try adding an\nupward arrow in the component-\nmetrics simulator.', { size: 13 });
  return svg(W, H, 'Code lab module graph', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['06-subdomains-components'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'From subdomains to bounded contexts to rings',
    'Strategic DDD decides the boundaries between services; Clean Architecture organises the inside of each one');
  const subs = [
    ['Screening & Case', 'core', C.navy], ['Risk Intelligence Data', 'core', C.navy], ['Ongoing Monitoring', 'core', C.navy],
    ['Client & Entitlements', 'supporting', C.teal], ['Audit & Reporting', 'supporting', C.teal], ['Notifications', 'generic', C.slate],
  ];
  b += text(40, 130, 'Subdomains → bounded contexts', { size: 16, weight: 800, fill: C.navy });
  subs.forEach(([n, t, col], i) => {
    const y = 148 + i * 82;
    b += rect(40, y, 330, 68, { fill: i === 0 ? C.amberLight : '#fff', stroke: col, sw: i === 0 ? 3 : 1.8, rx: 10, shadow: false });
    b += text(58, y + 30, n, { size: 15, weight: 700, fill: C.ink });
    b += pill(258, y + 18, 96, 28, t, { stroke: col, mono: false, size: 12 });
    b += text(58, y + 52, i === 0 ? 'this course – zoomed in on the right' : t === 'generic' ? 'buy or reuse – thin rings, if any' : 'its own service and its own rings', { size: 12, fill: C.slate });
  });
  b += line(372, 182, 458, 300, { color: 'ink', sw: 2.5 });
  const x = 460, y = 130;
  b += band(x, y, 780, 590, 'fw', 'screening-app  (ring 4)');
  b += band(x + 30, y + 40, 720, 480, 'ia', 'screening-interface-adapters  (ring 3)');
  b += band(x + 60, y + 80, 660, 300, 'uc', 'screening-usecases  (ring 2)');
  b += band(x + 90, y + 120, 600, 120, 'ent', 'screening-entities  (ring 1)');
  b += text(x + 390, y + 182, 'ScreeningCase · Match · PartyName · NameMatchingPolicy', { size: 13, anchor: 'middle', mono: true });
  b += text(x + 390, y + 208, 'the ubiquitous language of the Screening context', { size: 12.5, anchor: 'middle', fill: C.entDark, italic: true });
  b += text(x + 390, y + 280, 'OpenCase · ScreenCase · ResolveMatch · CloseCase · ViewCase · ListWorkQueue', { size: 12.5, anchor: 'middle', mono: true });
  b += text(x + 390, y + 304, 'CaseGateway · ReferenceDataGateway · EventOutboxGateway', { size: 12.5, anchor: 'middle', mono: true });
  b += text(x + 390, y + 344, 'one package per use case – the architecture screams "screening"', { size: 12.5, anchor: 'middle', fill: C.ucDark, italic: true });
  const pins = [
    [x + 50, y + 400, 'Open Host Service', 'CaseController · CasePresenter · CaseJson'],
    [x + 290, y + 400, 'Anti-corruption layer', 'ProfileTranslator · RemoteReferenceData'],
    [x + 530, y + 400, 'Published language', 'EventJson v1 · OutboxRelay'],
  ];
  for (const [px, py, t, d] of pins) {
    b += rect(px, py, 220, 96, { fill: '#fff', stroke: C.ia, sw: 2, rx: 10, shadow: false });
    b += text(px + 110, py + 30, t, { size: 14, weight: 800, anchor: 'middle', fill: C.iaDark });
    b += text(px + 110, py + 56, d.split(' · ').join('\n'), { size: 12, anchor: 'middle', mono: true, lineHeight: 1.4 });
  }
  b += text(x + 390, y + 560, 'CaseEndpoint (HTTP) · MicronautReferenceDataClient (@Client) · LoggingEventSink · H2 · MainWiring', { size: 12.5, anchor: 'middle', mono: true, fill: C.fwDark });
  return svg(W, H, 'Subdomains to components', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['07-case-aggregate'] = () => {
  const W = 1280, H = 780;
  let b = heading(W, 'Ring 1: the ScreeningCase aggregate',
    'Plain Java 21, no annotations. Every invariant is enforced here, whoever calls – web, CLI, test or batch.');
  b += band(40, 120, 760, 620, 'ent', 'screening-entities · training.clean.screening.entities');
  b += box(70, 160, 700, 130, 'ScreeningCase  «aggregate root»', ['open(id, clientGroup, party, now) · screen(candidates, policy, now)', 'resolveMatch(matchId, resolution, rationale, analyst, now) · close(analyst, now)', 'snapshot() / rehydrate(snapshot) · pullEvents() · belongsTo(clientGroup)'], { fill: C.navy, titleSize: 17, lineSize: 12.5, mono: true });
  b += box(70, 316, 330, 110, 'Match  «entity»', ['MatchId · ProfileId · RiskCategory', 'MatchScore · Resolution', 'rationale · resolvedBy · resolvedAt'], { fill: C.entDark, titleSize: 15, lineSize: 12, mono: true });
  b += box(440, 316, 330, 110, 'NameMatchingPolicy  «domain service»', ['evaluate(party, profile) → MatchEvaluation', 'token-sort / token-set ratios', '+ DOB and country adjustments'], { fill: C.purple, titleSize: 14, lineSize: 12, mono: true });
  b += line(235, 290, 235, 314, { color: 'ink', sw: 2 });
  b += label(305, 302, '0..n, one per profile', { size: 11 });
  b += text(70, 460, 'Value objects (immutable records, validate themselves)', { size: 14, weight: 800, fill: C.entDark });
  const vos = ['CaseId', 'MatchId', 'ClientGroupId', 'AnalystId', 'PartyName', 'Party', 'CountryCode', 'EntityType', 'MatchScore', 'Resolution', 'ResolutionRationale', 'ReferenceProfile'];
  vos.forEach((v, i) => { b += pill(70 + (i % 4) * 176, 476 + Math.floor(i / 4) * 44, 164, 32, v, { stroke: C.ent, size: 12.5 }); });
  b += text(70, 636, 'Events (sealed interface DomainEvent)', { size: 14, weight: 800, fill: C.entDark });
  ['CaseOpened', 'CaseScreened', 'MatchResolved', 'CaseClosed'].forEach((e, i) => { b += sticky(70 + i * 176, 652, 164, 54, e, C.stickyEvent, { size: 13.5 }); });
  b += text(830, 140, 'Invariants', { size: 18, weight: 800, fill: C.navy });
  const inv = [
    'A closed case cannot be screened, resolved\nor closed again (CASE_CLOSED).',
    'At most one match per profile; rescreening\nupdates the score, keeps the resolution.',
    'Matches are never removed.',
    'Every resolution has a 10-2000 character\nrationale and an analyst.',
    'A POSITIVE may only be downgraded by a\ndifferent analyst (FOUR_EYES).',
    'Close only when screened at least once and\nno match is UNRESOLVED or POSSIBLE.',
    'Status is derived from the matches; there\nis no setStatus().',
  ];
  let yy = 160;
  inv.forEach((t, i) => {
    const h = t.includes('\n') ? 62 : 44;
    b += rect(830, yy, 410, h - 8, { fill: '#fff', stroke: C.line, sw: 1, rx: 8, shadow: false });
    b += text(846, yy + 22, `${i + 1}`, { size: 15, weight: 800, fill: C.uc });
    b += text(872, yy + 22, t, { size: 13, lineHeight: 1.35 });
    yy += h;
  });
  b += note(830, yy + 6, 410, 84, 'Uncle Bob\'s test for ring 1: would the rule\nexist if the bank screened on paper? Yes →\nit belongs here. No → it is an application rule.', { size: 13 });
  return svg(W, H, 'ScreeningCase aggregate', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['08-use-case-anatomy'] = () => {
  const W = 1280, H = 780;
  let b = heading(W, 'Ring 2: anatomy of one use case (ScreenCase)',
    'Each use case is a package with an input boundary, a request model and an interactor; shared types sit beside them');
  b += band(40, 120, 450, 620, 'uc', 'screening-usecases');
  b += text(60, 168, [
    'usecases/',
    '  screencase/',
    '    ScreenCase.java          «input boundary»',
    '    ScreenCaseRequest.java   request model',
    '    ScreenCaseInteractor.java',
    '  opencase/ resolvematch/ closecase/',
    '  viewcase/ workqueue/',
    '  shared/',
    '    CaseOutputBoundary.java  «output boundary»',
    '    CaseResponse.java        response model',
    '    Outcomes.java            failures → present*',
    '    CaseLookup.java          tenant check',
    '    CaseNotFoundException.java',
    '    RequestValues.java',
    '  gateway/',
    '    CaseGateway.java',
    '    ReferenceDataGateway.java',
    '    EventOutboxGateway.java',
    '    TransactionRunner.java',
    '    IdempotencyGateway.java',
    '    ConcurrentCaseUpdateException.java',
  ].join('\n'), { size: 13, mono: true, lineHeight: 1.6 });
  b += text(530, 140, 'ScreenCaseInteractor.execute(request, presenter)', { size: 17, weight: 800, fill: C.ucDark, mono: true });
  const steps = [
    ['ent', 'Build value objects from the request', 'new ClientGroupId(…), CaseId.of(…) – invalid → INVALID_VALUE'],
    ['uc', 'Read the party in a read transaction', 'transactions.read(() -> CaseLookup.load(cases, group, id).party())'],
    ['uc', 'Fetch candidates outside any write lock', 'referenceData.candidatesFor(party) – may be slow and remote'],
    ['uc', 'Write transaction: load again, act, save', 'CaseLookup.load(…) → case.screen(candidates, policy, now)'],
    ['ent', 'The entity enforces its invariants', 'CASE_CLOSED, one match per profile, derived status'],
    ['uc', 'Persist state and events atomically', 'cases.save(case); outbox.append(case.pullEvents())'],
    ['uc', 'Present the outcome after commit', 'presenter.presentCase(CaseResponse.from(case))'],
    ['uc', 'Any failure is presented, not thrown', 'Outcomes.presentingFailures → presentRuleViolation / NotFound / Conflict'],
  ];
  steps.forEach(([r, t, d], i) => {
    const y = 160 + i * 72;
    b += rect(530, y, 710, 62, { fill: '#fff', stroke: RING[r].stroke, sw: 2, rx: 10, shadow: false });
    b += circle(556, y + 31, 15, RING[r].stroke, 'none', 0);
    b += text(556, y + 36, `${i + 1}`, { size: 14, weight: 800, fill: '#fff', anchor: 'middle' });
    b += text(584, y + 26, t, { size: 14.5, weight: 700 });
    b += text(584, y + 47, d, { size: 12.2, mono: true, fill: C.slate });
  });
  return svg(W, H, 'Anatomy of a use case', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['09-request-sequence'] = () => {
  const W = 1280, H = 900;
  let b = heading(W, 'One request through every ring: POST …/cases/{id}/closure',
    'Rings are colour-coded. The presenter runs after commit or rollback; the endpoint only copies the view model.');
  const lanes = [
    ['Client', 'outside', C.slate], ['CaseEndpoint', 'fw', C.fw], ['CaseController', 'ia', C.ia], ['CloseCaseInteractor', 'uc', C.uc],
    ['TransactionRunner', 'fw', C.fw], ['SqlCaseGateway', 'ia', C.ia], ['ScreeningCase', 'ent', C.ent], ['OutboxEventGateway', 'ia', C.ia], ['CasePresenter', 'ia', C.ia],
  ];
  const X = (i) => 90 + i * 138;
  lanes.forEach(([n, r, col], i) => {
    b += rect(X(i) - 64, 112, 128, 44, { fill: r === 'outside' ? C.mist : RING[r].fill, stroke: col, sw: 2, rx: 8, shadow: false });
    b += text(X(i), 139, n, { size: 11.5, weight: 800, anchor: 'middle' });
    b += line(X(i), 156, X(i), 850, { color: C.line, sw: 1.5, dash: '4 4', head: 'none' });
  });
  const msgs = [
    [0, 1, 'POST {"analystId":"ana"}', 'ink'],
    [1, 2, 'close(group, id, CloseCaseForm)', 'fw'],
    [2, 2, 'Forms.errors() – shape only', 'ia'],
    [2, 3, 'execute(CloseCaseRequest, presenter)', 'ia'],
    [3, 3, 'ClientGroupId, CaseId, AnalystId', 'uc'],
    [3, 4, 'write(() -> …)  BEGIN', 'uc'],
    [4, 5, 'CaseLookup → cases.findById(id)', 'fw'],
    [5, 6, 'rehydrate(snapshot) + belongsTo(group)', 'ia'],
    [4, 6, 'case.close(analyst, now)', 'uc'],
    [6, 6, 'invariants ✓ → CaseClosed raised', 'ent'],
    [4, 5, 'cases.save(case)  UPDATE … AND version = ?', 'uc'],
    [4, 7, 'outbox.append(events)  INSERT outbox_event', 'uc'],
    [4, 3, 'COMMIT → CaseResponse', 'fw'],
    [3, 8, 'presentCase(response)', 'uc'],
    [8, 8, 'ViewModel(200, CaseJson, labels, actions)', 'ia'],
    [2, 1, 'presenter.viewModel()', 'ia'],
    [1, 0, '200 application/json', 'fw'],
  ];
  msgs.forEach(([a, c, t, color], i) => {
    const y = 190 + i * 38;
    if (a === c) {
      const left = X(a) > 1000;
      b += path(`M ${X(a)} ${y - 6} h ${left ? -26 : 26} v 14 h ${left ? 24 : -24}`, { color, sw: 1.8 });
      b += text(X(a) + (left ? -34 : 34), y + 5, t, { size: 11.5, mono: true, anchor: left ? 'end' : 'start' });
    } else {
      b += line(X(a), y, X(c) + (c > a ? -4 : 4), y, { color, sw: 2 });
      const mid = (X(a) + X(c)) / 2;
      b += label(mid, y - 11, t, { size: 10.5, weight: 500, padX: 5 });
    }
  });
  b += note(40, 842 - 12, 1200, 50, 'Failure path: if close() throws DomainException(MATCHES_AWAITING_REVIEW), TransactionRunner rolls back, Outcomes calls presentRuleViolation and the client gets 422 – nothing is written.', { size: 13 });
  return svg(W, H, 'Request sequence through the rings', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['10-module-structure'] = () => {
  const W = 1280, H = 820;
  let b = heading(W, 'Code lab structure: one Maven module per ring',
    'Packages scream the domain; the module boundary makes the dependency rule a compiler error');
  const cols = [
    ['ent', 'screening-entities', ['entities/', '  DomainException', '  model/', '    ScreeningCase  Match', '    CaseSnapshot  MatchSnapshot', '    CaseId MatchId ClientGroupId', '    AnalystId PartyName Party', '    CountryCode EntityType', '    MatchScore Resolution', '    ResolutionRationale', '    ReferenceProfile RiskCategory', '    CaseStatus CaseOutcome', '  policy/', '    NameMatchingPolicy', '    MatchEvaluation', '  event/', '    DomainEvent (sealed)', '    CaseOpened CaseScreened', '    MatchResolved CaseClosed'], 'tests: ScreeningCaseTest,\nNameMatchingPolicyTest'],
    ['uc', 'screening-usecases', ['usecases/', '  opencase/', '    OpenCase  OpenCaseRequest', '    OpenCaseInteractor', '  screencase/ resolvematch/', '  closecase/ viewcase/', '  workqueue/', '    ListWorkQueueInteractor', '    WorkQueueGateway …', '  shared/', '    CaseOutputBoundary', '    CaseResponse  Outcomes', '    CaseLookup  RequestValues', '  gateway/', '    CaseGateway', '    ReferenceDataGateway', '    EventOutboxGateway', '    TransactionRunner', '    IdempotencyGateway'], 'tests: CaseUseCasesTest,\nListWorkQueueInteractorTest'],
    ['ia', 'screening-interface-adapters', ['adapters/', '  web/', '    CaseController  Forms', '    CasePresenter  CaseJson', '    ViewModel  ProblemJson', '    WorkQueueController …', '  persistence/', '    SqlCaseGateway', '    CaseRecords  CaseRecord', '    CaseRecordMapper', '  events/', '    OutboxEventGateway', '    EventJson  OutboxRelay', '    IntegrationEventSink', '  reference/', '    InMemoryReferenceData', '    ProfileTranslator', '    RemoteReferenceData'], 'tests: CasePresenterTest,\nCaseControllerTest, …'],
    ['fw', 'screening-app', ['app/', '  Application', '  config/', '    MainWiring  (@Factory)', '    MatchingProperties', '    SerdeImports', '  web/', '    CaseEndpoint', '    WorkQueueEndpoint', '    Responses', '    MalformedBodyHandler', '  persistence/', '    CaseRow MatchRow …', '    Repositories', '    MicronautCaseRecords', '    MicronautTransactionRunner', '  events/  reference/', 'resources/', '  application.yml  db/migration'], 'tests: CaseApiTest,\nCleanArchitectureTest'],
  ];
  cols.forEach(([r, name, tree, tests], i) => {
    const x = 40 + i * 302;
    b += rect(x, 116, 290, 660, { fill: RING[r].fill, stroke: RING[r].stroke, sw: 2, rx: 12, shadow: false });
    b += text(x + 14, 142, RING[r].name, { size: 12, weight: 800, fill: RING[r].ink });
    b += text(x + 14, 164, name, { size: 14.5, weight: 800, mono: true });
    b += text(x + 14, 194, tree.join('\n'), { size: 12, mono: true, lineHeight: 1.55 });
    b += rect(x + 10, 706, 270, 56, { fill: '#fff', stroke: C.line, sw: 1, rx: 8, shadow: false });
    b += text(x + 22, 728, tests, { size: 12, mono: true, lineHeight: 1.4 });
  });
  for (let i = 0; i < 3; i++) b += line(40 + (i + 1) * 302 - 4, 90 + 60, 40 + i * 302 + 290 + 4, 90 + 60, { color: 'ink', sw: 2.5 });
  return svg(W, H, 'Module and package structure', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['11-micronaut-wiring'] = () => {
  const W = 1280, H = 760;
  let b = heading(W, 'Micronaut lives in ring 4 only',
    'Annotation processors run on screening-app; inner modules are plain jars that MainWiring assembles by hand');
  b += text(40, 135, 'Compile time', { size: 18, weight: 800, fill: C.navy });
  const jars = [['ent', 'screening-entities.jar'], ['uc', 'screening-usecases.jar'], ['ia', 'screening-interface-adapters.jar']];
  jars.forEach(([r, n], i) => { b += rbox(40, 160 + i * 74, 330, 58, r, n, ['no annotations · no BeanDefinitions'], { titleSize: 14, lineSize: 11.5 }); });
  b += rbox(40, 392, 330, 230, 'fw', 'screening-app (javac)', [
    'micronaut-inject-java → $Definition classes',
    '  for MainWiring, endpoints, handlers',
    'micronaut-serde-processor → serializers',
    '  incl. @SerdeImport(CaseJson, Forms…)',
    'micronaut-data-processor → JDBC',
    '  repository implementations + SQL',
    'micronaut-validation-processor',
  ], { titleSize: 15, lineSize: 12, align: 'start', mono: true });
  b += line(372, 260, 470, 330, { color: 'fw', sw: 2.5 });
  b += line(372, 505, 470, 420, { color: 'fw', sw: 2.5 });
  b += text(500, 135, 'Runtime: the Main component builds the object graph', { size: 18, weight: 800, fill: C.navy });
  b += box(480, 160, 300, 70, 'MainWiring  @Factory', ['the only class that knows every ring'], { fill: C.purple, titleSize: 15, lineSize: 12 });
  const beans = [
    [480, 270, 'fw', 'MicronautCaseRecords', '@Singleton (ring 4)'],
    [480, 345, 'ia', 'SqlCaseGateway', 'new SqlCaseGateway(records)'],
    [480, 420, 'uc', 'ScreenCaseInteractor', 'new …(cases, ref, outbox, tx, policy, clock)'],
    [480, 495, 'ia', 'CaseController', 'new CaseController(openCase, screenCase, …)'],
    [480, 570, 'fw', 'CaseEndpoint', '@Controller, injects CaseController'],
  ];
  beans.forEach(([x, y, r, t, d]) => { b += rbox(x, y, 300, 58, r, t, [d], { titleSize: 13.5, lineSize: 11, mono: false }); });
  for (let i = 0; i < 4; i++) b += line(630, 344 + i * 75, 630, 330 + i * 75, { color: 'ink', sw: 2 });
  b += line(630, 232, 630, 268, { color: 'purple', sw: 2 });
  b += text(820, 180, 'Rules the lab follows', { size: 16, weight: 800, fill: C.navy });
  const rules = [
    'Interactors are built in @Factory methods and\nexposed as their input-boundary type (OpenCase,\nScreenCase …) – never annotated themselves.',
    'Presenters are NOT beans: the controller makes\na new CasePresenter per request (it has state).',
    'Configuration is read at the edge and passed\nin as plain values: new NameMatchingPolicy(80).',
    '@Requires(property = "screening.reference-\ndata.mode") picks in-memory vs RemoteReferenceData\n– the use cases cannot tell the difference.',
    'Ring-3 records get JSON via @SerdeImport in\nring 4, so ring 3 stays framework-free.',
  ];
  let y = 200;
  rules.forEach((r) => {
    const h = r.split('\n').length * 19 + 22;
    b += rect(820, y, 420, h, { fill: '#fff', stroke: C.purple, sw: 1.5, rx: 8, shadow: false });
    b += text(836, y + 24, r, { size: 12.8, lineHeight: 1.45 });
    y += h + 10;
  });
  b += note(40, 650, 740, 80, 'Try it: add `import jakarta.inject.Singleton;` to an interactor. screening-usecases does not compile –\nthe module has no Micronaut on its classpath. That is the dependency rule enforced by Maven.', { size: 13 });
  return svg(W, H, 'Micronaut wiring', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['12-tests-per-ring'] = () => {
  const W = 1280, H = 740;
  let b = heading(W, 'A test suite per ring (79 tests in the lab)',
    'The further in, the cheaper each test and the fewer fakes it needs; the build itself tests the dependency rule');
  const rows = [
    ['fw', 'Ring 4 · screening-app · 14 tests', 'CaseApiTest (8) @MicronautTest + H2 · CleanArchitectureTest (6) ArchUnit', 'real: Netty, Serde, Data JDBC, Flyway, H2', '≈ 3 s', 760],
    ['ia', 'Ring 3 · interface adapters · 25 tests', 'CasePresenterTest · CaseControllerTest · SqlCaseGatewayTest · OutboxTest · ReferenceDataTest', 'fakes: InMemoryCaseRecords, InMemoryOutboxRecords; lambdas as boundaries', '< 1 s', 900],
    ['uc', 'Ring 2 · use cases · 13 tests', 'CaseUseCasesTest · ListWorkQueueInteractorTest', 'fakes: TestWorld gateways, TransactionRunner with rollback, RecordingPresenter', '< 0.5 s', 1040],
    ['ent', 'Ring 1 · entities · 27 tests', 'ScreeningCaseTest · NameMatchingPolicyTest', 'nothing to fake: plain objects and a fixed clock', '< 0.3 s', 1180],
  ];
  rows.forEach(([r, t, tests, fakes, time, w], i) => {
    const y = 120 + i * 130;
    const x = (W - w) / 2;
    b += rect(x, y, w, 112, { fill: RING[r].fill, stroke: RING[r].stroke, sw: 2.5, rx: 12, shadow: false });
    b += text(x + 20, y + 30, t, { size: 16, weight: 800, fill: RING[r].ink });
    b += text(x + w - 20, y + 30, time, { size: 15, weight: 800, fill: RING[r].ink, anchor: 'end' });
    b += text(x + 20, y + 60, tests, { size: 12.5, mono: true });
    b += text(x + 20, y + 86, fakes, { size: 12.5, fill: C.slate });
  });
  b += rect(40, 650, 1200, 62, { fill: C.purpleLight, stroke: C.purple, sw: 2, rx: 10, shadow: false });
  b += text(60, 676, 'The build is a test too: Maven module boundaries make "ring 1 imports Micronaut" a compile error;', { size: 13.5 });
  b += text(60, 698, 'ArchUnit covers what the compiler cannot (adapters.web never touches entities, only app.config builds interactors).', { size: 13.5 });
  return svg(W, H, 'Tests per ring', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['13-outbox'] = () => {
  const W = 1280, H = 700;
  let b = heading(W, 'Transactional outbox across the rings',
    'State and events commit together; a relay in ring 3, driven by a scheduler in ring 4, publishes them later');
  b += band(40, 120, 380, 450, 'uc', 'USE CASES');
  b += rbox(70, 160, 320, 150, 'uc', 'CloseCaseInteractor', ['transactions.write(() -> {', '  case.close(analyst, now);', '  cases.save(case);', '  outbox.append(case.pullEvents());', '})'], { mono: true, align: 'start', lineSize: 12.5 });
  b += iface(70, 340, 150, 56, 'uc', '«CaseGateway»', [], { titleSize: 12.5 });
  b += iface(240, 340, 150, 56, 'uc', '«EventOutbox\nGateway»', [], { titleSize: 12.5 });
  b += iface(70, 420, 320, 56, 'uc', '«TransactionRunner»', [], { titleSize: 12.5 });
  b += text(70, 520, 'ring 2 says WHAT must be atomic;\nit does not know there is a table.', { size: 12.5, fill: C.ucDark, lineHeight: 1.45 });
  b += band(450, 120, 380, 450, 'ia', 'INTERFACE ADAPTERS');
  b += rbox(480, 160, 320, 66, 'ia', 'SqlCaseGateway', ['UPDATE screening_case … AND version = ?'], { lineSize: 11.5 });
  b += rbox(480, 246, 320, 66, 'ia', 'OutboxEventGateway + EventJson', ['INSERT outbox_event (published language v1)'], { lineSize: 11.5 });
  b += rbox(480, 400, 320, 76, 'ia', 'OutboxRelay', ['publishPending(): oldest first, batch 100,', 'stop at the first failure (keeps order)'], { lineSize: 11.5 });
  b += line(392, 368, 478, 194, { color: 'ia', sw: 2, hollow: true, dash: '6 4' });
  b += line(392, 368, 478, 280, { color: 'ia', sw: 2, hollow: true, dash: '6 4' });
  b += band(860, 120, 380, 450, 'fw', 'FRAMEWORKS & DRIVERS');
  b += rbox(890, 160, 320, 56, 'fw', 'MicronautTransactionRunner', [], { titleSize: 13.5 });
  b += cylinder(940, 236, 220, 140, 'H2', ['screening_case', 'case_match', 'outbox_event']);
  b += rbox(890, 400, 320, 56, 'fw', 'ScheduledOutboxRelay @Scheduled', [], { titleSize: 13 });
  b += rbox(890, 476, 320, 56, 'fw', 'LoggingEventSink / KafkaEventSink', [], { titleSize: 13 });
  b += line(802, 200, 938, 280, { color: 'fw', sw: 2.5 });
  b += line(802, 280, 938, 320, { color: 'fw', sw: 2.5 });
  b += line(888, 428, 802, 436, { color: 'fw', sw: 2.5 });
  b += path('M 802 456 C 850 470, 860 500, 888 504', { color: 'fw', sw: 2.5 });
  b += line(1050, 378, 802, 418, { color: 'slate', sw: 1.8, dash: '5 4' });
  b += note(40, 600, 1200, 72, 'Crash after COMMIT and before publish? The row is still in outbox_event; the next tick publishes it (delay, not loss).\nCrash after publish and before marking? Published twice with the same eventId – consumers de-duplicate (idempotent consumer).', { size: 13 });
  return svg(W, H, 'Transactional outbox', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['14-packaging-options'] = () => {
  const W = 1280, H = 720;
  let b = heading(W, 'Four ways to package the same code – and what enforces the rule',
    'From "Clean Architecture" ch. 34 (Simon Brown): the devil is in the implementation details');
  const opts = [
    ['Package by layer', C.slate, ['web', 'service', 'repository'], 'nothing – everything public', 'compiles', 'Hides the domain; any layer can skip another.'],
    ['Package by feature', C.teal, ['casework/\ncontroller · service\nrepository · model'], 'package-private, partly', 'compiles', 'Screams the domain, but rules and plumbing share a package.'],
    ['Ports & adapters', C.navy, ['domain', 'application + ports', 'adapter.in / adapter.out'], 'ArchUnit in CI', 'test fails', 'The plan/training lab. Strong if the test is never skipped.'],
    ['Module per ring (this lab)', C.uc, ['entities.jar', 'usecases.jar', 'interface-adapters.jar', 'app.jar'], 'the compiler + ArchUnit', 'does not compile', 'Strongest; costs a few pom.xml files and a little ceremony.'],
  ];
  opts.forEach(([t, col, boxes, guard, res, d], i) => {
    const x = 40 + i * 302;
    b += rect(x, 116, 290, 560, { fill: '#fff', stroke: col, sw: 2.5, rx: 12, shadow: false });
    b += rect(x, 116, 290, 44, { fill: col, rx: 12, shadow: false });
    b += text(x + 145, 145, t, { size: 15, weight: 800, fill: '#fff', anchor: 'middle' });
    boxes.forEach((n, k) => {
      const y = 180 + k * (240 / boxes.length);
      const h = 240 / boxes.length - 12;
      b += rect(x + 24, y, 242, h, { fill: C.mist, stroke: C.line, sw: 1.2, rx: 8, shadow: false });
      b += text(x + 145, y + h / 2 + 5 - (n.split('\n').length - 1) * 9, n, { size: 13, anchor: 'middle', mono: true, lineHeight: 1.4 });
    });
    b += text(x + 20, 456, 'Enforced by', { size: 12.5, weight: 800, fill: C.slate });
    b += text(x + 20, 478, guard, { size: 13.5, weight: 700 });
    b += text(x + 20, 514, 'Try: CaseController imports SqlCaseGateway', { size: 12, fill: C.slate });
    b += pill(x + 20, 526, 250, 32, res, { stroke: res === 'compiles' ? C.red : C.green, color: res === 'compiles' ? C.red : C.green, size: 13 });
    b += text(x + 20, 594, d.replace(/(.{1,38})(\s|$)/g, '$1\n').trim(), { size: 12.8, lineHeight: 1.45 });
  });
  return svg(W, H, 'Packaging options', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['15-partial-boundaries'] = () => {
  const W = 1280, H = 720;
  let b = heading(W, 'Full and partial boundaries',
    'A full boundary costs interfaces, models and modules. Partial boundaries keep the option open for less.');
  const panels = [
    ['Full boundary (the lab)', C.uc, 'Input + output boundary, request/response\nmodels, gateways owned by ring 2, separate\nMaven modules. Independently deployable\nand testable. Most code, most safety.', 'Use for: the core domain, regulated rules,\nanything several delivery mechanisms share.'],
    ['Skip the last step', C.teal, 'Same interfaces and models, but in one\nmodule, separated by packages. Cheap to\nsplit later; easy to erode without ArchUnit.', 'Use for: a new service whose boundaries\nare still moving.'],
    ['One-dimensional boundary', C.purple, 'Only the Strategy half: a gateway interface\n(e.g. ReferenceDataGateway) with no\nreciprocal output boundary – callers get a\nreturn value.', 'Use for: a seam you want for testing or\nfor one swap (in-memory vs HTTP).'],
    ['Facade', C.slate, 'One class exposes all use cases and calls\nthe services behind it. Clients still\ndepend transitively on everything behind\nthe facade.', 'Use for: a supporting subdomain where\nthe cost of a boundary is not repaid.'],
  ];
  panels.forEach(([t, col, d, use], i) => {
    const x = 40 + (i % 2) * 610, y = 116 + Math.floor(i / 2) * 290;
    b += rect(x, y, 590, 270, { fill: '#fff', stroke: col, sw: 2.5, rx: 12, shadow: false });
    b += rect(x, y, 590, 42, { fill: col, rx: 12, shadow: false });
    b += text(x + 18, y + 28, t, { size: 16, weight: 800, fill: '#fff' });
    b += text(x + 18, y + 72, d, { size: 13.5, lineHeight: 1.5 });
    b += rect(x + 14, y + 186, 562, 68, { fill: C.mist, rx: 8, shadow: false });
    b += text(x + 28, y + 212, use, { size: 13, lineHeight: 1.45, weight: 600 });
  });
  return svg(W, H, 'Partial boundaries', b);
};

// ---------------------------------------------------------------------------------------------
diagrams['16-process-manager'] = () => {
  const W = 1280, H = 720;
  let b = heading(W, 'Ongoing monitoring: a process manager between two Clean services',
    'Each service keeps its own rings; they meet only through published events and gateway calls');
  b += band(40, 120, 560, 520, 'fw', 'monitoring-service', { size: 14 });
  b += band(60, 160, 520, 380, 'ia', 'adapters: event listener, ScreeningClientGateway', { size: 12 });
  b += band(80, 200, 480, 240, 'uc', 'use case: RescreenOnProfileUpdate (process manager)', { size: 12 });
  b += rbox(100, 240, 440, 80, 'uc', 'RescreenOnProfileUpdateInteractor', ['inbox dedupe → find watched cases → for each:', 'screening.rescreen(caseId) → record progress'], { lineSize: 12 });
  b += rbox(100, 340, 210, 76, 'ent', 'RescreenRun', ['entity: pending, done,', 'failed case ids'], { lineSize: 11.5 });
  b += iface(330, 340, 210, 76, 'uc', '«ScreeningGateway»', ['rescreen(caseId)'], { lineSize: 11.5 });
  b += rbox(80, 560, 230, 60, 'fw', 'Kafka listener', ['ProfileUpdated v3'], { lineSize: 11.5 });
  b += rbox(330, 560, 250, 60, 'fw', 'HTTP client / command topic', [], { titleSize: 13 });
  b += band(680, 120, 560, 520, 'fw', 'screening-case-service-clean', { size: 14 });
  b += band(700, 160, 520, 380, 'ia', 'adapters: CaseController (or command listener)', { size: 12 });
  b += band(720, 200, 480, 240, 'uc', 'use case: ScreenCase (the same interactor)', { size: 12 });
  b += rbox(740, 240, 440, 80, 'uc', 'ScreenCaseInteractor', ['candidates outside the write transaction,', 'save + outbox in one transaction'], { lineSize: 12 });
  b += rbox(740, 340, 440, 76, 'ent', 'ScreeningCase', ['invariant: CASE_CLOSED – a closed case is never', 'rescreened; the process manager decides what to do'], { lineSize: 11.5 });
  b += rbox(720, 560, 230, 60, 'fw', 'CaseEndpoint', [], { titleSize: 13 });
  b += rbox(970, 560, 250, 60, 'fw', 'OutboxRelay → sink', ['CaseScreened{newMatches}'], { lineSize: 11.5 });
  b += line(580, 590, 718, 590, { color: 'ink', sw: 2.5 });
  b += label(649, 572, 'RescreenCase', { size: 11.5 });
  b += path('M 1095 622 C 1095 690, 195 690, 195 622', { color: 'purple', sw: 2.5, dash: '8 5' });
  b += label(645, 676, 'CaseScreened event → alert if newMatches > 0', { size: 12, border: C.purple });
  b += path('M 110 558 C 60 500, 60 300, 98 282', { color: 'ink', sw: 2 });
  b += line(435, 418, 455, 556, { color: 'ink', sw: 2 });
  return svg(W, H, 'Process manager between services', b);
};

for (const [name, render] of Object.entries(diagrams)) {
  writeFileSync(join(OUT, `${name}.svg`), render());
  console.log(`wrote ${name}.svg`);
}
