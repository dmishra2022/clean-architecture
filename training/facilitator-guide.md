# Facilitator guide — running the course with your team

[← Training home](README.md)

This guide turns the interactive course into an 8-week cohort for 4–10 engineers. You facilitate; the course and the
code lab do the teaching. The goal is not "everyone finished the modules" but **the team designs, builds and reviews
code this way without you in the room**.

## Format

| Item | Recommendation |
|---|---|
| Cohort | 4–10 engineers; mix seniors and mid-levels. Pair a senior with a mid-level for the katas. |
| Rhythm | One 90-minute session per week plus about 2 hours of self-study (modules and code lab) |
| Before each session | Everyone completes the listed modules and quizzes (80 % pass mark, tracked in their browser) |
| In the session | 10 min recap of the quiz questions people missed · 50 min hands-on kata · 20 min debrief · 10 min "apply it to our code" |
| Artefacts | Every session produces something that goes into the real repository or `plan/templates/` |
| Your preparation | Do the kata yourself first, on a branch, and note where you got stuck |

Ask people to screenshot their quiz score page or share the "x / 17 modules" counter in the sidebar; there is no
server, so progress is personal.

## The 8 weeks

### Week 1 — Why and the language (modules 0–2)

- **Self-study:** orientation, cost of change (change-impact simulator), strategic DDD (context map simulator).
- **Kata (50 min):** "Term clash". Each pair takes one word the business uses that means different things in different
  teams (in World-Check: *profile*, *match*, *case*, *client*, *resolution*) and writes one glossary entry per context in
  `plan/templates/glossary.md`.
- **Debrief question:** Where in our code does one class try to mean two of these things?
- **Artefact:** first version of the glossary and a draft context map in `plan/templates/context-map.md`.

### Week 2 — Event Storming (module 3)

- **Self-study:** module 3 and its Event Storming board simulator.
- **Session (full 90 min, replaces the usual format):** run a real big-picture Event Storming for one flow your team owns.
  Invite a product owner or a compliance analyst. Orange = events, blue = commands, lilac = policies, pink = hot spots.
  Use a Miro board or a wall.
- **Artefact:** photo or export of the board, plus the three hottest hot spots as questions in
  `plan/templates/architecture-questions.md`.

### Week 3 — Tactical building blocks (modules 4–6)

- **Self-study:** entities and value objects, aggregates (rich vs anemic, concurrency), events and services (score lab).
- **Kata:** "Make illegal states unrepresentable". In the code lab, add an `ExpiryDate` rule: a `POSSIBLE` resolution
  must be reviewed again within 30 days, and a case cannot close while a `POSSIBLE` is overdue. Write the domain tests
  first; no Micronaut annotation may be needed.
- **Debrief question:** Which invariant did you put in a value object, which in the aggregate, and why?
- **Artefact:** merged branch with tests in `ScreeningCaseTest`.

### Week 4 — The hexagon (modules 7–8)

- **Self-study:** hexagonal architecture (hexagon-flow simulator), package structure and mapping (where-it-belongs).
- **Kata:** code-lab exercise 2, the `RescreenJob` driving adapter. Then ask each pair to delete
  `HexagonalArchitectureTest`'s `ignoreDependency` line and explain the failure that follows.
- **Debrief question:** What would you have had to change if the controller called `CaseApplicationService` directly?
- **Artefact:** an ArchUnit test like `HexagonalArchitectureTest` added to one of the team's real services, even if it
  starts with `@Disabled` and a list of current violations.

### Week 5 — Micronaut (modules 9–10)

- **Self-study:** compile-time DI and bean resolution, HTTP pipeline simulator, data and transactions.
- **Kata:** code-lab exercise 1, the Kafka sink, selected purely by `screening.events.sink`. Pairs must show that
  `git diff --stat` touches nothing under `domain/` or `application/`.
- **Debrief question:** Which errors did the compiler catch that a reflection-based container would only report at startup?
- **Artefact:** a short ADR (`plan/templates/adr-template.md`) "How we select adapters by configuration".

