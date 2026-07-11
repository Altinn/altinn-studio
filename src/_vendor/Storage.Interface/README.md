# Temporary Storage.Interface source

This project temporarily lets the app backend and LocalTest compile against the approved
content-Etag interface before a corresponding `Altinn.Platform.Storage.Interface` package is
released. It preserves the package's assembly simple name, namespaces, and type names, but is
deliberately not packable.

The source tracks the `altinn-storage` `feat/blob-version-id` line at Phase 1 change
`rvmxkqqswxvzqqurwlywyrnlxtuxuvuv`, revision
`e3161dfb7b1a2cba288c60c012a681301f9b0e74`. The only intentional upstream differences are
this README and the minimal project scaffolding: MinVer, SonarCloud/SourceLink, package metadata,
symbol packaging, and the unnecessary `Microsoft.NETFramework.ReferenceAssemblies` dependency
are omitted, and `IsPackable` is `false`.

Delete this entire directory after the interface package containing `DataElement.ContentEtag`
and without `InstanceMutationResponse.DataElementContentEtags` is released. Then:

1. Replace the project references in `src/App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj`
   and `src/App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj` with unversioned
   `Altinn.Platform.Storage.Interface` package references, and restore its released version in
   `src/App/backend/Directory.Packages.props`.
2. Replace the project reference in `src/Runtime/localtest/src/LocalTest.csproj` with an
   `Altinn.Platform.Storage.Interface` package reference pinned to that released version.
3. Remove this project from `src/App/backend/solutions/All.slnx`,
   `src/App/backend/solutions/Src.slnx`, `src/App/backend/AppLibDotnet.slnx`, and
   `src/Runtime/localtest/LocalTest.sln`.
4. Remove the `BlockAppPackagePackWhileStorageInterfaceIsVendored` target from
   `src/App/backend/src/Directory.Build.targets`.
5. After Phase 4 makes the LocalTest response mirror unnecessary, delete
   `src/Runtime/localtest/src/Models/Storage/InstanceMutationResponse.cs` and remove the
   `InstanceMutationResponse` alias from
   `src/Runtime/localtest/src/Controllers/Storage/InstanceMutationsController.cs`, so the
   controller uses the released package type directly. Delete
   `src/Runtime/localtest/test/LocalTest.Tests/Storage/InstanceMutationResponseContractTests.cs`
   with the legacy mirror/map, or replace it with Phase 4 contract coverage for `contentEtag`
   and the response without `dataElementContentEtags` if that coverage remains valuable.
