# Altinn Apps

This folder holds the code that every Altinn 3 app runs on. Service owners create apps in
[Designer](../Designer/README.md), and each deployed app is a .NET backend built on the libraries here, serving the
frontend here. [docs.altinn.studio](https://docs.altinn.studio) documents how to develop apps.

- [`backend`](backend/README.md) holds the Altinn.App .NET libraries that an app's backend is built on. The
  `Altinn.App.Api` package also ships the frontend.
- [`frontend`](frontend/README.md) is the React frontend that renders an app's forms and talks to its backend.
- [`codelists`](codelists/README.md) holds Altinn.Codelists, shared code lists that an app can register as options.
- [`fileanalyzers`](fileanalyzers/README.md) holds Altinn.FileAnalyzers, which analyzes and validates files uploaded
  to an app.
- [`template`](template/README.md) holds the app templates that Designer creates new apps from. The Designer image
  includes them.
- [`azure-pipelines`](azure-pipelines) holds the Azure DevOps pipelines that build and deploy apps.
- [`AppCoreDependency.props`](AppCoreDependency.props) and [`PackageVersioning.props`](PackageVersioning.props) are
  build settings shared by the packages released from here.

The backend runs process transitions through the [workflow engine](../Runtime/workflow-engine-app/README.md). The
frontend uses form packages from [`src/common/ts`](../common/ts), where they can be shared with Designer.

The backend libraries, Altinn.Codelists and Altinn.FileAnalyzers are released as NuGet packages. Each takes its
version from its own release tags.
