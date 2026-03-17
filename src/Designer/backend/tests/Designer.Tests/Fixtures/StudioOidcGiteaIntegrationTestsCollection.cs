using Xunit;

namespace Designer.Tests.Fixtures
{
    [CollectionDefinition(nameof(StudioOidcGiteaIntegrationTestsCollection), DisableParallelization = true)]
    public class StudioOidcGiteaIntegrationTestsCollection
        : ICollectionFixture<StudioOidcGiteaFixture>,
            ICollectionFixture<StudioOidcGiteaWebAppApplicationFactoryFixture<Program>>,
            ICollectionFixture<StudioOidcSharedDesignerHttpClientProvider> { }
}
