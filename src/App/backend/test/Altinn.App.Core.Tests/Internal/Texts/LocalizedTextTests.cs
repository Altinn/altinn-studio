using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class LocalizedTextTests
{
    private readonly LocalizedText _text = new(
        nb: "{count} av {name} på bokmål",
        nn: "{count} av {name} på nynorsk",
        en: "{count} of {name} in English"
    );

    [Theory]
    [InlineData("nb", "2 av fil på bokmål")]
    [InlineData("nn", "2 av fil på nynorsk")]
    [InlineData("en", "2 of fil in English")]
    [InlineData("se", "2 of fil in English")]
    [InlineData("", "2 of fil in English")]
    public void Apply_UsesTheLanguageOrEnglish(string language, string expected)
    {
        Assert.Equal(expected, _text.Apply(language, ["2", "fil"]));
    }

    [Fact]
    public void ReplacementKeys_AreTheDistinctPlaceholdersInOrder()
    {
        var text = new LocalizedText(nb: "{a} {b} {a}", nn: "{b} {c}", en: "{a}");

        Assert.Equal(["a", "b", "c"], text.ReplacementKeys);
        Assert.Equal("1 2 1", text.Apply("nb", ["1", "2", "3"]));
        Assert.Equal("2 3", text.Apply("nn", ["1", "2", "3"]));
    }

    [Fact]
    public void Apply_LeavesAPlaceholderWithANullValue()
    {
        Assert.Equal("{count} of fil in English", _text.Apply("en", [null, "fil"]));
    }

    [Fact]
    public void Apply_DoesNotReplaceInsideAValue()
    {
        Assert.Equal("{name} of fil in English", _text.Apply("en", ["{name}", "fil"]));
    }

    [Fact]
    public void Apply_ThrowsOnWrongNumberOfValues()
    {
        Assert.Throws<ArgumentException>(() => _text.Apply("en", ["2"]));
    }

    [Fact]
    public void Apply_KeepsTextWithoutPlaceholders()
    {
        var text = LocalizedText.Invariant("No placeholders here");

        Assert.Empty(text.ReplacementKeys);
        Assert.Equal("No placeholders here", text.Apply("nn", []));
    }

    [Fact]
    public void RawTexts_AreTheTextsBeforeReplacement()
    {
        Assert.Equal(
            [
                ("nb", "{count} av {name} på bokmål"),
                ("nn", "{count} av {name} på nynorsk"),
                ("en", "{count} of {name} in English"),
            ],
            _text.RawTexts
        );
    }

    [Fact]
    public void Invariant_UsesTheSameTextForEveryLanguage()
    {
        var text = LocalizedText.Invariant("{appName}.pdf");

        Assert.All(text.RawTexts, raw => Assert.Equal("{appName}.pdf", raw.Text));
        Assert.Equal("App.pdf", text.Apply("nb", ["App"]));
    }
}
