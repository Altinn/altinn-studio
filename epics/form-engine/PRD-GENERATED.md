# PRD — Form Engine

> Audience: coding agents picking up sprints under `epics/form-engine/sprints/`.
> This is the **epic-level contract**. Sprint plans (`sprints/sprint*.json` and the
> generated detailed plans under `sprints-generated/`) are the unit of execution
> and must conform to this document.

---

## 1. Summary

Replace the in-tree form runtime in `src/App/frontend/src/` with a clean,
three-layer architecture extracted into the monorepo's `libs/` workspace:

```
App Shell  ──►  FormComponent  ──►  FormEngine
(I/O, nav)      (React bridge)      (pure compute)
```

The architecture is illustrated in
`epics/form-engine/appshell-form-engine.excalidraw.png`. The diagram is the
**runtime topology** the epic must produce, not just a conceptual model.

The reference design is the form-client work on the `refactor/next` branch under
`src/App/frontend/nextsrc/libs/form-client/`. We use it as a **design reference**
— we do **not** port file-by-file. The engine is built fresh in `libs/form-engine/`
with an API surface optimized for the boundaries below.

---

## 2. Layers and responsibilities

### 2.1 App Shell — `src/App/frontend/src/` (existing app, formalized)

Owns everything _outside_ the form's pure compute and rendering:

- Fetching initial data (instance, layouts, text resources, schema, settings)
  via the existing API client / queries.
- Persisting form data back to the App Backend (POST/PATCH).
- Routing and navigation between pages / process steps.
- Wiring `FormEngine` instances into `FormComponent` providers and feeding them
  the data they fetched.
- Subscribing to engine change events and triggering persistence.

App Shell does **not** import `@app/form-engine` directly except for type
imports and for constructing the engine at the top of the React tree. All
runtime interaction with engine state goes through `@app/form-component`'s
hooks.

### 2.2 FormComponent — `libs/form-component/`

The React bridge. Already scaffolded as `@app/form-component`. This package owns:

- React providers that hold a `FormEngine` instance for the subtree.
- Hooks that read engine state (`useFormDataValue`, `useValidations`,
  `useTextResource`, etc.) with selector-based subscriptions.
- The form component renderer that walks the engine's resolved layout and
  renders leaf components.
- Adapters from engine change events back into React rendering.

`@app/form-component` is the **only** package allowed to depend on both
`@app/form-engine` and React.

### 2.3 FormEngine — `libs/form-engine/`

Pure form-state compute. Already scaffolded as `@app/form-engine` with a dummy
`FormEngine` class. Owns:

- **FormData**: in-memory form data store, dotted-path get/set, change
  notifications, type coercion against the data model schema.
- **Layout pre-processing**: resolving the raw `ILayoutCollection` into a
  navigable, normalized structure (children moved into their parents,
  repeating-group expansion ready).
- **Expressions**: dynamic-expression evaluator for hidden / required /
  read-only / dynamic text, with the expression-language data sources
  (formData, applicationSettings, instanceDataSources, textResources).
- **Validations**: JSON-schema validation (Ajv) + expression-validation rules,
  exposed as a queryable validation store with severity + source metadata.
- **Text resources**: a store of text resources with parameter substitution
  driven by the expression engine.

---

## 3. Hard constraints

1. **Zero React in `@app/form-engine`.**
   - No `import` of `react` or `react-dom` anywhere in `libs/form-engine/src/**`.
   - Remove `react` and `react-dom` from `libs/form-engine/package.json`
     `peerDependencies` (sprint-1 left them in for parity; that hedge is now
     dropped).
   - The engine may use framework-agnostic state primitives (e.g. `zustand`'s
     vanilla store, plain pub/sub) but never React-specific APIs.
   - Enforce with an ESLint rule on `libs/form-engine/`:
     `no-restricted-imports` blocking `react` and `react-dom`.

