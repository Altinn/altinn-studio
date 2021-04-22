# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for studio and app frontend that is running locally.

## Getting Started

These instructions will get you run the integration tests on local studio.

### Install dependencies

```cmd
    npm install # only needed first time, or when dependencies are updated    
```

### Starting the solutions for testing studio

The [Prerequisites](https://github.com/Altinn/altinn-studio/tree/master/src/studio#prerequisites) defined here must be satisifed to start the solution.

The tests require that the solution has to be started with captcha settings disabled.

Remove the mounted volume of studio gitea using `docker-compose down -v` (only needed first time)

Disable the captcha for user registration by making `ENABLE_CAPTCHA` to `false` in this [file](https://github.com/Altinn/altinn-studio/blob/master/src/studio/src/repositories/gitea-data/gitea/conf/app.ini#L80).

Start the solution by following the procedure [here](https://github.com/Altinn/altinn-studio/tree/master/src/studio#running-solutions-locally).

### Test data prerequisite

An admin user has to be created in local studio and an access token should be created in the user settings -> applications.

Create a new file name `cypress.env.json` under `src\test\cypress` with the data created above.

```json
{
    "adminUser": "",
    "adminPwd": "",
    "accessToken": "",
    "testUserName": "",
    "testUserPwd": ""
}
```

### Run Altinn Studio tests

The commands should be run in an order that makes sure the tests are intact on the subsequent runs.

1. Setup: Before all the tests
```cmd
    npm run before:all
```

2. Tests on different solutions of studio
```cmd
    npm run test:studio
```

3. Cleanup: After all the tests
```cmd
    npm run after:all
```

### Run App Frontend tests
Follow the steps below to start localtest, app frontend, app and the tests.

1. Create testfiles that are used by the tests as attachments in app instances.
```cmd
    npm run create:testfiles # only needed first time, or when files are deleted from e2e/fixtures
```

2. Clone the app (frontend-test) to be tested and update config in `package.json` with the paths.

3. Start localtest, app frontend, app. (Hop over to step 4 if the solutions are already running)
```cmd
    npm run before:appfrontend
```
If one has the frontend dependencies installed from  before, run the below command.
```cmd
    npm run before:appfrontend-no-deps
```

4. Start the app frontend tests from a new git bash terminal.
```cmd
    npm run test:appfrontend --env=local
```
   To run the tests towards AT21, an altinn user credential has to be supplied [here](https://github.com/Altinn/altinn-studio/tree/master/src/test/cypress#test-data-prerequisite).
```cmd
    npm run test:appfrontend --env=at21
```
5. To run a single test case open cypress runner using
```cmd
    npm run cy:open --env=local
```

### Format files with prettier

```cmd
    npm run check # For checking the files deviating standards
    npm run format # format and save the files based on config
```
