using Xunit;

namespace Designer.Tests.Fixtures
{
    [CollectionDefinition(nameof(GiteaIntegrationTestsCollection), DisableParallelization = true)]
    public class GiteaIntegrationTestsCollection : ICollectionFixture<GiteaFixture>, ICollectionFixture<GiteaWebAppApplicationFactoryFixture<Program>>, ICollectionFixture<SharedDesignerHttpClientProvider>
    {
        // This class has no code, and is never created. Its purpose is simply
        // to be the place to apply [CollectionDefinition] and all the
        // ICollectionFixture<> interfaces.
    }
}
