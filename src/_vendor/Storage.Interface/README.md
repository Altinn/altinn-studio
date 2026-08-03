# Temporary Storage.Interface source

This project temporarily lets the app backend compile against the approved content-Etag
interface before a corresponding `Altinn.Platform.Storage.Interface` package is released. It
preserves the package's assembly simple name, namespaces, and type names, but is deliberately
not packable.

LocalTest does not consume this project. It still references
`Altinn.Platform.Storage.Interface` package version `4.2.1`; LocalTest parity is deferred until
the corresponding interface package is released.

The source tracks the `altinn-storage` `feat/blob-version-id` line at Phase 1 change
`rvmxkqqswxvzqqurwlywyrnlxtuxuvuv`, revision
`e3161dfb7b1a2cba288c60c012a681301f9b0e74`. The only intentional upstream differences are
this README and the minimal project scaffolding: MinVer, SonarCloud/SourceLink, package metadata,
symbol packaging, and the unnecessary `Microsoft.NETFramework.ReferenceAssemblies` dependency
are omitted, and `IsPackable` is `false`.

The process-status members in `ProcessState` and `InstanceMutationRequest`, together with
`ProcessStatus`, track the approved `altinn-storage` aggregate-contract change
`lvylpkkzxxtyqktluvxsqxrzykmxmzrw`, revision
`7387c7afdce132158f932fd2c7232a60a4b66120`.

Delete this entire directory after the interface package containing `DataElement.ContentEtag`,
without `InstanceMutationResponse.DataElementContentEtags`, and containing the process-status
contract is released. Then:

1. Replace the project references in `src/App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj`
   and `src/App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj` with unversioned
   `Altinn.Platform.Storage.Interface` package references, and restore its released version in
   `src/App/backend/Directory.Packages.props`.
2. Remove this project from `src/App/backend/solutions/All.slnx`,
   `src/App/backend/solutions/Src.slnx`, and `src/App/backend/AppLibDotnet.slnx`.
3. Remove the `BlockAppPackagePackWhileStorageInterfaceIsVendored` target from
   `src/App/backend/src/Directory.Build.targets`.
