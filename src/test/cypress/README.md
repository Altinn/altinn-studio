# Cypress Tests

This project has the tests using [cypress](https://www.cypress.io/) for studio both local and test environments.

## Getting Started

These instructions will get you run the integration tests on local studio.

### Install dependencies

```cmd
    yarn --immutable # only needed first time, or when dependencies are updated
```

### Starting the solutions for testing studio

The [Prerequisites](https://github.com/Altinn/altinn-studio/tree/master/src/studio#prerequisites) defined here must be satisifed to start the solution.

The tests require that the solution has to be started with captcha settings disabled.

Remove the mounted volume of studio gitea using `docker-compose down -v` (only needed first time)

Disable the captcha for user registration by making `ENABLE_CAPTCHA` to `false` in this [file](https://github.com/Altinn/altinn-studio/blob/master/src/studio/src/repositories/gitea-data/gitea/conf/app.ini#L80).

Start the solution by following the procedure [here](https://github.com/Altinn/altinn-studio/tree/master/src/studio#running-solutions-locally).

### Test data prerequisite

You need login credentials for the first user created in local studio, since this user has automatically got admin rights.
If you have issues logging in as this user, the simplest solution is to delete the `altinn-repositories` container and the Gitea volumes in Docker, and then rebuild the container.
Then you can start all over and create a new, first user from http://studio.localhost.

After logging in as the admin user, you need to create an access token.
This is done under the applications pane in the Gitea user settings; http://studio.localhost/repos/user/settings/applications.

Create a new file name `cypress.env.json` under `src\test\cypress` with the data created above.

```json
{
  "adminUser": "",
  "adminPwd": "",
  "accessToken": ""
}
```

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
