# Facilitator guide — running the Clean Architecture course with your team

[← Training home](README.md)

This guide turns the interactive course into an 8-week cohort for 4–10 engineers. You facilitate; the course and the
code lab do the teaching. The goal is not "everyone finished the modules" but **the team can place any piece of code
in the right ring, and builds and reviews that way without you in the room**.

If the team has already taken the hexagonal course in [`../training`](../training/facilitator-guide.md), compress weeks
1–2 into one session (Event Storming is still worth repeating on a new flow) and add a session on
[`clean-vs-hexagonal.md`](clean-vs-hexagonal.md): ask the team which style their next service should use, and why.

## Format

| Item | Recommendation |
|---|---|
| Cohort | 4–10 engineers; mix seniors and mid-levels. Pair a senior with a mid-level for the katas. |
| Rhythm | One 90-minute session per week plus about 2–3 hours of self-study (modules and code lab) |
| Before each session | Everyone completes the listed modules and quizzes (80 % pass mark, tracked in their browser) |
| In the session | 10 min recap of the quiz questions people missed · 50 min hands-on kata · 20 min debrief · 10 min "apply it to our code" |
| Artefacts | Every session produces something that goes into the real repository or `plan/templates/` |
| Setup | Java 21 and the code lab built once on every laptop (`../../../mvnw clean install` in `code-lab/`) before week 1 |
| Your preparation | Do the kata yourself first, on a branch, and note where you got stuck |

Ask people to share the "x / 18 modules" counter in the sidebar or a screenshot of their quiz scores; there is no
server, so progress is personal.

The plan below matches the "Growing the team" outline in module 16: modules 0–5 in weeks 1–2, 6–9 in weeks 3–4 with
the "extract a use case" kata, 10–13 in weeks 5–6, 14–17 in weeks 7–8.

## The 8 weeks

### Week 1 — Why, SOLID and components (modules 0–3)

- **Self-study:** orientation, policy vs details (change-impact simulator), SOLID (SOLID detector), component principles
  (component-metrics simulator).
- **Kata (50 min):** "Measure your own service". Each pair takes one real service and fills in the component-metrics
  table for its packages or modules: fan-in (Ca), fan-out (Ce), instability I, abstractness A, distance D. Compare with
  the code lab (entities D = 0.97, use cases 0.29, adapters 0.21, app 0.20).
- **Debrief question:** Which of our packages is in the zone of pain (stable and concrete), and do we change it often?
- **Artefact:** the metrics table and the top three SOLID violations found, as entries in
  `plan/templates/architecture-questions.md`.

### Week 2 — The domain and ring 1 (modules 4–5)

- **Self-study:** strategic DDD (context map and Event Storming simulators), entities and value objects, aggregate
  rules, score lab.
- **Session (full 90 min, replaces the usual format):** a big-picture Event Storming for one flow your team owns.
  Invite a product owner or a compliance analyst. Orange = events, blue = commands, lilac = policies, pink = hot spots.
  Finish by circling which commands will become **use cases** (ring 2) and which rules are **enterprise rules** (ring 1).
- **Homework kata:** "Make illegal states unrepresentable". In `screening-entities`, add the rule that a `POSSIBLE`
  resolution must be reviewed again within 30 days, and a case cannot close while one is overdue. Write
  `ScreeningCaseTest` cases first. The module has no Micronaut on its classpath, so a framework shortcut will not compile.
- **Artefact:** board export, a glossary in `plan/templates/glossary.md`, a context map in `plan/templates/context-map.md`.

### Week 3 — Use cases and adapters (modules 6–7)

- **Self-study:** interactors, boundaries and models (rule classifier), controllers, presenters and gateways
  (presenter lab, boundary-crossing simulator).
- **Kata (45 min): "Extract a use case", round 1.** Start from the legacy `CaseService` in module 1 (rules, SQL, HTTP
  status codes and Kafka in one class). Pairs extract `ResolveMatch`: an input boundary, a request model, an
  interactor, the gateways it needs, an output boundary and a presenter. Check against the code lab's
  `usecases/resolvematch/` and `adapters/web/CasePresenter`.
- **Debrief question:** Which decisions moved out of the controller, and which ring did each one land in?
- **Artefact:** the before/after diagram on the team wiki.

### Week 4 — Ring 4 and boundaries (modules 8–9)

- **Self-study:** frameworks and the Main component (where-it-belongs), control flow vs source dependencies and partial
  boundaries (control-vs-dependency, Clean flow).
- **Kata (45 min): "Extract a use case", round 2 – on your own code.** Each pair extracts one use case from a real
  service, on a branch, using the partial boundary that fits (often a full input boundary with a facade-style presenter
  to start). The old code delegates to it; nothing else changes.
- **Stretch:** code-lab exercise 2, the CLI controller and presenter. Pairs must show that no file in
  `screening-usecases` or `screening-entities` changed.
- **Debrief question:** Where did you choose a partial boundary, and what would make you complete it later?
- **Artefact:** the branch, plus an ADR (`plan/templates/adr-template.md`) "When we use a full vs partial boundary".

### Week 5 — Packaging, enforcement and Micronaut (modules 10–11)

- **Self-study:** packaging explorer, the six ArchUnit rules, wiring explorer, request pipeline.
- **Kata:** first the "break the rule" demo from the code-lab README (a Micronaut import in ring 1 fails to compile; an
  `instanceof OpenCaseInteractor` in `CaseController` fails ArchUnit). Then code-lab exercise 1, the Kafka sink, selected
  by `screening.events.sink`. `git diff --stat` must show changes under `screening-app` only.
