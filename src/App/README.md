# Altinn Apps

This folder holds what every Altinn 3 app runs on. Service owners build apps in [Designer](../Designer/README.md).
Each app is a .NET project in its own repository, built on the backend libraries here and serving the frontend here.
[docs.altinn.studio](https://docs.altinn.studio) documents how to develop apps.

- [backend](backend/README.md) holds the Altinn.App libraries that an app's backend is built on.
- [frontend](frontend/README.md) is the React frontend that renders an app's forms and talks to its backend.
- [codelists](codelists/README.md) and [fileanalyzers](fileanalyzers/README.md) are optional packages that an app
  registers for shared code lists and for analysis of uploaded files.
- [template](template/README.md) holds the templates that Designer creates new apps from.
- [azure-pipelines](azure-pipelines) holds the Azure DevOps pipelines that Designer starts to build and
  [deploy](../../docs/infrastructure/environments.md#runtime-clusters) an app.

## How the parts fit

The backend, frontend and v9 template are for v9 apps. v8 apps use the libraries in
[app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet) and the frontend in
[app-frontend-react](https://github.com/Altinn/app-frontend-react). Backend fixes for v8 land in app-lib-dotnet first,
and we merge them into the backend here as [upstream sync](docs/upstream-sync.md) describes.

- The `Altinn.App.Api` package carries the frontend build, and an app serves it as static files.
- An app runs process transitions through the [workflow engine](../Runtime/workflow-engine/README.md), which calls
  back into the app for each step, as [workflow engine integration](backend/docs/workflow-engine-integration.md)
  describes.
- The frontend's `yarn gen` writes the layout schemas and types in
  [src/common/ts/layout-contract](../common/ts/layout-contract), which the frontend and Designer read. The frontend
  also uses the form packages in [src/common/ts](../common/ts).
- The [test apps](../test/apps) reference the backend, and some of them codelists or fileanalyzers, as projects. The
  frontend's Cypress tests run against them, so they test the frontend and backend in the same checkout.

## Releases

[`release-app.yaml`](../../.github/workflows/release-app.yaml) releases the backend and frontend together with the
[releaser](../tools/releaser/README.md), from `app/v*` tags. It publishes the Altinn.App NuGet packages, and the
frontend as an `app-dist` artifact that Designer uses for schemas and preview. Codelists and fileanalyzers have
their own release workflows and tags. [PackageVersioning.props](PackageVersioning.props) derives each package's
version from its tags.

Codelists and fileanalyzers reference `Altinn.App.Core` as a project inside this repository, and as the package
pinned in their `Directory.Packages.props` when released. [AppCoreDependency.props](AppCoreDependency.props) explains
why. CI builds each of them against the pinned package as well, which fails if a change uses a Core API newer than
the pin. To check that before you push, run this in the component's folder:

```sh
dotnet build solutions/Src.slnx -p:UseAppLibsFromSource=false
```
