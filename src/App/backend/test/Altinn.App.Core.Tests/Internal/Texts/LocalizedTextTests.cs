using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class LocalizedTextTests
{
    [Fact]
    public void RawTexts_AreTheTextsWithTheirLanguage()
    {
        var text = new LocalizedText(nb: "På bokmål", nn: "På nynorsk", en: "In English");

        Assert.Equal([("nb", "På bokmål"), ("nn", "På nynorsk"), ("en", "In English")], text.RawTexts);
    }

    [Fact]
    public void Invariant_UsesTheSameTextForEveryLanguage()
    {
        var text = LocalizedText.Invariant("{appName}.pdf");

        Assert.All(text.RawTexts, raw => Assert.Equal("{appName}.pdf", raw.Text));
    }
}
