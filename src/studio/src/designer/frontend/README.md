## Getting Started

### On migrating to Yarn

We have recently changed from `npm` to `yarn`. Because of that change, there is some cleanup needed to be done. These steps can be skipped if you have cloned a fresh copy, or if you are sure you are already using `yarn` in this repository. If you are unsure, you can follow the steps anyway.

1. From this folder (`src/designer/frontend`) Execute `npx rimraf **/node_modules/**`. This will remove any `node_modules` under each workspace (dashboard, app-development, shared, ux-editor, packages/schema-editor), and the `node_modules` in this project root (`frontend`) folder.
2. Execute `yarn --immutable` from this project root.

For other commands executed with `npm` (f.ex `npm run test`), you should now use `yarn` instead (f.ex `yarn run test`).

## Running the tests

### Lint checks

1. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
2. Execute `yarn run lint`.

### Unit tests

1. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
2. Execute `yarn run test`.
