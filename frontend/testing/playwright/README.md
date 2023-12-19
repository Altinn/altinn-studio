# Get started with Playwright

This README is under construction and will be improved along the way.

## Test Strategy
This section will be documented after the team meeting on Strategy 03.01.2024.
It's crucial not to add more tests before finalizing the Test Strategy for the team.

## Setup
To initiate test execution and writing, start by running the setup.js script located at the file path `/development/setup.js`.
For more information, refer to the `README.md` located at the root of the monorepo. The reason this is needed is to ensure you have setup you local environment.
If you already have a local environment up and running, you can skip this part.

After executing the mentioned `setup.js` script, you are ready to set up Playwright. Simply run `yarn setup:playwright` and `yarn setup:local:env` to generate a `.env`
file for localhost. Then, execute the tests using the following command: `yarn test:all`.

## Change Environment
If you wish to run tests against an environment other than `studio.localhost`, you can do so by modifying your `.env` file. In the `.env` file,
locate a variable named `PLAYWRIGHT_TEST_BASE_URL`, which is set to `studio.localhost` by default. It is automatically configured for you when running `yarn setup:local:env`.


## .ENV file
`.env` filen som blir generert ser ut som følgende.
```
PLAYWRIGHT_TEST_BASE_URL=http://studio.localhost
PLAYWRIGHT_USER=<<your-test-user-username>>
PLAYWRIGHT_PASS=<<your-test-user-password>>
PLAYWRIGHT_DESIGNER_APP_NAME=<<name-of-the-designer-app>>
GITEA_ACCESS_TOKEN=<<generated-gitea-token-by-the-setup-script>>
```

## Short Step By Step Guide
This is a short step-by-step guide with less minimum needed explanation to get started.

1. Install the dependencies within this package by running yarn install.
2. Install browsers and set up Playwright by executing `yarn setup:playwright`.
3. Generate a .env file for your local environment by running `yarn setup:local:env`.
4. You are now ready to execute tests using the command `yarn test:all`.

