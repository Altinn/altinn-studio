using Xunit;

namespace Designer.Tests.Fixtures;

[CollectionDefinition(nameof(DesignerDbCollection), DisableParallelization = true)]
public class DesignerDbCollection : ICollectionFixture<DesignerDbFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to be the place to apply [CollectionDefinition] and all the
    // ICollectionFixture<> interfaces.
}
