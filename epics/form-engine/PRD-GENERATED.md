# PRD: Form Engine

> Source: `epics/form-engine/README.md` + diagram `appshell-form-engine.excalidraw.png`
> Reference architecture: `/Users/adam.haeger/Projects/digdir/studio-temp/altinn-studio/src/App/frontend/nextsrc` (read-only — never modify)
> Audience: coding agents executing per-sprint work under `epics/form-engine/sprints/`
> Status: living document — update as sprints land and assumptions change

---

## 1. Goal

Ship a production form engine that replaces the legacy form-rendering stack inside `src/App/frontend/` (the "App Shell"). The new engine lives in a single workspace `@app/form-engine` (at `libs/form-engine/`) and is consumed by App Shell behind a feature flag so it can roll out incrementally, route by route, alongside the legacy renderer.

Behavioral parity is mandatory: the new engine must render forms, evaluate expressions, and report validation in a way that is observably identical to the current legacy stack for the apps targeted in the rollout. This is a re-implementation, not a redesign.

The epic is "done" when an agreed-upon **core component set** has been migrated to `@app/form-engine` and is exercising real apps under the feature flag (see §10 for the precise exit criteria).

## 2. Architectural decisions (locked-in)

These are committed for the epic. Change them only by amending this PRD and pinging the owner.

| Decision            | Choice                                                                                                                                                                                   | Rationale                                                                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workspace shape** | Single `@app/form-engine` workspace. `FormClient` is an internal module inside it, not a sibling workspace.                                                                              | Matches the epic diagram. Diverges from nextsrc's two-workspace layout (`libs/form-client/` + `libs/form-engine/`) but keeps the consumer surface narrow — App Shell only depends on one package. |
| **Host**            | Existing `src/App/frontend/` (= "App Shell" in the diagram). No new shell workspace.                                                                                                     | The shell already owns I/O, persistence, and routing. Form rendering is the only piece moving.                                                                                                    |
| **Coexistence**     | Feature flag at the route/task level. Legacy renderer remains the default; opt-in routes use `@app/form-engine`. Both code paths must build and pass tests for the duration of the epic. | Safe rollout. Allows mid-epic shipping, comparison testing, fast rollback.                                                                                                                        |
| **Behavior parity** | Expression syntax and AJV validation behavior must match the legacy stack on a defined reference app. No redesign of expression language or validation API.                              | The migration must not become a breaking-change project for app teams. Cleanups belong in a separate epic.                                                                                        |
| **API contract**    | Defined in **Sprint 2** (see §6). Treat this PRD as silent on the exact shape until Sprint 2 lands.                                                                                      | Avoiding a guess that locks downstream sprints into the wrong abstraction.                                                                                                                        |

## 3. Reference architecture

Use these read-only files to understand the desired shape. **Never modify nextsrc.**

```
studio-temp/altinn-studio/src/App/frontend/nextsrc/
  libs/
    form-client/        Non-React. Zustand stores for formData/textResources/validation. Dot-path access. AJV. Expression evaluator.
    form-engine/        React. Component renderer + ~40 form components. useBoundValue() / useTextResource() hooks.
```

For this epic, both halves collapse into a single workspace:

```
libs/form-engine/                                # = @app/form-engine
  src/
    index.ts                                     # Public API
    FormEngine/                                  # Renderer + React surface (the diagram's outer FormEngine box)
      FormEngine.tsx                             # Top-level component the App Shell mounts
      hooks/                                     # useBoundValue, useTextResource, etc.
      components/                                # Core form components (Input, Dropdown, Group, ...)
    FormClient/                                  # Non-React state core (the diagram's inner FormClient box)
      FormClient.ts                              # Class wrapping Zustand stores
      stores/                                    # formData, textResources, validation
      expressions/                               # Expression evaluator (parity with legacy)
      validation/                                # AJV setup
    test/setup.ts
  package.json, tsconfig.json, vitest.config.ts, eslint.config.mjs
```

