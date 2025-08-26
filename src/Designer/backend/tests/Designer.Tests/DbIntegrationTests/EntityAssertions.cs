using System.Text.Json;
using System.Text.Json.Serialization;

namespace Designer.Tests.DbIntegrationTests;

public static partial class EntityAssertions
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };
}
