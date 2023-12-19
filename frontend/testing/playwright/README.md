# Get started with Playwright

## Test Strategy
This section will be documented after the team meeting about Strategy 03.01.2024. It's important to not
add more test before we have decided a Test Strategy for the team.

## Setup
For å komme i gang med å kjøre testene må du opprette en .env fil på root av mappen `playwright`. Env
filen må inneholde følgende:


```
PLAYWRIGHT_TEST_BASE_URL=http://studio.localhost
PLAYWRIGHT_USER=<<your-test-user-username>>
PLAYWRIGHT_PASS=<<your-test-user-password>>
PLAYWRIGHT_DESIGNER_APP_NAME=<<name-of-the-designer-app>>
```

To install the dependencies run the following command:

```
yarn install
```

```
yarn setup:playwright
```

To run the test write the following command:
```
yarn test:all
```
