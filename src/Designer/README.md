# Altinn Studio Designer

Designer is the web application where service owners build Altinn apps and deploy them. Users edit an app's forms,
data models, texts, access policies and process, and manage resources in the Altinn resource registry.
[docs.altinn.studio](https://docs.altinn.studio) documents Designer for its users.

- [`backend`](backend/README.md) is the API that the frontend and [studioctl](../cli/README.md) call.
- [`frontend`](frontend/README.md) holds the React apps and editors that users work in.
- [`development`](development/README.md) holds the setup script and mock services for the local stack.
- [`testdata`](testdata) holds test fixtures for the backend and frontend.
- [`compose.yaml`](compose.yaml) defines the local stack.
- The [`Dockerfile`](Dockerfile) builds one image with the backend, the built frontend and the
  [app templates](../App/template/README.md).

Each app is a Git repository in [Gitea](../gitea/README.md), which Studio calls Repositories. Designer deploys apps
to the runtime clusters described in [Environments](../../docs/infrastructure/environments.md).

The [root README](../../README.md#getting-started-with-developing-altinn-studio) explains how to run Designer
locally. Designer has [coding conventions](docs/coding-conventions.md) for both the backend and the frontend.
