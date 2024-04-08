using Xunit;

namespace Designer.Tests.Fixtures;

[CollectionDefinition(nameof(PostgreSqlCollection), DisableParallelization = true)]
public class PostgreSqlCollection : ICollectionFixture<PostgreSqlFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to be the place to apply [CollectionDefinition] and all the
    // ICollectionFixture<> interfaces.
}
