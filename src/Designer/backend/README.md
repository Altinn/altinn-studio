# Designer backend

The ASP.NET Core API behind [Designer](../README.md). The [frontend](../frontend/README.md) and
[studioctl](../../cli/README.md) call it. It reads and changes app repositories, converts data models between
JSON Schema, XSD and C#, edits access policies, and starts app builds and deployments.

It uses:

- [Gitea](../../gitea/README.md) for the app repositories, and as the identity provider that users log in with.
  Designer keeps a clone of each repository that a user edits.
- A PostgreSQL database and Redis. A separate [migrations image](Migrations.Dockerfile) applies the database
  migrations.
- Azure DevOps pipelines and GitOps repositories to build and deploy apps, as
  [Environments](../../../docs/infrastructure/environments.md) describes.
- Altinn Platform services and services in the runtime clusters, through the clients in
  [`TypedHttpClients`](src/Designer/TypedHttpClients).
- [Studio Assistant](../../AI/assistant/README.md), which it proxies for users.

Designer edits apps on version 8 and version 9 of the app libraries, which store their UI differently. A v8 app
lists its layout sets in `layout-sets.json`. A v9 app has a UI folder under `App/ui/` for each task, named by the
task ID, and a UI folder for each subform. Where the formats differ, the backend has separate code paths for v8 and
v9 apps.

The tests in the `StudioOidcGiteaIntegrationTest` and `DbIntegrationTest` categories run Gitea and PostgreSQL in
containers, so they need Docker. [Development](docs/development.md) has the backend's conventions and testing
guidance.