- **Debrief question:** Which of our rules can the compiler enforce, and which need ArchUnit? Why did the lab's
  "only Main knows the interactors" rule need `onlyHaveDependentClassesThat()` rather than `onlyBeAccessed()`?
- **Artefact:** an ArchUnit test like `CleanArchitectureTest` in one real service, with `FreezingArchRule` recording
  today's violations so only new ones fail.

### Week 6 — Testing and the whole system (modules 12–13)

- **Self-study:** test classifier, then module 13 with all ten Mission Control missions, and the same missions repeated
  against the running service with curl.
- **Kata:** "Bug hunt". On a branch beforehand, you break one rule in one ring: remove the four-eyes check (ring 1),
  drop the tenant check in `CaseLookup` (ring 2), map a rule violation to 400 in `CasePresenter` (ring 3), or lose the
  `@Version` on `CaseRow` (ring 4). Pairs find it from failing tests and logs alone, then add the missing test at the
  cheapest ring that can catch it.
- **Debrief question:** How many tests did each break fail, and in which modules? What does that say about our suites?
- **Artefact:** a test-strategy section in the team's service sheet (`plan/templates/service-sheet.md`).

### Week 7 — Expert patterns (module 14)

- **Self-study:** outbox crash simulator (all strategies), process manager (saga simulator), event versioning,
  multi-tenancy, performance.
- **Kata:** one per pair – code-lab exercise 3 (v2 presenter), 4 (PostgreSQL and `SKIP LOCKED`) or 5 (resilience on
  reference data). Each pair explains which rings their change touched and why no others.
- **Debrief question:** Draw where your design is eventually consistent and what the analyst sees during the gap.
- **Artefact:** an RFC (`plan/templates/rfc-template.md`) for one real cross-context flow, using outbox, idempotency and
  a process manager where needed.

### Week 8 — Review and leadership (modules 15–17)

- **Self-study:** anti-patterns and the code-review simulator, leading adoption, final assessment.
- **Session:** "Senior review". Each pair presents one change from the previous weeks for 10 minutes; another pair
  reviews it live with the module 15 checklist. Close with the maturity radar from module 16, scored together for the
  team's real service, and agree the first three migration steps from module 16 for that service.
- **Artefact:** the team's review checklist added to the pull-request template, the maturity scores, and the capstone
  (module 17) assigned with a date.

## Katas you can reuse after the cohort

| Kata | Time | Teaches |
|---|---|---|
| Measure your own service: Ca, Ce, I, A, D per module | 30 min | Component principles; where the zone of pain is |
| Extract a use case from a legacy service class | 45 min | Interactors, request/response models, output boundaries |
| Move the HTTP decision: take every status code out of a controller and into a presenter | 45 min | Humble object, presenter |
| Second delivery mechanism: add a CLI or a consumer that calls the same input boundary | 60 min | Use cases are independent of delivery |
| Swap the detail: a second gateway implementation chosen in the Main component by configuration | 60 min | Plugins, `@Requires`, Main |
| Break the rule: prove each architecture rule fails once | 20 min | Fitness functions that actually bite |
| Crash the transaction: find the crash point that loses an event under each strategy (outbox simulator) | 20 min | Dual write vs outbox |

## Assessing people

Use this rubric at the end of week 8, as a growth conversation and not a grade. Evidence comes from the katas, the
review session and the final assessment in module 17.

| Skill | Developing | Practitioner | Expert / can lead |
|---|---|---|---|
| Language and boundaries | Uses the glossary terms | Spots when one word means two things and proposes a split | Facilitates Event Storming and keeps the context map current |
| Ring 1: entities | Writes value objects as records | Places invariants in the right aggregate; keeps entities framework-free | Chooses consistency boundaries with the business and explains the trade-off |
| Ring 2: use cases | Follows the interactor pattern from examples | Writes request/response models and output boundaries; keeps use cases independent | Decides when a use case needs a full boundary and when a partial one is enough |
| Ring 3: adapters | Puts code in the right package | Moves HTTP decisions into presenters and mapping into gateways | Designs view models and published languages other teams consume |
| Components and enforcement | Knows the dependency rule | Reads I/A/D, writes ArchUnit rules, splits a module when it pays | Sets packaging strategy for a product and keeps fitness functions honest |
| Micronaut in ring 4 | Uses annotations from examples | Wires plain classes in the Main component; explains scopes, `@Requires`, transactions | Diagnoses bean-resolution and startup problems; tunes for production |
| Testing | Writes unit tests | Tests each ring at its cheapest level with fakes that honour the gateway contracts | Sets the team's test strategy and keeps the suite fast |
| Distributed consistency | Knows the outbox exists | Implements outbox, idempotency and optimistic locking across the rings | Designs process managers and event versioning across teams |
| Review and leadership | Receives review well | Reviews with the checklist and explains why | Writes ADRs and RFCs others follow; plans an incremental migration; mentors the next facilitator |

A cohort has succeeded when at least two people score "Expert / can lead" on most rows and can run the next cohort.

## After the cohort

- Keep the glossary, context map and `CleanArchitectureTest` alive: review frozen-violation counts monthly in the
  architecture forum and expect them to fall.
- Re-run the maturity radar every quarter and compare.
- Hand the next cohort to one of this cohort's graduates and attend only week 8.
- This course pairs with `plan/learning-curriculum.md`, which covers the domain (AML/KYC, World-Check APIs) and
  operations topics this course does not.
