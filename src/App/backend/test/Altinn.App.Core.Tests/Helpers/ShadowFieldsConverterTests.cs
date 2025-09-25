using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Tests.Implementation.TestData.AppDataModel;

namespace Altinn.App.PlatformServices.Tests.Helpers;

public class ShadowFieldsConverterTests
{
    internal static (string Prefix, ModelWithShadowFields Data) GetData()
    {
        var data = new ModelWithShadowFields()
        {
            AltinnSF_hello = "hello",
            AltinnSF_test = "test",
            Property1 = 1,
            Property2 = 2,
            AltinnSF_gruppeish = new AltinnSF_gruppeish() { F1 = "f1", F2 = "f2" },
            Gruppe = new List<Gruppe>()
            {
                new() { AltinnSF_gfhjelpefelt = "gfhjelpefelt", Gf1 = "gf1" },
                new() { AltinnSF_gfhjelpefelt = "gfhjelpefelt2", Gf1 = "gf1-v2" },
            },
        };
        return ("AltinnSF_", data);
    }

    [Fact]
    public void ShouldRemoveShadowFields_WithPrefix()
    {
        var (prefix, data) = GetData();

        // Check that regular serialization (without modifier) includes shadow fields in result
        string serializedDataWithoutModifier = JsonSerializer.Serialize(data);
        Assert.Contains(prefix, serializedDataWithoutModifier);

        var modifier = new IgnorePropertiesWithPrefix("AltinnSF_");
        JsonSerializerOptions options = new()
        {
            TypeInfoResolver = new DefaultJsonTypeInfoResolver { Modifiers = { modifier.ModifyPrefixInfo } },
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        // Check that serialization with modifier removes shadow fields from result
        string serializedData = JsonSerializer.Serialize(data, options);
        Assert.DoesNotContain(prefix, serializedData);
    }
}
