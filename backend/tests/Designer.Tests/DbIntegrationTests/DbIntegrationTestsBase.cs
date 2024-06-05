using System.Text.Json;
using System.Text.Json.Serialization;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

[Trait("Category", "DbIntegrationTest")]
[Collection(nameof(DesignerDbCollection))]
public abstract class DbIntegrationTestsBase
{
    protected readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };
    protected DesignerDbFixture DbFixture { get; }

    protected DbIntegrationTestsBase(DesignerDbFixture dbFixture)
    {
        DbFixture = dbFixture;
    }
}
