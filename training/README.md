# DDD + Hexagonal Architecture + Micronaut — zero to expert

An interactive course built around one real system: a World-Check-style **screening case service**. You learn
Domain-Driven Design, hexagonal architecture (ports and adapters) and Micronaut separately, then see them work together
in a single running request, then learn to lead a team that builds this way.

| What | Where |
|---|---|
| Interactive course (17 modules, 17 simulators, quizzes, progress tracking) | [index.html](index.html) |
| Architecture and flow diagrams (13 SVGs, generated from code) | [diagrams.html](diagrams.html), [assets/diagrams/](assets/diagrams/) |
| Runnable reference service (Java 21, Micronaut 4.10, 46 tests) | [code-lab/](code-lab/README.md) |
| Running the course with a team (8-week cohort) | [facilitator-guide.md](facilitator-guide.md) |
| One-page reference for daily work and reviews | [cheatsheet.md](cheatsheet.md) |

## Open the course

Either double-click `index.html`, or serve the folder (better if your browser restricts local files):

```bash
cd plan/training
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

Nothing is installed and nothing leaves your machine. Progress and quiz scores are stored in the browser's
`localStorage`; reset them with the button at the bottom of the sidebar. `Alt + ←/→` moves between modules.

## How the course is built

The simulators are not animations of made-up behaviour. `assets/js/domain.js` is a line-for-line JavaScript port of the
code lab's domain model, name-matching policy, application service, unit of work, outbox and idempotency store. When
Mission Control scores Viktor Albescu at 100 against WC-1001 or answers `422 FOUR_EYES`, the Java service returns the
same thing for the same input; the code lab README shows the matching curl session.

## Curriculum

About 20 hours of material, plus the code-lab exercises. Each module ends with a quiz; 80 % marks it complete.

| # | Level | Module | Simulator | Minutes |
|---|---|---|---|---|
| 0 | Start | Orientation: the course, the domain, the system | — | 25 |
| 1 | Foundation | Why architecture: the cost of change | Change-impact | 40 |
| 2 | Foundation | Strategic DDD: subdomains, language, bounded contexts, context maps | Context map and term clash | 60 |
| 3 | Foundation | Event Storming: discovering the model with the business | Event Storming board | 50 |
| 4 | Foundation | Entities and value objects in modern Java | Entity or value object | 50 |
| 5 | Foundation | Aggregates: consistency boundaries and invariants | Rich vs anemic, concurrency | 75 |
| 6 | Foundation | Domain events, domain services, repositories, application services | Score lab | 70 |
| 7 | Practitioner | Hexagonal architecture: ports, adapters and the dependency rule | Hexagon flow | 70 |
| 8 | Practitioner | Package structure, mapping, validation and enforcing the rules | Where does it belong | 60 |
| 9 | Practitioner | Micronaut fundamentals: compile-time DI, beans, configuration | Bean resolution | 70 |
| 10 | Practitioner | Micronaut in the adapters: HTTP, clients, data, transactions, scheduling | HTTP pipeline | 80 |
| 11 | Practitioner | Testing a hexagon: fast at the core, real at the edges | Test classifier | 65 |
| 12 | Practitioner | Putting it all together: one request through the whole system | **Mission Control** | 90 |
| 13 | Expert | Consistency across boundaries, evolution and scale | Outbox crash, saga | 120 |
| 14 | Expert | Anti-patterns and design review | Code review (4 PRs) | 70 |
| 15 | Leader | Leading the team: adoption, rituals, decisions and measurement | Maturity radar | 75 |
| 16 | Leader | Final assessment and capstone | 20-question exam | 120 |

Suggested path: modules 0–6 in week one (DDD on its own), 7–11 in week two (hexagon and Micronaut), then module 12
with the code lab running next to it, then 13–16 alongside the code-lab exercises.

## Diagrams

| File | Shows |
|---|---|
| `01-layered-vs-hexagonal` | Why dependencies point inwards |
| `02-subdomains` | Core, supporting and generic subdomains of World-Check |
| `03-context-map` | Bounded contexts and their relationships (customer/supplier, ACL, open host, published language) |
| `04-event-storming` | The screening flow as events, commands, policies and hot spots |
| `05-case-aggregate` | `ScreeningCase` aggregate, its invariants and events |
| `06-hexagon-ports-adapters` | The code lab as a hexagon, every port and adapter named |
| `07-request-sequence` | One `POST /screenings` from Netty to the database and back |
| `08-micronaut-compile-time-di` | What the annotation processors generate and when |
| `09-outbox` | Transactional outbox and relay |
| `10-package-structure` | Packages, and which rules ArchUnit enforces |
| `11-test-pyramid` | Which tests exist at each ring |
| `12-bean-resolution` | Swapping an adapter by configuration with `@Requires`, plus `@Replaces`, `@Primary`, `@MockBean` |
| `13-ongoing-monitoring-saga` | A process manager across contexts |

The diagrams are generated from `tools/build-diagrams.mjs`. To change one, edit that file and rebuild:

```bash
node plan/training/tools/build-diagrams.mjs
```

## Folder layout

```text
training/
├── index.html               the course (open this)
├── diagrams.html            diagram gallery
├── assets/
│   ├── css/course.css
│   ├── js/course.js         router, progress, quizzes, code highlighting, lightbox
│   ├── js/domain.js         JavaScript port of the code lab (used by every simulator)
│   ├── js/sims-system.js    hexagon, Mission Control, concurrency, outbox crash, HTTP pipeline
│   ├── js/sims-concepts.js  the concept simulators (context map, event storming, aggregates, …)
│   ├── modules/m00…m16      one file per module: content + quiz
│   └── diagrams/            generated SVGs
├── tools/                   diagram generator
├── code-lab/                the Micronaut service
├── facilitator-guide.md
└── cheatsheet.md
```

The leadership material in module 15 uses the templates in [`../templates/`](../templates/) (ADR, RFC, context map,
glossary, NFR checklist).
