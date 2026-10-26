# Altinn.App .NET libraries

The Altinn.App libraries are what the backend of an Altinn 3 app is built on. An app references `Altinn.App.Api` and
`Altinn.App.Core`. The libraries serve the API that the app frontend and service owners' systems call, run the app's
process, and call the Altinn platform services on the app's behalf. Apps add their own logic by implementing the
interfaces in `Altinn.App.Core`.

[docs.altinn.studio](https://docs.altinn.studio) documents how to develop apps. The
[changelog](https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/CHANGELOG.md) lists the changes in each
release.

## How it fits

This README is also the readme of the NuGet packages, so its links are absolute.

- These are the libraries for v9 apps. The v8 libraries live in
  [app-lib-dotnet](https://github.com/Altinn/app-lib-dotnet), and we merge their fixes into this folder as
  [upstream sync](https://github.com/Altinn/altinn-studio/blob/main/src/App/docs/upstream-sync.md) describes.
- `Altinn.App.Api` carries the build of the
  [app frontend](https://github.com/Altinn/altinn-studio/blob/main/src/App/frontend/README.md), and an app serves it as
  static files. The two are released together.
- The app runs process transitions through the
  [workflow engine](https://github.com/Altinn/altinn-studio/blob/main/src/Runtime/workflow-engine/README.md), which
  calls back into the app for each step.
- [Codelists](https://github.com/Altinn/altinn-studio/blob/main/src/App/codelists/README.md) and
  [FileAnalyzers](https://github.com/Altinn/altinn-studio/blob/main/src/App/fileanalyzers/README.md) are packages
  built on `Altinn.App.Core`.

## Development

[Development](https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/docs/development.md) covers building,
testing and the compatibility rules for these libraries.
