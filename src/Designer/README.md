# Designer

Designer is the web application where app developers build Altinn apps and deploy them. They edit an app's forms,
data models, texts, access policies and process, and manage resources in the Altinn resource registry.
[docs.altinn.studio](https://docs.altinn.studio) documents Designer for its users.

- The [backend](backend/README.md) is the API that the frontend and [studioctl](../cli/README.md) call.
- The [frontend](frontend/README.md) holds the React apps and editors that users work in.
- The [Dockerfile](Dockerfile) builds one image with the backend, the built frontend and the
  [app templates](../App/template/README.md) that new apps start from.

Each app is a Git repository in [Gitea](../gitea/README.md), which users see as Repositories. Designer reaches Gitea
through the [gitea-proxy](../gitea-proxy). It deploys apps to the runtime clusters as
[Environments](../../docs/infrastructure/environments.md#runtime-clusters) describes.

[Running Designer locally](development/README.md) explains how to start the local stack and work on one part of it.

## v8 and v9 apps

Designer edits apps on version 8 and version 9 of the app backend. The code for v8 apps is frozen. We change it only
when a service owner asks for something that brings value and that we can reasonably support, and we keep those
changes few. `ux-editor-v3`, which serves apps older than v8, is not maintained.