### Week 6 — Testing and the whole system (modules 11–12)

- **Self-study:** testing a hexagon (test classifier), then module 12 with the code lab running and all ten Mission
  Control missions completed.
- **Kata:** "Bug hunt". The facilitator breaks one invariant on a branch beforehand (for example, remove the four-eyes
  check or the `belongsTo` tenant check). Pairs must find it from failing tests and logs alone, then add the test that
  would have caught it if it is missing.
- **Debrief question:** At which ring did the cheapest failing test live?
- **Artefact:** test-strategy section added to the team's service sheet (`plan/templates/service-sheet.md`).

### Week 7 — Expert patterns (module 13)

- **Self-study:** outbox crash simulator (all three strategies), idempotency, saga, versioning, multi-tenancy.
- **Kata:** code-lab exercise 3 (work-queue read model) or exercise 4 (PostgreSQL and `SKIP LOCKED`), one per pair.
- **Debrief question:** Draw where your design is eventually consistent and what the user sees during the gap.
- **Artefact:** an RFC (`plan/templates/rfc-template.md`) for one real cross-context flow in your product, using the
  outbox and idempotency patterns where needed.

### Week 8 — Review and leadership (modules 14–16)

- **Self-study:** anti-patterns and the four code-review PRs, leading the team, final assessment.
- **Session:** "Senior review". Each pair presents one change from the previous weeks for 10 minutes; another pair reviews
  it with the module 14 checklist, live. Close with the maturity radar from module 15, scored together for the team's
  real service.
- **Artefact:** the team's own review checklist, adapted from module 14, added to the pull request template.

## Katas you can reuse after the cohort

| Kata | Time | Teaches |
|---|---|---|
| Term clash | 30 min | Bounded contexts are about language first |
| Primitive obsession hunt: replace three `String`/`long` parameters in a real class with records | 45 min | Value objects |
| Move the rule: find a business rule in a controller or SQL and move it into the aggregate with a test | 60 min | Rich domain model |
| Swap the adapter: add a second implementation of a port, selected by configuration | 60 min | Ports and `@Requires` |
| Crash the transaction: in the outbox simulator, find the crash point that loses an event under each strategy | 20 min | Dual write vs outbox |
| Replay an event twice: make a consumer idempotent with an inbox table | 60 min | At-least-once delivery |

## Assessing people

Use this rubric at the end of week 8 (and as a growth conversation, not a grade). Evidence comes from the katas, the
review session and the final assessment in module 16.

| Skill | Developing | Practitioner | Expert / can lead |
|---|---|---|---|
| Language and boundaries | Uses the glossary terms | Spots when one word means two things and proposes a split | Facilitates Event Storming and keeps the context map current |
| Modelling | Writes value objects as records | Places invariants in the right aggregate; keeps aggregates small | Chooses consistency boundaries with the business and explains the trade-off |
| Hexagon | Puts code in the right package | Adds ports and adapters without touching the core | Designs ports for new capabilities; writes the ArchUnit rules |
| Micronaut | Uses annotations from examples | Explains scopes, `@Requires`, transactions and the blocking executor | Diagnoses bean-resolution and startup problems; tunes for production |
| Testing | Writes unit tests | Tests each ring at the right level with fakes for ports | Sets the team's test strategy and keeps the suite fast |
| Distributed consistency | Knows the outbox exists | Implements outbox, idempotency keys and optimistic locking | Designs sagas and event versioning across teams |
| Review and leadership | Receives review well | Reviews with the checklist and explains why | Writes ADRs and RFCs others follow; mentors the next facilitator |

A cohort has succeeded when at least two people score "Expert / can lead" on most rows and can run the next cohort.

## After the cohort

- Keep the glossary, context map and ArchUnit tests alive: review them monthly in the architecture forum.
- Re-run the maturity radar every quarter and compare.
- Hand the next cohort to one of this cohort's graduates and attend only week 8.
- This course pairs with `plan/learning-curriculum.md`, which covers the domain (AML/KYC, World-Check APIs) and
  operations topics this course does not.