2. **Layer dependency direction.**
   - `@app/form-engine` depends on nothing in this repo.
   - `@app/form-component` depends on `@app/form-engine`.
   - `src/App/frontend/` (App Shell) depends on both.
   - Reverse imports are forbidden. Enforce with ESLint
     `no-restricted-imports` in `libs/form-engine/eslint.config.mjs`.

3. **No public API leaks of internal libraries.**
   Public types of `@app/form-engine` and `@app/form-component` must not expose
   `zustand`, `Ajv`, `@tanstack/react-query`, or any other implementation
   library. Wrap them in plain interfaces. (This mirrors the convention from
   `nextsrc/core/CONVENTIONS.md`.)

4. **`@app/form-engine` stays `private: true`.** Distribution is via workspace
   symlink only.

5. **No emojis** in committed files. **No "Claude" references** in commit
   messages or PR descriptions.

---

## 4. Public API contract — `@app/form-engine`

The engine's public surface is what `@app/form-component` and any test harness
will consume. The shape below is the **target**; sprints flesh it out
incrementally. All names and signatures are normative for the public surface.

```ts
// libs/form-engine/src/index.ts (target end-state)
export { FormEngine } from './FormEngine';
export type {
  FormEngineConfig,
  FormDataChangeEvent,
  FormDataChangeCallback,
  Unsubscribe,
  ValidationIssue,
  ValidationSeverity,
  ResolvedLayoutCollection,
  ResolvedLayoutFile,
} from './types';
```

`FormEngine` is a class constructed once per form session by App Shell:

| Surface                                               | Purpose                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `new FormEngine(config: FormEngineConfig)`            | Construct with text resources, language, app settings, instance data sources.     |
| `setFormData(data)`                                   | Seed/replace the form data tree.                                                  |
| `setDataModelSchema(schema)`                          | Install the JSON schema; engine builds an internal validator.                     |
| `setLayoutCollection(raw)`                            | Install raw layout collection; engine pre-processes (children moved, normalized). |
| `getLayoutNames()` / `getFormLayout(name)`            | Read pre-processed layout(s).                                                     |
| `getValue(path)` / `setValue(path, value)`            | Dotted-path data access.                                                          |
| `evaluateExpression(expr, ctx)`                       | Evaluate a layout expression in the engine's data context.                        |
| `getValidations(scope?)`                              | Read current validation issues.                                                   |
| `runSchemaValidation()` / `runExpressionValidation()` | Trigger validation passes; emit results into the validation store.                |
| `onFormDataChange(cb)` → `Unsubscribe`                | Subscribe to data-change events.                                                  |
| `onValidationsChange(cb)` → `Unsubscribe`             | Subscribe to validation-store changes.                                            |
| `getVersion()`                                        | Diagnostic — string version of the engine package.                                |

Internal stores (`formDataStore`, `validationStore`, `textResourceStore`) are
**not** part of the public API. `@app/form-component` reads engine state via
selector functions and subscribes via the `on*Change` callbacks.

---

## 5. Public API contract — `@app/form-component`

The concrete React surface of `@app/form-component` (provider, hooks,
`<FormRenderer>`, component registry) is **defined in its own sprint**, not
here. This PRD only fixes the constraints that surface must satisfy:

- It is the **only** package that imports both `react` and `@app/form-engine`.
- It exposes engine state to React via selector-style hooks so consumers
  re-render only on the slice they read.
- It does not leak `zustand`, `Ajv`, or other engine-internal libraries
  through its public types (Section 3.3).
- App Shell interacts with engine state only through this package's API
  (except for constructing the `FormEngine` instance itself).

When the FormComponent sprint runs, it will produce the full surface and add
it as an addendum / sprint-generated plan under
`epics/form-engine/sprints-generated/`.

---

## 6. App Shell role (kept in `src/App/frontend/`)

The concrete contract between App Shell and the lower two layers — exact
construction site for `FormEngine`, where the provider is mounted, how
persistence is wired into `onFormDataChange`, how navigation consults
validations — is **defined in its own sprint**, not here.

