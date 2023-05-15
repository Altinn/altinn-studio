#nullable enable
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

using Altinn.App.Core.Helpers;

using Xunit;

namespace Altinn.App.PlatformServices.Tests.Helpers;

public class ShadowFieldsConverterTests
{
    [Fact]
    public void ShouldRemoveShadowFields_WithPrefix()
    {
        var data = new Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.ModelWithShadowFields()
        {
            AltinnSF_hello = "hello",
            AltinnSF_test = "test",
            Property1 = 1,
            Property2 = 2,
            AltinnSF_gruppeish = new Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.AltinnSF_gruppeish()
            {
                F1 = "f1",
                F2 = "f2",
            },
            Gruppe = new List<Altinn.App.Core.Tests.Implementation.TestData.AppDataModel.Gruppe>()
            {
                new()
                {
                    AltinnSF_gfhjelpefelt = "gfhjelpefelt",
                    Gf1 = "gf1",
                },
                new()
                {
                    AltinnSF_gfhjelpefelt = "gfhjelpefelt2",
                    Gf1 = "gf1-v2",
                }
            }
        };

        // Check that regular serialization (without modifier) includes shadow fields in result
        string serializedDataWithoutModifier = JsonSerializer.Serialize(data);
        Assert.Contains("AltinnSF_", serializedDataWithoutModifier);

        var modifier = new IgnorePropertiesWithPrefix("AltinnSF_");
        JsonSerializerOptions options = new()
        {
            TypeInfoResolver = new DefaultJsonTypeInfoResolver
            {
                Modifiers = { modifier.ModifyPrefixInfo }
            },
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };
        
        // Check that serialization with modifier removes shadow fields from result
        string serializedData = JsonSerializer.Serialize(data, options);
        Assert.DoesNotContain("AltinnSF_", serializedData);
    }
}