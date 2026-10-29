# Designer backend

The ASP.NET Core API behind [Designer](../README.md). The [frontend](../frontend/README.md) and
[studioctl](../../cli/README.md) call it. It reads and changes app repositories, converts data models between JSON
Schema, XSD and C#, edits access policies, and starts app deployments.

It uses:

- [Gitea](../../gitea/README.md) for the app repositories. The backend keeps a clone of each repository for each
  developer who edits it.
- PostgreSQL. Designer does not migrate its database itself. The [migrations image](Migrations.Dockerfile) applies
  the Entity Framework migrations.
- Redis outside Development and Test. Designer's replicas share their cache, SignalR messages and studioctl's auth
  codes through it.
- Azure DevOps pipelines and the service owners' GitOps repositories in Gitea to deploy apps, as
  [Environments](../../../docs/infrastructure/environments.md#runtime-clusters) describes.
- Altinn Platform services and services in the runtime clusters, through the clients in
  [TypedHttpClients](src/Designer/TypedHttpClients).
- [Studio Assistant](../../AI/assistant/README.md), which it forwards its users' requests to.

## v8 and v9 apps

A v8 app lists its layout sets in `layout-sets.json`, and a v9 app has [UI folders](../../../GLOSSARY.md) instead.
Where the formats differ, the backend checks `IAppVersionService.IsV9App`. `AppDevelopmentService` writes the v8
format and `UiFoldersService` the v9 format. [Designer](../README.md#v8-and-v9-apps) says when we change the v8 code.

## Development

The folder has two solutions, so pass one to `dotnet build` and `dotnet test`. `Designer.sln` holds the projects and
their tests. `Src.sln` holds only the projects, for CodeQL. To run the API on its own, see
[Running Designer locally](../development/README.md#work-on-one-part).

The tests in the `StudioOidcGiteaIntegrationTest` and `DbIntegrationTest` categories start Gitea and PostgreSQL in
containers, so they need Docker or Podman. CI runs them in a
[separate job](../../../.github/workflows/designer-backend-dotnet-test.yaml), which sometimes fails a block of
`RepositoryController` tests on Gitea's side, with a 403 on repository creation or an unexpected 204 from
`GetBranches`. Rerun the job once before you debug. A
[migrations check](../../../.github/workflows/designer-backend-dotnet-migrations-ensure-compatibility.yaml) makes
sure the migrations script can be generated and a new migration added.

The [coding standards](docs/coding-standards.md) say how we write the backend's code and tests.