For this PRD, App Shell's responsibilities are scoped as follows:

- Owns I/O: fetching initial data and persisting form data to App Backend.
- Owns routing, layout-set selection, process-next, party-selection,
  instantiation. None of this moves into `libs/`.
- Constructs the `FormEngine` and seeds it with fetched data, schema, layouts.
- Mounts `@app/form-component`'s provider over the form route subtree.
- Subscribes to engine change events to drive persistence and to gate
  navigation on validations.

The App Shell sprint will pin down the exact integration surface.

---

## 7. Migration strategy — strangler-fig with feature flag

1. **Introduce a runtime flag** (env-var or `applicationSettings`-driven) named
   e.g. `useFormEngineV2`. Default off in production. CI runs both modes.
2. **Land the engine and component packages** in `libs/`, fully tested in
   isolation, before touching the production rendering path.
3. **Cut over a slice at a time** behind the flag — e.g. `formDataStore` first,
   then expressions, then validations, then layout pre-processing, then the
   renderer. Each cutover is a separate PR with the flag still off.
4. **Old code stays compilable.** No deletions until the new path reaches
   parity behind the flag.
5. **Flip the flag** in a dedicated rollout PR after parity is verified
   (existing Jest + Cypress suites green in both modes).
6. **Final sprint deletes** the in-tree form runtime in `src/App/frontend/src/`
   and removes the flag.

Strangler-fig means **no long-lived branch**. Every sprint merges to `main`.

---

## 8. Reference materials

- **Design reference (read-only)**: `refactor/next` branch,
  `src/App/frontend/nextsrc/libs/form-client/` and
  `src/App/frontend/nextsrc/core/CONVENTIONS.md`. Treat as inspiration; do not
  copy file-by-file. Do not import from `nextsrc/` in production code.
- **Current production runtime**: `src/App/frontend/src/features/formData/`,
  `src/App/frontend/src/features/expressions/`,
  `src/App/frontend/src/features/validation/`,
  `src/App/frontend/src/layout/`. This is the **behavior spec** — the new
  stack must match it observable-side.
- **Diagram**: `epics/form-engine/appshell-form-engine.excalidraw.png`.

---

## 9. Definition of Done (epic level)

The epic is complete when **all** are true:

- [ ] `src/App/frontend/` uses `@app/form-engine` for form data, expressions,
      and validation. The legacy in-tree implementations of these subsystems
      are deleted.
- [ ] Behavioral parity with the current production form runtime: existing
      Jest + Cypress suites pass without behavior-modifying skips, and a
      manual smoke covering layout pre-processing, repeating groups,
      conditional rendering (`hidden`/`required`/`readOnly`), schema +
      expression validation, and data binding is green.
- [ ] `@app/form-engine` has a documented public API (Section 4) and a test
      suite that exercises it without spinning up the React app or rendering
      anything. Tests run via `yarn workspace @app/form-engine test:ci`.
- [ ] Runtime topology matches the diagram: App Shell owns I/O + navigation;
      `@app/form-component` owns React rendering + adapters; `@app/form-engine`
      owns pure compute over form state. Verified by ESLint dependency rules
      and the absence of React imports in `libs/form-engine/src/**`.
- [ ] The `useFormEngineV2` flag and any compatibility shims are removed.

---

## 10. Sprint roadmap (high-level slicing)

Sprints are defined in `epics/form-engine/sprints/sprintN.json`. Detailed plans
are generated into `epics/form-engine/sprints-generated/sprintN.md`. The epic
should slice roughly along these lines (subject to refinement per sprint):

1. **Sprint 1 — Establish `@app/form-engine` lib.** _(Done.)_ Scaffold
   workspace, dummy class, smoke test from `src/App/frontend/`.
