# Altinn.FileAnalyzers

Altinn.FileAnalyzers checks the content of files that users upload to an Altinn 3 app, such as whether a file really
is the type it claims to be. [File validation](https://docs.altinn.studio/app/development/logic/validation/files/) on
docs.altinn.studio describes how apps use it.

`Altinn.App.Core` runs file analysis in two steps. An analyzer reads the file and returns its results, such as the
detected MIME type, and a validator then checks those results against the data type's settings. This package
implements both. Keeping them apart lets an app use an analyzer to read metadata without validating it, and lets
validators work on a standard result instead of on the file.

## Development

This README is also the package's readme on NuGet. The code lives in
[src/App/fileanalyzers](https://github.com/Altinn/altinn-studio/tree/main/src/App/fileanalyzers) in the Altinn Studio
repository. [Altinn Apps](https://github.com/Altinn/altinn-studio/blob/main/src/App/README.md#releases) describes how
it is released and how it depends on `Altinn.App.Core`.
