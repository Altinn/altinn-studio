using Xunit;

namespace Designer.Tests.Fixtures
{
    [CollectionDefinition(nameof(GiteaCollection), DisableParallelization = true)]
    public class GiteaCollection : ICollectionFixture<GiteaFixture>
    {
        // This class has no code, and is never created. Its purpose is simply
        // to be the place to apply [CollectionDefinition] and all the
        // ICollectionFixture<> interfaces.
    }
}