Sprint 1 (already shipped) established the empty workspace and `FormEngine.getVersion()` stub. Subsequent sprints fill in the structure above.

## 4. Scope

### 4.1 In scope

- Implementing `@app/form-engine` per §3.
- A feature-flag entry point in App Shell so a route or task can render via `@app/form-engine` instead of the legacy `src/layout/` stack.
- Migrating the **core component set** (defined in §5) into `@app/form-engine` with behavioral parity.
- Backfilling Cypress E2E coverage for the new engine on the designated reference app(s).
- Updating App Shell's persistence/navigation glue to drive the new engine.

### 4.2 Out of scope (for this epic — track separately)

- The long tail of layout components beyond the core set (see §5.2).
- Any redesign of expression syntax, validation rules, or Zustand store shapes.
- Removing the legacy renderer. The epic ends with both renderers shipping; legacy retirement is a follow-up epic.
- Migrating App Shell off Webpack/Jest. The form-engine lib uses Vitest internally; App Shell continues with Jest until the existing migration epic completes.
- Studio designer integration. App Shell is the only consumer in this epic.
- Bringing `@app/form-component` to feature parity with `@app/form-engine`'s lint/typecheck conventions (separate cleanup).

## 5. Component coverage

### 5.1 Core set (epic exit requires all of these)

The epic is not "done" until each of these renders through `@app/form-engine` with parity to the legacy implementation, on the designated reference app, behind the feature flag.

1. **Input** — single-line text, number, email variants
2. **TextArea** — multi-line text
3. **Checkbox** / **Checkboxes** — single + grouped boolean
4. **RadioButtons** — single-select from a list
5. **Dropdown** — single-select with options/codelist binding
6. **Group** — non-repeating layout grouping
7. **RepeatingGroup** — repeating data binding with add/remove rows
8. **Header** / **Paragraph** — read-only text components (text resource binding)
9. **Button** — submit/save/navigation actions
10. **Datepicker** — date input with min/max/format

This list is the **target threshold for §10 done-criteria**. Adjustments require updating this PRD.

### 5.2 Long tail (deferred)

Everything else in `src/App/frontend/src/layout/` (FileUpload, Map, AddressComponent, Likert, MultipleSelect, Custom, Summary variants, …). Tracked outside this epic. The feature flag must gracefully fall back to the legacy renderer for any layout that contains a non-core component.

## 6. Sprint roadmap

This is a planning skeleton. Each sprint must be turned into a `epics/form-engine/sprints/sprint{N}.json` file before execution and expanded by the `generate-next-sprint` workflow. The roadmap **will change**; treat sprint count as indicative.

| #   | Title                                       | Goal in one sentence                                                                                                                                                                    | Dependencies             |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Establish `@app/form-engine` lib            | Scaffold the workspace + dummy class importable from App Shell. **DONE.**                                                                                                               | —                        |
| 2   | Define App Shell ↔ FormEngine contract      | Specify the public API of `@app/form-engine` (props, events, lifecycle, error model) as a typed interface in `src/index.ts` plus a written contract doc. No runtime implementation yet. | Sprint 1                 |
| 3   | Feature-flag plumbing in App Shell          | Add a route- or task-level switch in `src/App/frontend/` that selects between legacy renderer and `<FormEngine />`. Default = legacy.                                                   | Sprint 2                 |
| 4   | FormClient core: formData store             | Zustand store with dot-path read/write. No expressions, no validation. Exposed through `FormClient` class.                                                                              | Sprint 2                 |
| 5   | FormClient: text resources + bindings hooks | textResources store + `useBoundValue()` / `useTextResource()` consumed from React.                                                                                                      | Sprint 4                 |
| 6   | FormClient: expression evaluator (parity)   | Port legacy expression syntax. Differential testing against current implementation on a fixture set.                                                                                    | Sprint 5                 |
| 7   | FormClient: validation (AJV)                | Schema-based validation, validation store, error reporting. Parity with legacy AJV setup.                                                                                               | Sprint 6                 |
| 8   | FormEngine renderer + first two components  | Wire `<FormEngine />` to FormClient. Implement `Input` and `TextArea` end-to-end (rendered, bound, validated, expressions).                                                             | Sprints 2, 3, 4, 5, 6, 7 |
| 9   | Core components batch A                     | `Checkbox`, `RadioButtons`, `Dropdown`.                                                                                                                                                 | Sprint 8                 |
| 10  | Core components batch B                     | `Group`, `RepeatingGroup`.                                                                                                                                                              | Sprint 9                 |
| 11  | Core components batch C                     | `Header`, `Paragraph`, `Button`, `Datepicker`.                                                                                                                                          | Sprint 10                |
| 12  | Reference-app rollout + Cypress coverage    | Pick a real app from `apps/`, opt-in via the feature flag, get its Cypress specs green.                                                                                                 | Sprints 8-11             |
| 13  | Epic exit                                   | Run §10 checklist. Lock in done-state. Hand off long-tail components to a follow-up epic.                                                                                               | Sprint 12                |

