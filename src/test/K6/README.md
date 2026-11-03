# K6 tests

[k6](https://k6.io/) tests for app and platform APIs. Each script in [src/tests](src/tests) runs on its own, and its
header comment gives the test data it needs and the command that runs it through [docker-compose.yml](docker-compose.yml).

`yarn eslint:check` and `yarn prettier:check` check the scripts. `yarn eslint:fix` and `yarn prettier:format` fix them.
