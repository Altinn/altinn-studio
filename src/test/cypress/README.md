# Studio Tests

This project has the tests using [cypress](https://www.cypress.io/) for studio that is running locally.

## Getting Started

These instructions will get you run the integration tests on local studio.

### Starting the solution for test

The [Prerequisites](https://github.com/Altinn/altinn-studio/tree/master/src/studio#prerequisites) defined here must be satisifed to start the solution.

The tests require that the solution has to be started with captcha settings disabled.

Remove the mounted volume of studio gitea using `docker-compose down -v` (only needed first time)

Disable the captcha for user registration by making `ENABLE_CAPTCHA` to `false` in this [file](https://github.com/Altinn/altinn-studio/blob/master/src/studio/src/repositories/gitea-data/gitea/conf/app.ini#L80).

Start the solution by following the procedure [here](https://github.com/Altinn/altinn-studio/tree/master/src/studio#running-solutions-locally).

### Install dependencies

```cmd
    npm install # only needed first time, or when dependencies are updated    
```

### Test data prerequisite

An admin user has to be created in local studio and an access token should be created in the user settings -> applications.

Create a new file name `cypress.env.json` under `src\test\cypress` with the data created above.

```json
{
    "adminUser": "",
    "adminPwd": "",
    "accessToken": ""
}
```

### Run tests

Tests should be run in an order that makes sure the tests are intact on the subsequent runs.

#### Setup: Before all the tests

```cmd
    npm run before:all
```

#### Tests on different solutions of studio

```cmd
    npm run test
```

#### Cleanup: After all the tests

```cmd
    npm run after:all
```
