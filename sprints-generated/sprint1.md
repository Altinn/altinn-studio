# Sprint 1: Establish `@app/form-engine` library

> Source: `sprints/sprint1.json`
> Status: **In progress** — set `isDone: true` only after the user approves the end state checklist below.

---

## Goal

Scaffold the empty `libs/form-engine/` workspace into a working `@app/form-engine` package, exposing a dummy `FormEngine` class with a stub method, and prove it is importable from the `app-frontend-react` workspace (`src/App/frontend/`) via a real smoke unit test. Match the conventions of the existing `libs/form-component/`.

## Acceptance criteria (from `sprints/sprint1.json`)

1. The lib is importable from monorepo apps, **most importantly `src/App/frontend`**, and the import is exercised by a runtime test in that workspace (not just a `tsc` resolution).
2. Test and lint scripts work and follow monorepo conventions.
3. `@app/form-engine` exposes a dummy `FormEngine` class with a stub method, importable from apps.

## Reference / template

- **Template**: `libs/form-component/` (already exists, same shape we want).
- **Workspace glob** `libs/**` is already declared in root `package.json` — no root workspace edit needed for the lib itself.
- **Consumer**: `src/App/frontend/` (`app-frontend-react`) — React 19.2.4, TypeScript 5.9.3, Jest 30, Webpack 5. Versions are compatible with the lib's React 19 peer deps and TS 5.9.3.

---

## Operating rules for this sprint

1. **Tests first.** Write all test files (in-lib + smoke test) and a written test plan **before any implementation files** for the lib's behavior.
2. **Pause for user approval of the test plan** before writing the implementation. Do not start the dummy class until the user has confirmed the test plan is what they want.
3. **No emojis** in any committed file.
4. **Don't reference Claude** in commit messages.
5. Follow `AGENTS.md` conventions (TypeScript best practices, no `any`, no unnecessary type casts).
6. Match `libs/form-component/`'s file layout and config exactly except where this sprint deliberately differs (documented inline below).
7. Do not modify `libs/form-component/` or any unrelated workspace.

---

## Phase 0 — Verify starting state

Confirm before starting:

