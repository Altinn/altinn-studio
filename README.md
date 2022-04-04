# Altinn 3 app frontend

React SPA used by applications developed in [altinn-studio](https://github.com/Altinn/altinn-studio). The application consists of several different features, and is responsible for presenting the UI for different steps in the workflow of an Altinn application, and interacting with the [altinn app-template](https://github.com/Altinn/app-template-dotnet).

## Prerequisites

- Latest [Node LTS release](https://nodejs.org/en/)
- Enable [corepack](https://github.com/nodejs/corepack#default-installs) (execute `corepack enable` from a terminal after installing Node 16.9.0 or later)

This project is using [`yarn`](https://yarnpkg.com/) instead of the default `npm` CLI. This means that you should execute package.json scripts with `yarn` instead of `npm`. F.ex instead of `npm run test` you should execute `yarn run test`. With `yarn`, the `run` keyword is optional, so you can also execute `yarn test`.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

Clone the [Altinn app-frontend-react repo](https://github.com/Altinn/app-frontend-react) and navigate to the folder.

```bash
git clone https://github.com/Altinn/app-frontend-react
cd app-frontend-react
```

### Developing app-frontend

You need an Altinn app to effectively make changes to the app-frontend codebase. To serve the development version of app-frontend code, you need to make some changes to `views/Home/Index.cshtml` in the app repo you are using:

Change

```html
<link
  rel="stylesheet"
  type="text/css"
  href="https://altinncdn.no/toolkits/altinn-app-frontend/3/altinn-app-frontend.css"
/>
...
<script src="https://altinncdn.no/toolkits/altinn-app-frontend/3/altinn-app-frontend.js"></script>
```

to

```html
<link
  rel="stylesheet"
  type="text/css"
  href="http://localhost:8080/altinn-app-frontend.css"
/>
...
<script src="http://localhost:8080/altinn-app-frontend.js"></script>
```

This will make the browser request the files from the local development server. The development server can be started by following these steps:

- Navigate to `./src/altinn-app-frontend`
- `yarn --immutable` (only needed when `package.json` has changed)
- `yarn start` (to start the development server)

In addition, you need to serve the app from somewhere. There are two ways of doing this, either deploy the application via Altinn Studio, or run the app locally on your machine.

#### Using applications that are deployed via Altinn Studio

After you make the changes to the `views/Home/Index.cshtml` file as mentioned above, you need to [deploy the application](https://docs.altinn.studio/app/deployment/). When accessing the application, it should now be using the app-frontend code that is served from `http://localhost:8080`.

#### Using apps running locally on your machine

If you prefer to run the application locally (useful if you also want to make rapid changes to the application itself), you also need to clone [Altinn Studio repository](https://github.com/Altinn/altinn-studio), and follow the steps in the [LOCALAPP.md documentation](https://github.com/Altinn/altinn-studio/blob/master/LOCALAPP.md).

## Running tests

### End to end tests

End to end tests are using Cypress, see [test readme for how to run these](./test/cypress/README.md).

### Unit tests and lint rules

Unit tests are written using Jest and React testing library. Lint rules are defined with eslint.

#### Lint checks

1. Navigate to the folder `./src`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or when package.json changes.
3. Execute `yarn run lint`.

#### Unit tests

1. Navigate to the folder `./src`.
2. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or when package.json changes.
3. Execute `yarn run test`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

- **Altinn Studio development team** - If you want to get in touch, just [create a new issue](https://github.com/Altinn/app-frontend-react/issues/new/choose).

See also the [list of contributors](https://github.com/Altinn/app-frontend-react/graphs/contributors) who participated in this project.

## License

This project is licensed under the 3-Clause BSD License - see the [LICENSE.md](LICENSE.md) file for details.
