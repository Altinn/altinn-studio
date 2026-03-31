using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Tests.Models.Notifications.Future;

public class CustomTextTests
{
    private static CustomText CreateCustomText() =>
        new()
        {
            Nb = "Bokmål tekst",
            Nn = "Nynorsk tekst",
            En = "English text",
        };

    [Theory]
    [InlineData(LanguageConst.Nb, "Bokmål tekst")]
    [InlineData(LanguageConst.Nn, "Nynorsk tekst")]
    [InlineData(LanguageConst.En, "English text")]
    public void GetTextForLanguage_KnownLanguage_ReturnsCorrectText(string language, string expected)
    {
        var customText = CreateCustomText();

        var result = customText.GetTextForLanguage(language);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("fr")]
    [InlineData("de")]
    [InlineData("")]
    [InlineData("NB")] // case-sensitive fallback
    [InlineData("EN")]
    public void GetTextForLanguage_UnknownLanguage_FallsBackToNb(string language)
    {
        var customText = CreateCustomText();

        var result = customText.GetTextForLanguage(language);

        Assert.Equal(customText.Nb, result);
    }

    [Fact]
    public void GetTextForLanguage_NullLanguage_FallsBackToNb()
    {
        var customText = CreateCustomText();

        var result = customText.GetTextForLanguage(null!);

        Assert.Equal(customText.Nb, result);
    }
}
