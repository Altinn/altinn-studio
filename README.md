# Altinn 3 app frontend

This is the default frontend for Altinn 3 apps developed in Altinn Studio
(visit [altinn.studio](https://altinn.studio) or see the [code repository](https://github.com/Altinn/altinn-studio)).

This frontend is tasked with fetching layout files, components and other configuration created in Altinn Studio and
presents the UI for different steps in the workflow of an Altinn application. It is made to talk with the application
backend developed using our [nuget packages](https://github.com/Altinn/app-lib-dotnet), usually extended from
our [application template](https://github.com/Altinn/app-template-dotnet). If you want to try out creating your own
apps in Altinn Studio, [check out our documentation](https://docs.altinn.studio/app/getting-started/).

## Getting started

Apps created in Altinn Studio uses the latest stable release of this frontend by default.
When [testing locally](https://docs.altinn.studio/app/testing/local/), you can also
[try out](https://docs.altinn.studio/app/testing/local/debug/#using-other-frontend-versions) any of
our [previous versions or pre-releases](https://github.com/Altinn/app-frontend-react/releases).

Alternatively, you can set up this project locally to test code not yet released,
or [contribute](https://github.com/Altinn/app-frontend-react/blob/main/CONTRIBUTING.md) code yourself.
There are a few ways to set up this project locally:

<details>
<summary>Docker (recommended for beginners)</summary>
You can start a local app-frontend in Docker using these commands:

```bash
git clone https://github.com/Altinn/app-frontend-react
cd app-frontend-react
# git checkout pr-branch
docker compose up
```

This solution works, but will be slow to start and rebuild. If you just want to run the solution locally, contribute
by testing a bug fix or new feature before the official release, the Docker method will work fine. We recommend
installing `node` locally if you are considering contributing code.

</details>

<details>
<summary>Local node and Corepack</summary>

- Install the latest [Node LTS release](https://nodejs.org/en/)
- Enable [corepack](https://github.com/nodejs/corepack#default-installs) (execute `corepack enable` from a terminal after installing Node 16.9.0 or later)
- Clone the [Altinn app-frontend-react repo](https://github.com/Altinn/app-frontend-react) and navigate to the folder.

```bash
git clone https://github.com/Altinn/app-frontend-react
cd app-frontend-react
```

The development server can be started by following these steps:

1. `yarn --immutable` (only needed when `package.json` has changed)
2. `yarn start` (to start the development server)

This project is using [`yarn`](https://yarnpkg.com/) instead of the default `npm` CLI. This means that you should execute package.json scripts with `yarn` instead of `npm`. F.ex instead of `npm run test` you should execute `yarn run test`. With `yarn`, the `run` keyword is optional, so you can also execute `yarn test`.

</details>

### Running your app

You need an Altinn app for testing when making changes to this codebase. You can either use your own app, or clone our
[frontend-test app](https://dev.altinn.studio/repos/ttd/frontend-test).

To start the app locally:

1. Clone the [Altinn Studio repository](https://github.com/Altinn/altinn-studio)
2. Follow the steps in the [LOCALAPP.md documentation](https://github.com/Altinn/altinn-studio/blob/master/LOCALAPP.md)
3. Follow our documentation on [how to use the local app-frontend](https://docs.altinn.studio/app/testing/local/debug/#using-other-frontend-versions) when running locally

## Automated tests

### End to end tests

End to end tests are using Cypress, see [test readme for how to run these](./test/README.md).

### Unit tests

Unit tests are written using Jest and React testing library

1. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or when package.json changes.
2. Execute `yarn run test`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

### Code style

We use [eslint](https://eslint.org/) and [prettier](https://prettier.io/), and automatically set up git hooks to enforce
these on commits. To avoid confusion, it is recommended to set this up your IDE:

<details>
<summary>Visual Studio Code</summary>
Install the extensions recommended by the workspace, at least [eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).
</details>

<details>
<summary>WebStorm/IntelliJ IDEA</summary>
Configure your IDE to run `eslint --fix` on save (prettier will also reformat your code when doing this). It is also recommended to
[set up Prettier as the default formatter](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_default_formatter).
</details>

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/app-frontend-react/issues/new/choose).

See also the [list of contributors](https://github.com/Altinn/app-frontend-react/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.
