# K6 API Tests

This project has the api tests using [k6](https://k6.io/) for platform and app apis.

## Develop Test Scripts

### Install dependencies
The dependencies are for linting and formatting of the test scripts.

```cmd
    npm install # only needed first time, or when dependencies are updated    
```

### Lint files

```cmd
    npm run eslint:check # Check the files devialting the rules
    npm run eslint:fix # Fix the linting errors
```

### Format files with prettier

```cmd
    npm run prettier:check # Check the files deviating the configuration
    npm run prettier:format # Fix and save the files based on configuration
```

Refer this page for more [documentation](https://docs.altinn.studio/teknologi/altinnstudio/development/handbook/test/k6/) on how to write new test scripts.

## Run Tests

Each `.js` is an independent test script and has an example command with the parameters to be sent for the test script.
