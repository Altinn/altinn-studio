## Getting Started

### On migrating to Yarn

We have recently changed from `npm` to `yarn`. Yarn is included in `corepack` which is bundled with Node.js > 16.10, but is currently opt-in. To enable `corepack` simply run `corepack enable`. For further instructions please see the yarn [installation guide.](https://yarnpkg.com/getting-started/install)

There is also some cleanup needed to be done. These steps can be skipped if you have cloned a fresh copy, or if you are sure you are already using `yarn` in this repository. If you are unsure, you can follow the steps anyway.

For other commands executed with `npm` (f.ex `npm run test`), you should now use `yarn` instead (f.ex `yarn run test`).

## Running the tests

### Lint checks

1. Navigate to the folder `src/Altinn.Apps/AppFrontend/react`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
3. Execute `yarn run lint`.

### Unit tests

1. Navigate to the folder `src/Altinn.Apps/AppFrontend/react`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
3. Execute `yarn run test`.
