using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class BackendTextResourceTests
{
    private readonly BackendTextResource _textResource = new()
    {
        Key = "backend.test",
        DefaultText = LocalizedText.Create(
            nb: "{count} av {name} på bokmål",
            nn: "{count} av {name} på nynorsk",
            en: "{count} of {name} in English"
        ),
        CustomTextParameters = [new("name", "A name"), new("count", "A count")],
    };

    [Fact]
    public void CreateCustomTextParameters_PairsValuesByPosition()
    {
        var parameters = _textResource.CreateCustomTextParameters(["file", "2"]);

        Assert.Equal(new Dictionary<string, string> { ["name"] = "file", ["count"] = "2" }, parameters);
    }

    [Fact]
    public void CreateCustomTextParameters_LeavesOutNullValues()
    {
        var parameters = _textResource.CreateCustomTextParameters(["file", null]);

        Assert.Equal(new Dictionary<string, string> { ["name"] = "file" }, parameters);
    }

    [Fact]
    public void CreateCustomTextParameters_ThrowsOnWrongNumberOfValues()
    {
        Assert.Throws<ArgumentException>(() => _textResource.CreateCustomTextParameters(["file"]));
    }

    [Fact]
    public void CreateCustomTextParameters_ReturnsNullWithoutParameters()
    {
        var textResource = new BackendTextResource
        {
            Key = "backend.test",
            DefaultText = LocalizedText.Create(nb: "nb", nn: "nn", en: "en"),
        };

        Assert.Null(textResource.CreateCustomTextParameters([]));
    }

    [Theory]
    [InlineData("nb", "{1} av {0} på bokmål")]
    [InlineData("nn", "{1} av {0} på nynorsk")]
    [InlineData("en", "{1} of {0} in English")]
    [InlineData("se", "{1} of {0} in English")]
    public void GetDefaultResource_UsesTheLanguageOrEnglish(string language, string expected)
    {
        var resource = _textResource.GetDefaultResource(language);

        Assert.NotNull(resource);
        Assert.Equal("backend.test", resource.Id);
        Assert.Equal(expected, resource.Value);
        Assert.Equal(["name", "count"], resource.Variables.Select(variable => variable.Key));
        Assert.All(resource.Variables, variable => Assert.Equal("customTextParameters", variable.DataSource));
    }
}
