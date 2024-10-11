using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using FluentAssertions;

namespace Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;

public class DynamicClassBuilderTests
{
    [Fact]
    public void CreateClassFromJson_GivenValidJsonDocument_ReturnsType()
    {
        // Arrange
        var json = """{ "Property1": "string", "Property2": 42 }""";
        using var jsonDocument = JsonDocument.Parse(json);

        // Act
        Type type = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        // Assert
        Assert.NotNull(type);
        Assert.Equal("DynamicClass", type.Name);
        Assert.Equal(2, type.GetProperties().Length);
        Assert.Equal(typeof(string), type.GetProperty("Property1")?.PropertyType);
        Assert.Equal(typeof(double?), type.GetProperty("Property2")?.PropertyType);

        dynamic instance = JsonSerializer.Deserialize(json, type)!;
        (instance.Property1 as string).Should().Be("string");
        (instance.Property2 as double?).Should().Be(42);
    }

    [StringSyntax(StringSyntaxAttribute.Json)]
    private const string JsonRecursive =
        """{ "Property1": { "Property2": "string", "Property4":[{"AltinnRowId":"1457"}, {"AltinnRowId":"345"}] }, "Property2": [2,4,7] }""";

    [Fact]
    public void CreateClassFromJson_GivenStructureWithRecursiveTypes_ReturnsType()
    {
        // Arrange
        using var jsonDocument = JsonDocument.Parse(JsonRecursive);

        // Act
        Type type = DynamicClassBuilder.CreateClassFromJson(jsonDocument);

        // Assert
        Assert.NotNull(type);
        Assert.Equal("DynamicClass", type.Name);
        Assert.Equal(2, type.GetProperties().Length);
        Assert.Equal("Property1", type.GetProperties()[0].Name);
        Assert.Equal(
            typeof(string),
            type.GetProperty("Property1")?.PropertyType.GetProperty("Property2")?.PropertyType
        );

        dynamic instance = JsonSerializer.Deserialize(JsonRecursive, type)!;
        (instance.Property1.Property2 as string).Should().Be("string");
        (instance.Property2 as List<double?>).Should().BeEquivalentTo([2, 4, 7]);
    }
}
