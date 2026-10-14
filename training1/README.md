# DDD + Clean Architecture + Micronaut — zero to expert

The companion to [`../training`](../training/README.md) (hexagonal). It uses the same World-Check-style **screening
case service** and the same DDD model, rebuilt with Robert C. Martin's Clean Architecture: four rings, the dependency
rule, input and output boundaries, interactors, request and response models, presenters, gateways and a Main
component. Micronaut lives only in the outermost ring. You learn the principles (SOLID, component principles,
boundaries), then each ring from the inside out, then the whole system running, then how to lead a team to it.

| What | Where |
|---|---|
| Interactive course (18 modules, 24 simulators, quizzes, progress tracking) | [index.html](index.html) |
| Architecture and flow diagrams (16 SVGs, generated from code) | [diagrams.html](diagrams.html), [assets/diagrams/](assets/diagrams/) |
| Runnable reference service: 4 Maven modules, one per ring (Java 21, Micronaut 4.10, 79 tests) | [code-lab/](code-lab/README.md) |
| Running the course with a team (8-week cohort) | [facilitator-guide.md](facilitator-guide.md) |
| One-page reference for daily work and reviews | [cheatsheet.md](cheatsheet.md) |
| Clean vs hexagonal, measured on the two code labs, and when to choose which | [clean-vs-hexagonal.md](clean-vs-hexagonal.md) |

If you have already done the hexagonal course, skim modules 4–5 (the DDD material is shared) and read
`clean-vs-hexagonal.md` first.

## Open the course

Either double-click `index.html`, or serve the folder (better if your browser restricts local files):

```bash
cd plan/training1
python3 -m http.server 8766
# open http://127.0.0.1:8766/
```

Nothing is installed and nothing leaves your machine. Progress and quiz scores are stored in the browser's
`localStorage` (separately from the hexagonal course); reset them with the button at the bottom of the sidebar.
`Alt + ←/→` moves between modules.

## How the course is built

The simulators run the real design, not an animation of it:

- `assets/js/domain.js` is a JavaScript port of ring 1 (`screening-entities`): the `ScreeningCase` aggregate, value
  objects, events and `NameMatchingPolicy`.
- `assets/js/clean-system.js` ports rings 2–4 class by class: endpoint → controller → input boundary → interactor →
  entities and gateways → output boundary → presenter → view model. Every step emits a trace event tagged with its ring
  and the Java file it stands for, which is what Mission Control and the flow simulators display.

Two scripts keep the course honest:

```bash
node tools/check-model.mjs     # replays the code lab's curl session against the JS model: 16 checks
node tools/verify-course.mjs   # headless Chrome: opens all 18 modules, clicks every simulator, fails on any JS error
```

When Mission Control scores Viktor Albescu at 100 against WC-1001 or answers `422 FOUR_EYES`, the Java service returns
the same thing for the same input; [`code-lab/README.md`](code-lab/README.md) shows the curl session.

## Curriculum

About 22 hours of material, plus the code-lab exercises. Each module ends with a quiz; 80 % marks it complete.

| # | Level | Module | Simulators | Minutes |
|---|---|---|---|---|
| 0 | Start | Orientation: the course, the domain, the four rings | — | 25 |
| 1 | Foundation | Why architecture: policy, details and the cost of change | Change impact | 45 |
| 2 | Foundation | SOLID: the design principles under every ring | SOLID detector | 55 |
| 3 | Foundation | Component principles: cohesion, coupling and the main sequence | Component metrics | 60 |
| 4 | Foundation | Strategic DDD: subdomains, bounded contexts and where the rings go | Context map, Event Storming | 60 |
| 5 | Foundation | Ring 1 – Entities: a rich domain model with DDD | Entity or value object, aggregate rules, score lab | 80 |
| 6 | Practitioner | Ring 2 – Use cases: interactors, boundaries and models | Rule classifier | 85 |
| 7 | Practitioner | Ring 3 – Interface adapters: controllers, presenters, gateways | Presenter lab, boundary crossing | 85 |
| 8 | Practitioner | Ring 4 – Frameworks, drivers and the Main component | Where does it belong | 70 |
| 9 | Practitioner | Crossing boundaries: control flow vs source dependencies | Control vs dependency, Clean flow | 75 |
| 10 | Practitioner | Packaging and enforcement: making the rule impossible to break | Packaging explorer | 65 |
| 11 | Practitioner | Micronaut in the outer ring: DI, HTTP, Data JDBC, transactions | Wiring explorer, request pipeline | 90 |
| 12 | Practitioner | Testing every ring: the payoff of the dependency rule | Test classifier | 75 |
| 13 | Expert | Mission Control: run, trace and break the whole system | **Mission Control**, concurrency | 90 |
| 14 | Expert | Expert topics: outbox, processes, versioning, tenancy, performance | Outbox crash, saga | 100 |
| 15 | Leader | Anti-patterns and code review: keeping the rings clean | Code review | 70 |
| 16 | Leader | Leading adoption: from a legacy service to clean rings | Maturity radar | 60 |
| 17 | Leader | Final assessment and capstone | 24-question exam | 150 |

