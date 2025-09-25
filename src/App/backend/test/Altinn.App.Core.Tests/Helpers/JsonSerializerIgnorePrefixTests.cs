using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.App.PlatformServices.Tests.Helpers;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class JsonSerializerIgnorePrefixTests
{
    [Fact]
    public void OptionsWithIgnorePrefix()
    {
        var options1 = JsonSerializerIgnorePrefix.GetOptions("A_");
        var options2 = JsonSerializerIgnorePrefix.GetOptions("A_");
        options1.Should().BeSameAs(options2);
        var options3 = JsonSerializerIgnorePrefix.GetOptions("B_");
        options3.Should().NotBeSameAs(options2);

        Assert.Throws<ArgumentNullException>(() => JsonSerializerIgnorePrefix.GetOptions(null!));
    }

    [Fact]
    public void ShouldRemoveShadowFields_WithPrefix()
    {
        var (prefix, data) = ShadowFieldsConverterTests.GetData();

        // Check that regular serialization (without modifier) includes shadow fields in result
        string serializedDataWithoutModifier = JsonSerializer.Serialize(data);
        Assert.Contains(prefix, serializedDataWithoutModifier);

        // Check that serialization with modifier removes shadow fields from result
        string serializedData = JsonSerializerIgnorePrefix.Serialize(data, prefix);
        Assert.DoesNotContain(prefix, serializedData);
    }
}
