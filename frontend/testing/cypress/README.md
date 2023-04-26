# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for studio both local and test environments.

## Getting Started

These instructions will get you run the integration tests on local studio.

### Install dependencies

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```

### Starting the solutions for testing studio

The [Prerequisites](https://github.com/Altinn/altinn-studio/#prerequisites) defined here must be satisifed to start the solution.

Run the `development/setup.js` script as described [here](https://github.com/Altinn/altinn-studio/tree/master/development#setup-script) to set up test users and relevant test data. 

### Run Altinn Studio tests

The commands should be run in an order that makes sure the tests are intact on the subsequent runs.

**Note:** Use cmd or git bash to run the scripts.

1. Setup: Before all the tests

```cmd
    yarn run before:all
```

2. Tests on different solutions of studio

```cmd
    yarn run test:studio -e environment=local
```

3. Cleanup: After all the tests

```cmd
    yarn run after:all
```

4. To run a single test case open cypress runner using

```cmd
    yarn run cy:open -e environment=local
```

### Format files with prettier

```cmd
    yarn run prettier:check # For checking the files deviating standards
    yarn run prettier:format # format and save the files based on config
```
