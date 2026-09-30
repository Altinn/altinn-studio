using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RefTextResourceKeyRuleTests
{
    private const string Rule = "REF-TEXT-RESOURCE-KEY";

    private static List<Finding> Findings(string title, params string[] declaredKeys)
    {
        var resources = string.Join(",", declaredKeys.Select(k => $$"""{"id":{{Quote(k)}},"value":"x"}"""));
        var files = new Dictionary<string, string>
        {
            ["App/config/applicationmetadata.json"] = TestMeta.Json(),
            ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
            ["App/ui/Task_1/layouts/P1.json"] =
                $$$"""{"data":{"layout":[{"id":"p","type":"Paragraph","textResourceBindings":{"title":{{{Quote(title)}}}}}]}}""",
            ["App/config/texts/resource.nb.json"] = $$"""{"language":"nb","resources":[{{resources}}]}""",
        };
        return AppConfigEngine
            .Open(new InMemoryAppDirectory(files))
            .Validate()
            .Findings.Where(f => f.RuleId == Rule)
            .ToList();
    }

    private static string Quote(string value) => JsonSerializer.Serialize(value);

    [Theory]
    [InlineData("Endre")]
    [InlineData("Øre")]
    [InlineData("Telefon:")]
    [InlineData("https://www.altinn.no/hjelp")]
    [InlineData("+47")]
    [InlineData("Kl.")]
    [InlineData("2.0")]
    [InlineData("patentstyret.no")]
    public void LiteralText_IsReportedAsInfo(string literal)
    {
        var finding = Assert.Single(Findings(literal, "other.key"));

        Assert.Equal(Severity.Info, finding.Severity);
        Assert.Equal(
            $"\"{literal}\" (title on component \"p\") is not a declared text-resource key, so the app shows it as written in every language",
            finding.Message
        );
    }

    [Theory]
    [InlineData("page1.title")]
    [InlineData("back")]
    [InlineData("InstanceId")]
    [InlineData("HelpText_5_1_4")]
    [InlineData("Side1.Input-Ud91oS.summaryTitle")]
    [InlineData("answer.No")]
    public void KeyShapedValue_IsReportedAsWarning(string key)
    {
        var finding = Assert.Single(Findings(key, "other.key"));

        Assert.Equal(Severity.Warning, finding.Severity);
        Assert.Equal(
            $"text-resource key \"{key}\" (title on component \"p\") is not declared in any resource.<lang>.json",
            finding.Message
        );
    }

    [Theory]
    [InlineData("Adrese", "Adresse")]
    [InlineData("Next", "next")]
    [InlineData("question1.no", "question1.yes")]
    public void LiteralLookingValue_SpelledLikeADeclaredKey_IsReportedAsWarning(string value, string declared)
    {
        var finding = Assert.Single(Findings(value, declared));

        Assert.Equal(Severity.Warning, finding.Severity);
    }

    [Theory]
    [InlineData("Send inn")]
    [InlineData("<br>")]
    public void InlineText_IsNotReported(string text) => Assert.Empty(Findings(text));
}
