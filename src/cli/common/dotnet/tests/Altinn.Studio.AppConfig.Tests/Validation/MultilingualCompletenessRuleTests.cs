using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class MultilingualCompletenessRuleTests
{
    private const string Rule = "MULTILINGUAL-COMPLETENESS";

    private static List<Finding> Findings(string title, params (string Language, string Resources)[] texts)
    {
        var files = new Dictionary<string, string>
        {
            ["App/config/applicationmetadata.json"] =
                $$"""{"id":"ttd/x","org":"ttd","title":{{title}},"partyTypesAllowed":{},"dataTypes":[]}""",
        };
        foreach (var (language, resources) in texts)
            files[$"App/config/texts/resource.{language}.json"] =
                $$"""{"language":"{{language}}","resources":[{{resources}}]}""";
        return AppConfigEngine
            .Open(new InMemoryAppDirectory(files))
            .Validate()
            .Findings.Where(f => f.RuleId == Rule)
            .ToList();
    }

    [Fact]
    public void LanguageWithTextsButNoTitle_IsReported()
    {
        var finding = Assert.Single(Findings("""{"nb":"Søknad"}""", ("nb", ""), ("en", "")));

        Assert.Equal(
            "language \"en\" has config/texts/resource.en.json but no title in applicationmetadata.json, so Altinn's inbox shows the \"nb\" title to \"en\" users",
            finding.Message
        );
        Assert.Equal(Severity.Info, finding.Severity);
        Assert.Equal("App/config/applicationmetadata.json", finding.Position.File);
        Assert.Equal("/title", finding.Position.Pointer);
    }

    [Fact]
    public void WithoutNbTitle_InboxFallsBackToTheFirstTitle()
    {
        var finding = Assert.Single(Findings("""{"nn":"Søknad","en":"Application"}""", ("nb", "")));

        Assert.Contains("shows the \"nn\" title to \"nb\" users", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void WithoutAnyTitle_InboxHasNoTitle()
    {
        var finding = Assert.Single(Findings("{}", ("nb", "")));

        Assert.Contains("has no title to show \"nb\" users", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void TitleLanguageWithoutTexts_IsNotReported()
    {
        Assert.Empty(Findings("""{"nb":"Søknad","nn":"Søknad","en":"Application"}""", ("nb", "")));
    }

    [Fact]
    public void LanguageTheInboxDoesNotOffer_IsNotReported()
    {
        Assert.Empty(Findings("""{"nb":"Søknad"}""", ("nb", ""), ("de", "")));
    }

    [Fact]
    public void DialogportenTitleText_IsNotReported()
    {
        Assert.Empty(
            Findings("""{"nb":"Søknad"}""", ("nb", """{"id":"dp.title","value":"Søknad om noe"}"""), ("en", ""))
        );
    }
}