Suggested path: modules 0–5 first (principles and ring 1), then 6–9 with the code lab open next to the course, then
10–13 with the service running, then 14–17 alongside the code-lab exercises. The
[facilitator guide](facilitator-guide.md) spreads this over eight weeks.

## Diagrams

| File | Shows | Module |
|---|---|---|
| `01-clean-rings` | The four rings and the one rule: source dependencies point inwards | 0, 1 |
| `02-control-vs-dependency` | Flow of control vs source-code dependencies across a boundary | 9 |
| `03-architecture-mapping` | Layered, hexagonal, onion and Clean: the same idea with different vocabulary | 1 |
| `04-component-principles` | REP/CCP/CRP, ADP/SDP/SAP and the main sequence with the lab's modules plotted (I, A, D) | 3 |
| `05-module-graph` | The code lab as a component graph: four Maven modules and their dependencies | 3, 10 |
| `06-subdomains-components` | Subdomains, bounded contexts and the components inside one context | 4 |
| `07-case-aggregate` | `ScreeningCase` in ring 1: invariants, entities, value objects, events | 5 |
| `08-use-case-anatomy` | Input boundary, request model, interactor, gateways, response model, output boundary, presenter | 6 |
| `09-request-sequence` | One `POST …/cases/{id}/closure` through every ring and back | 9, 13 |
| `10-module-structure` | Modules, packages and which rules the compiler and ArchUnit enforce | 10 |
| `11-micronaut-wiring` | Micronaut in ring 4 only: `MainWiring` builds the plain classes of rings 2–3 | 8, 11 |
| `12-tests-per-ring` | Which tests exist at each ring and what they need | 12 |
| `13-outbox` | Transactional outbox across the rings | 14 |
| `14-packaging-options` | By layer, by feature, ports and adapters, module per ring – and what enforces the rule in each | 10 |
| `15-partial-boundaries` | Full boundaries and the three partial ones (skip the last step, one-dimensional, facade) | 9 |
| `16-process-manager` | An ongoing-monitoring process manager between two Clean services | 14 |

The diagrams are generated by `tools/build-diagrams.mjs` (helpers in `tools/svg.mjs`). To change one, edit that file
and rebuild:

```bash
node plan/training1/tools/build-diagrams.mjs
```

## Folder layout

```text
training1/
├── index.html                 the course (open this)
├── diagrams.html              diagram gallery
├── assets/
│   ├── css/course.css
│   ├── js/course.js           router, progress, quizzes, code highlighting, lightbox
│   ├── js/domain.js           ring 1 of the code lab in JavaScript
│   ├── js/clean-system.js     rings 2–4 of the code lab in JavaScript, with ring-tagged tracing
│   ├── js/sims-system.js      simulators that run the model: Mission Control, Clean flow, presenter lab,
│   │                          control vs dependency, request pipeline, concurrency, outbox crash
│   ├── js/sims-concepts.js    concept simulators (SOLID, component metrics, wiring, packaging, code review, …)
│   ├── modules/m00…m17        one file per module: content + quiz
│   └── diagrams/              generated SVGs
├── tools/
│   ├── build-diagrams.mjs     diagram generator (+ svg.mjs)
│   ├── check-model.mjs        JS model vs Java behaviour
│   └── verify-course.mjs      headless-Chrome smoke test of every module and simulator
├── code-lab/                  the Micronaut service, one Maven module per ring
├── facilitator-guide.md
├── cheatsheet.md
└── clean-vs-hexagonal.md
```

The leadership material in modules 16–17 uses the templates in [`../templates/`](../templates/) (ADR, RFC, context
map, glossary, NFR checklist, risk register).
