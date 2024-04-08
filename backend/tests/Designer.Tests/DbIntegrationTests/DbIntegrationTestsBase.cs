using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

[Collection(nameof(DesignerDbCollection))]
public abstract class DbIntegrationTestsBase
{
    protected DesignerDbFixture DbFixture { get; }

    protected DbIntegrationTestsBase(DesignerDbFixture dbFixture)
    {
        DbFixture = dbFixture;
    }
}
