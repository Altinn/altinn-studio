# AGENTS.md — Common TypeScript libraries (`src/common/ts`)

TypeScript and React libraries shared across Altinn Studio product areas. They are being extracted from
[`src/App/frontend`](../../App/frontend/AGENTS.md) so form rendering and form logic can also be reused by
Studio Designer and other consumers. Package names remain `@app/*` while the libraries are under active
development; changing package identities is outside this structural cleanup.

See [`src/common`](../AGENTS.md) for the shared-code convention and the root [`/AGENTS.md`](../../../AGENTS.md)
for the wider repository picture.

## Packages

| Folder            | Package                | What it is                                           |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| `form-component`  | `@app/form-component`  | React UI and layout components used to render forms. |
| `form-engine`     | `@app/form-engine`     | Form logic that does not depend on React.            |
| `language`        | `@app/language`        | Language resources and text helpers.                 |
| `layout-contract` | `@app/layout-contract` | Shared layout component and property contracts.      |

Most of `layout-contract` is generated from definitions and generator sources in `src/App/frontend`.
Do not edit generated files by hand; run `yarn gen` from `src/App/frontend` after changing generator inputs.

## Build & test

Run from `src/common/ts/` (Node 22, Yarn):

```bash
yarn test:ci
yarn typecheck
yarn lint
```

CI: `.github/workflows/common-typescript-unit-test.yml` validates this workspace.

## Working here

- Keep `form-component` rendering-only. Business logic stays in a product consumer or moves to
  `form-engine`.
- Layout components mirror what Designer offers; changes can affect both app rendering and Designer
  previews.
- See `form-component/README.md` for the architecture and migration vision.
