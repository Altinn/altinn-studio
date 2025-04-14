namespace Altinn.App.Analyzers.Tests.Fixtures;

// This fixture is used to provide a test app Roslyn workspace for the analyzers to run on.
// The test app is a real blank Altinn app in the "testapp/" folder.
// Initializing the fixture is expensive, and can take anywhere between 5-20 seconds on my machine currently,
// so currently tests run in a "global collection" to avoid re-initializing the fixture for each test.
// It also gives us some flexibility in that we can make physical changes to project files.
[CollectionDefinition(nameof(AltinnTestAppCollection), DisableParallelization = false)]
public class AltinnTestAppCollection : ICollectionFixture<AltinnTestAppFixture> { }

// This fixture is meant to provide a workspace for injecting code into Altinn.App.Core
// to test internal analyzers.
// Both fixtures rely on Altinn.App.Core as a project reference, but we don't use
// collection fixture parallelization configuration to avoid race conditions.
// BaseFixture ensures we don't run into issues when building the projects
[CollectionDefinition(nameof(AltinnAppCoreCollection), DisableParallelization = false)]
public class AltinnAppCoreCollection : ICollectionFixture<AltinnAppCoreFixture> { }