Each sprint must follow the `generate-next-sprint` skill conventions: tests-first, user-approved test plan before implementation, explicit end-state checklist, user-approves before `isDone: true`.

## 7. Cross-cutting requirements

These apply to every sprint in this epic. Coding agents must verify them before declaring a sprint done.

### 7.1 Behavior parity

- Expression evaluator must produce identical outputs to the legacy implementation for a fixture set defined no later than Sprint 6. Sprint 6 owns building this fixture set.
- AJV validation rules, error keys, and error message resolution must match legacy on the reference app.
- Data binding paths (dot-notation + `[index]` for repeating groups) must match legacy semantics, including null/undefined coercion.

### 7.2 Coexistence with legacy

- Legacy renderer (`src/App/frontend/src/layout/`, `src/features/formData/`, etc.) must continue to build, lint, typecheck, and pass tests at every sprint boundary.
- The feature flag from Sprint 3 onward must default to **legacy off** (= legacy active); opting in is per-route/per-task and explicit.
- A layout that contains any non-core component (§5.2) must fall back to the legacy renderer transparently. No partial rendering.

### 7.3 Technical conventions

- All in-lib code uses Vitest (`yarn workspace @app/form-engine test:ci`). App Shell's smoke tests use the existing Jest setup.
- TypeScript strict, no `any`, no `as` casts unless justified inline. Follow `src/App/frontend/AGENTS.md` rules.
- Public API of `@app/form-engine` is exposed only from `src/index.ts`. Internal modules (FormClient, hooks) must not be importable via deep paths from App Shell.
- React 19. Workspace symlinks resolve to realpaths outside `node_modules/`, so existing Webpack `exclude: /node_modules/` and Jest `transformIgnorePatterns` patterns require no changes.
- Node ≥22.12 for vitest 3 / vite 7 (`require(esm)`). Pre-existing repo-wide constraint.
- No emojis in code. No Claude references in commit messages.

### 7.4 Testing

- Unit tests live next to the code they test (`*.test.ts`).
- Cross-package smoke tests live under `src/App/frontend/src/test/`.
- E2E lives in the existing Cypress setup at `src/App/frontend/test/e2e/`. Treat the 93 specs as the integration-level source of truth — Sprint 12 will run a subset of them against the reference app under the feature flag.
- Differential tests (legacy vs. new) for expressions and validation are required at the sprint level for Sprints 6 and 7.

## 8. Risks and open questions