- `libs/form-engine/` exists and is empty (`ls libs/form-engine`).
- `libs/form-component/package.json` is readable as the structural template.
- Root `package.json` includes `libs/**` in `workspaces` (already does).
- `src/App/frontend/package.json` does not yet depend on `@app/form-engine` (it doesn't).

If any of the above is not true, stop and surface the discrepancy.

---

## Phase 1 — Test plan (deliver to user, await approval)

Write the following test files first. **Do not implement `FormEngine` yet** — these tests should fail to import / fail to find the class. That is intentional: we want the user to see the test plan in concrete form before implementation.

### 1a. In-lib unit test

`libs/form-engine/src/FormEngine/FormEngine.test.ts`

Asserts:

- `new FormEngine()` constructs without throwing.
- `instance.getVersion()` returns the string `'0.1.0'` (the chosen stub method).

Uses Vitest globals (`describe`, `it`, `expect`) consistent with `libs/form-component/`'s vitest config.

### 1b. Test setup file

`libs/form-engine/src/test/setup.ts`

Mirror `libs/form-component/src/test/setup.ts`. `FormEngine` is a plain class so jest-dom isn't strictly required, but keep parity with the sibling lib.

### 1c. Smoke test in `app-frontend-react`

Location: `src/App/frontend/src/__tests__/form-engine-smoke.test.ts` (or the closest folder convention used elsewhere in `src/App/frontend/src` — match what already exists; do **not** invent a new test directory).

Asserts:

- `import { FormEngine } from '@app/form-engine'` resolves at runtime under Jest.
- `new FormEngine().getVersion()` returns `'0.1.0'`.

This test is the proof of acceptance criterion 1: it can only pass if Webpack/Jest in `src/App/frontend/` actually transpile and resolve `libs/form-engine/src/index.ts` through the workspace dependency.

### Pause point

Once these three files are written and committed (or staged), pause and present the test plan to the user. **Do not proceed to Phase 2 without the user's explicit approval of the test plan.**

---

## Phase 2 — Implementation

After test-plan approval, implement in this order:

### 2a. Lib package skeleton

Create the following files inside `libs/form-engine/`, modeled directly on `libs/form-component/` (use that file's contents as a structural reference, swap the name):

- `libs/form-engine/package.json`
  - `"name": "@app/form-engine"`
  - `"version": "0.1.0"`
  - `"private": true`
  - `"main": "./src/index.ts"`
  - `"packageManager": "yarn@4.12.0"`
  - `scripts`: `test`, `test:ci`, `lint`, `typecheck` — copy from `form-component`.
  - `peerDependencies`: `react ^19.0.0`, `react-dom ^19.0.0` — keep parity even though the dummy class doesn't use React yet, so future React-using exports don't require a package.json edit.
  - `devDependencies`: same set as `form-component` (`@testing-library/*`, `@types/react*`, `@vitejs/plugin-react`, `jsdom`, `typescript 5.9.3`, `vitest ^3.0.0`).
- `libs/form-engine/tsconfig.json` — copy `form-component`'s verbatim.
- `libs/form-engine/vitest.config.ts` — copy `form-component`'s verbatim.

### 2b. Source files

- `libs/form-engine/src/index.ts` — re-export from `./FormEngine`:
  ```ts
  export { FormEngine } from './FormEngine';
  ```
- `libs/form-engine/src/FormEngine/index.ts` — barrel:
  ```ts
  export { FormEngine } from './FormEngine';
  ```
- `libs/form-engine/src/FormEngine/FormEngine.ts` — the dummy class:
  ```ts
  export class FormEngine {
    public getVersion(): string {
      return '0.1.0';
    }
  }
  ```

No further methods, fields, generics, or React content — keep it intentionally minimal.

### 2c. Run the in-lib checks (must all pass)

```bash
yarn install
yarn workspace @app/form-engine typecheck
yarn workspace @app/form-engine lint
yarn workspace @app/form-engine test:ci
```

If any fail, fix root cause inside `libs/form-engine/` — do not silence with eslint-disable / `// @ts-expect-error` / test skips.

### 2d. Wire `@app/form-engine` into `src/App/frontend/`

1. Add to `src/App/frontend/package.json` `dependencies`:
   ```json
   "@app/form-engine": "workspace:*"
   ```
2. Run `yarn install` so the workspace symlink is created.
3. Inspect Webpack config in `src/App/frontend/` (e.g. `webpack.config.*`, `webpack.common.js`, etc.) for any `babel-loader` / `ts-loader` rules that use an `include` allowlist:
   - If `include` only covers `src/`, extend it to also cover the absolute path of `<repo-root>/libs/form-engine/src/` (or, more robustly, `<repo-root>/libs/`). Use a path resolved via `path.resolve(__dirname, '../../../libs')` style — match how the file already resolves paths.
   - If there is no `include` allowlist (transpile-everything-except-node_modules pattern), no change needed.
4. Inspect `src/App/frontend/jest.config.*` (and any `babel.config.*` / `babel-jest` setup):
   - Confirm `transformIgnorePatterns` does not exclude `libs/`. The default `node_modules` exclusion is fine because `libs/form-engine` is symlinked outside of `node_modules`, but verify that babel-jest will transform files from outside `src/`. If not, add a `roots` or `transform` entry that explicitly covers `libs/form-engine/src/**`.
   - Confirm `moduleNameMapper` does not have an entry that would shadow `@app/*`.
5. Run the smoke test:
   ```bash
   yarn workspace app-frontend-react test -- form-engine-smoke
   ```
   This must pass. If it fails with a module-resolution or transpile error, fix the Webpack/Jest config — do **not** work around it by inlining the class or copying source.
6. Run typecheck and a build smoke check:
   ```bash
   yarn workspace app-frontend-react tsc
   ```

### 2e. Root lint hookup

User chose: include the new lib in the root lint workflow.

1. Look at root `package.json` `scripts.lint`. Currently it is `yarn workspace studio-designer-frontend lint`, which is the designer-side lint. The cleanest extension that keeps the existing meaning intact is to add a separate root script and call it alongside, **without changing the meaning of the existing `lint` script**:
   - Add `"lint:libs": "yarn workspaces foreach -A --include '@app/*' --topological-dev run lint"` (Yarn 4 syntax) **or** explicit per-workspace invocations if `foreach` is not used elsewhere in the repo. Match an existing pattern if one already exists for designer-side libs.
   - Either: extend the existing root `lint` to chain `&& yarn lint:libs`, **or** add a new top-level aggregator `lint:all` that runs designer + libs. Pick whichever matches monorepo conventions; if unclear, prefer the additive `lint:libs` script and chain it into root `lint`.
2. Run `yarn lint` from the repo root and confirm the lib's lint runs and passes.
3. If a CI workflow file invokes the root `lint` script, no further changes are needed; otherwise note in the PR description that CI may need to call `lint:libs`.

---

## Phase 3 — End state (user must approve before sprint is marked done)

When all of the following are true, present this checklist back to the user verbatim and ask: _"Do you approve this end state? On 'yes' I will mark `sprints/sprint1.json` `isDone: true`."_

- [ ] `libs/form-engine/` contains `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/FormEngine/{FormEngine.ts,FormEngine.test.ts,index.ts}`, `src/test/setup.ts` — and nothing else.
- [ ] `@app/form-engine` exports a `FormEngine` class with a public `getVersion(): string` method that returns `'0.1.0'`. No other public surface.
- [ ] `yarn workspace @app/form-engine typecheck` exits clean.
- [ ] `yarn workspace @app/form-engine lint` exits clean.
- [ ] `yarn workspace @app/form-engine test:ci` exits clean and the in-lib FormEngine test passes.
- [ ] `src/App/frontend/package.json` declares `"@app/form-engine": "workspace:*"` in `dependencies`.
- [ ] A smoke test under `src/App/frontend/src/` imports `FormEngine` from `@app/form-engine`, instantiates it, and asserts `getVersion() === '0.1.0'`.
- [ ] `yarn workspace app-frontend-react test -- form-engine-smoke` (or matching pattern) passes.
- [ ] `yarn workspace app-frontend-react tsc` exits clean.
- [ ] Webpack/Jest configs in `src/App/frontend/` resolve and transpile `libs/form-engine/src/*.ts` (verified by the smoke test passing).
- [ ] Root `yarn lint` runs and includes `@app/form-engine` lint in its execution.
- [ ] No unrelated workspaces were modified (`git diff --stat` only shows `libs/form-engine/**`, `src/App/frontend/package.json`, the smoke test file, root `package.json` lint scripting, and `yarn.lock`).
- [ ] No emojis introduced. No Claude references in commit messages.

## Phase 4 — Mark complete

Only after the user replies with explicit approval of the end-state checklist:

1. Edit `sprints/sprint1.json` and set `"isDone": true`.
2. Confirm to the user: _"Sprint 1 marked complete in `sprints/sprint1.json`."_

---

## Out of scope (do not do in this sprint)

- Implementing any real form-engine logic (renderer, components, state, expressions, validation). The reference architecture in `src/App/frontend/.claude/plans/NEXTSRC_REFACTOR.md` describes the eventual shape, but **this sprint only establishes the package**.
- Adding `@app/form-engine` as a dependency anywhere other than `src/App/frontend/`.
- Touching `libs/form-component/` or any designer-side workspace.
- Migrating any existing `src/App/frontend/src/layout/` components into the lib.
- Publishing to a registry — the lib stays `private: true`.