2. **Sprint 2 — Engine contract & types.** _(Current branch:
   `feat/18601-form-engine-contract`.)_ Land the public types and class
   skeleton from Section 4 with unimplemented methods + exhaustive type tests.
   Drop `react` peer deps. Add ESLint dependency rules. No production wiring
   yet.
3. **Sprint 3 — FormData store.** Implement form-data store, dotted-path
   get/set, change events, type coercion. Wire behind flag in
   `src/App/frontend/` for read paths only.
4. **Sprint 4 — Layout pre-processing.** `setLayoutCollection` +
   `getFormLayout` with children-moved + repeating-group prep. Cut over
   layout reads behind flag.
5. **Sprint 5 — Expressions.** Expression evaluator + data sources. Cut over
   `hidden`/`required`/`readOnly`/dynamic-text behind flag.
6. **Sprint 6 — Validations.** Schema (Ajv) + expression validation; validation
   store; navigation gating. Cut over behind flag.
7. **Sprint 7 — `@app/form-component` rendering bridge.** Provider, selector
   hooks, `<FormRenderer>`, component registry. Cut over rendering behind flag.
8. **Sprint 8 — Persistence + lifecycle.** Wire `onFormDataChange` into App
   Shell's PATCH/POST layer. Verify debounce + retry parity.
9. **Sprint 9 — Parity gating + flag flip.** Run full Jest + Cypress in both
   modes in CI. Flip flag default to on.
10. **Sprint 10 — Delete legacy.** Remove in-tree form runtime, remove flag,
    remove shims.

The sprint count is indicative — feel free to merge or split sprints as
implementation reveals the right granularity, but **never skip the
flag-protected cutover step** for a subsystem.

---

## 11. Operating rules (apply to every sprint)

1. **Tests first.** Public-API behavior in `@app/form-engine` must have
   failing tests before implementation. `@app/form-component` hooks must have
   failing render tests before implementation.
2. **No behavior-modifying skips.** If a Jest/Cypress test breaks during a
   cutover, fix the engine — do not `.skip` or relax the assertion.
3. **No `any`, no unjustified casts.** Follow `AGENTS.md` TypeScript rules.
4. **No public API leaks** of `zustand`, `Ajv`, `react-query`, or any
   implementation lib (Section 3.3).
5. **One subsystem per cutover PR.** Don't bundle (e.g.) FormData and
   Expressions cutovers in the same PR.
6. **Flag default off** until Sprint 9. Every cutover PR adds a code path
   under the flag and leaves the legacy path intact.
7. **Lint runs in CI for `libs/`.** Root `yarn lint` must include
   `@app/form-engine` and `@app/form-component`.
8. **Pause for user approval** at the end of each sprint's "end state"
   checklist before marking `sprints/sprintN.json` `isDone: true`.

---

## 12. Out of scope

- New form features (new components, new expression operators, new validation
  kinds) beyond what the current production runtime already supports. This
  epic is a re-architecture, not a feature epic.
- Changes to the App Backend API contract.
- Migration of designer-side code (`frontend/`, `backend/`). The epic touches
  only `src/App/frontend/` and `libs/`.
- Publishing `@app/form-engine` or `@app/form-component` to a registry. They
  remain `private: true` workspace packages.
- Replacing the existing query / persistence layer in App Shell beyond what's
  needed to wire `onFormDataChange` into it.
- Touching the `refactor/next` branch. It is read-only design reference.

---

## 13. File-path quick reference

- `libs/form-engine/` — `@app/form-engine`: pure compute, no React.
- `libs/form-component/` — `@app/form-component`: React bridge.
- `src/App/frontend/src/` — App Shell: owns I/O, routing, persistence.
- `src/App/frontend/nextsrc/libs/form-client/` (on `refactor/next`) — design reference, read-only.
- `epics/form-engine/sprints/` — sprint definitions (input).
- `epics/form-engine/sprints-generated/` — detailed sprint plans (generated).
- `epics/form-engine/appshell-form-engine.excalidraw.png` — architecture diagram (normative).