| Topic                | Risk                                                                                                                 | Mitigation                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expression parity    | Legacy expression behavior has undocumented edge cases.                                                              | Sprint 6 must capture a fixture set from real-world layouts, not synthetic ones, and run it against legacy + new in CI.                             |
| Validation parity    | AJV configuration in legacy is non-trivially customized (formats, custom keywords).                                  | Sprint 7 must inventory legacy's AJV setup before re-implementing.                                                                                  |
| Bundle size          | Adding a parallel renderer doubles the bundle until legacy retires.                                                  | Acceptable for this epic's lifetime. Track but don't optimize. Tree-shake unused legacy components only when retiring legacy in the follow-up epic. |
| App Shell coupling   | App Shell currently has many providers/contexts that read formData. The new engine's data flow may not match.        | Sprint 2 must specify exactly what App Shell-side adapters are needed. Sprint 3 implements them as adapter modules so legacy and new can coexist.   |
| Reference app choice | Picking the wrong reference app for Sprint 12 (e.g. one that uses a long-tail component) means we hit blockers late. | Sprint 12 starts with explicitly verifying the chosen app uses only core-set components.                                                            |

Open questions to resolve before the relevant sprint starts:

- **Q1 (blocks Sprint 3):** Where is the feature flag stored? Per-app config, query param, env var, runtime toggle in App Shell? Default answer: per-task config in the app's `applicationmetadata` analogue, with a runtime override for development.
- **Q2 (blocks Sprint 12):** Which app from `/Users/adam.haeger/Projects/digdir/apps` is the reference app for the rollout?
- **Q3 (blocks Sprint 2):** Does the App Shell pass the schema/layouts/initial data eagerly into FormEngine, or does FormEngine fetch via an injected `dataProvider`? Default answer: eager props, App Shell stays the I/O owner per the diagram.

## 9. Glossary (used by all sprint docs)

- **App Shell** — `src/App/frontend/` (the `app-frontend-react` workspace). Owns data fetching, persistence, navigation, layout-level routing.
- **Form Engine** — `@app/form-engine` (`libs/form-engine/`). Owns form rendering, data binding, expressions, validation.
- **FormClient** — internal module of Form Engine. Non-React. Owns Zustand stores + expression evaluator + AJV validation.
- **Core component set** — the ten components listed in §5.1.
- **Reference app** — the real Altinn app picked in Sprint 12 to validate the rollout.
- **Legacy renderer** — the current `src/App/frontend/src/layout/` + `src/features/formData/` stack. Stays in place throughout this epic.
- **Feature flag** — the route/task-level switch added in Sprint 3 that selects between legacy and Form Engine.

## 10. Done criteria for the epic

The epic is complete when **all** of the following are true:

- [ ] Every component in §5.1 (core set) is implemented in `@app/form-engine` with behavioral parity to the legacy implementation, verified by component-level tests inside the lib.
- [ ] At least one real app from `/Users/adam.haeger/Projects/digdir/apps` (the reference app, picked in Sprint 12) renders end-to-end through `@app/form-engine` behind the feature flag, with no fallback to legacy on its core flows.
- [ ] All Cypress specs that target the reference app pass against the new engine.
- [ ] The feature flag defaults to legacy. Apps must opt in explicitly. The legacy renderer continues to ship and pass all its tests.
- [ ] `@app/form-engine` exposes only the public API defined in Sprint 2 from `src/index.ts`. No deep imports leak into App Shell.
- [ ] `yarn workspace @app/form-engine {typecheck,lint,test:ci}` all green.
- [ ] `yarn workspace app-frontend-react {tsc,test,build}` all green with the workspace dependency in place.
- [ ] Differential test fixtures (Sprint 6 expressions, Sprint 7 validation) run in CI against legacy and new, both green.
- [ ] Long-tail components (§5.2) are tracked in a follow-up epic with a written handoff in `epics/form-engine/HANDOFF.md`.
- [ ] PRD updated to record any architectural decisions made during the epic.

---

## How a coding agent should use this document

1. Read this PRD before starting **any** form-engine sprint. The locked-in decisions in §2 are non-negotiable without amending the PRD.
2. Find the sprint JSON at `epics/form-engine/sprints/sprint{N}.json`. If no PRD-aligned roadmap entry exists in §6, do not invent one — ask the user.
3. Consult the nextsrc reference (§3) for the target shape. Do not modify it.
4. Apply §7 cross-cutting requirements at every sprint boundary.
5. When a sprint completes, check whether it answers any of the §8 open questions and update this PRD inline.
