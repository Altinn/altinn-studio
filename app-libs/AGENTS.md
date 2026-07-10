# AGENTS.md — App libraries (`app-libs`)

TypeScript/React libraries for Altinn 3 apps, being **extracted from
[`src/App/frontend`](../src/App/frontend/AGENTS.md)** so form rendering and form logic can be reused
outside the app-frontend SPA (e.g. rendering previews directly inside Studio Designer). As of mid-2026
this is in early development — more code migrates here from `src/App/frontend` over time.

A standalone Yarn workspace (packages are named `@app/*`), separate from the app product folders under
`src/`. See the root [`/AGENTS.md`](../AGENTS.md) for the wider picture.

## Packages

| Folder           | Package               | What it is                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form-component` | `@app/form-component` | React UI components for forms: `app-components` (simple Designsystemet-based components — data in via props, changes out via callbacks) and `layout-components` (the components users pick in Designer to build their UI). Has a Storybook (deployed from `main` via `apps-storybook-deploy.yaml`). |
| `form-engine`    | `@app/form-engine`    | Form logic that does **not** depend on React.                                                                                                                                                                                                                                                       |
| `language`       | `@app/language`       | Language/text resources and helpers (e.g. `replaceParameters`).                                                                                                                                                                                                                                     |

## Build & test

Run from `app-libs/` (Node 22, Yarn):

```bash
yarn test         # vitest (watch); `yarn test:ci` for a single run
yarn typecheck    # tsc across all @app/* packages
yarn lint         # eslint across all @app/* packages (also root `yarn lint:libs`)
```

CI: `.github/workflows/app-libs-unit-test.yml` runs on changes under `app-libs/`.

## Working here

- **Keep `form-component` rendering-only.** Business logic stays in `src/App/frontend` or moves to
  `form-engine`. Rule of thumb from the README: if code does not depend on React, it does not belong in
  `form-component`.
- `layout-components` mirror what Designer offers; changes here affect both app rendering and the
  planned Studio preview.
- See `form-component/README.md` for the architecture and migration vision.
