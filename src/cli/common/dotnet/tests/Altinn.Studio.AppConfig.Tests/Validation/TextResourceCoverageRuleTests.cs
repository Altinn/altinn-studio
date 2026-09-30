using System.Globalization;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class TextResourceCoverageRuleTests
{
    private const string Rule = "TEXT-RESOURCE-COVERAGE";

    private static List<Finding> Findings(params (string File, string Content)[] texts)
    {
        var files = new Dictionary<string, string> { ["App/config/applicationmetadata.json"] = TestMeta.Json() };
        foreach (var (file, content) in texts)
            files[$"App/config/texts/{file}"] = content;
        return AppConfigEngine
            .Open(new InMemoryAppDirectory(files))
            .Validate()
            .Findings.Where(f => f.RuleId == Rule)
            .ToList();
    }

    [Fact]
    public void LanguageMissingFromTitle_IsStillCompared()
    {
        var findings = Findings(
            (
                "resource.nb.json",
                """{"language":"nb","resources":[{"id":"shared","value":"Delt"},{"id":"only-nb","value":"Bare bokmål"}]}"""
            ),
            (
                "resource.en.json",
                """{"language":"en","resources":[{"id":"shared","value":"Shared"},{"id":"only-en","value":"English only"}]}"""
            )
        );

        Assert.Collection(
            findings,
            f =>
            {
                Assert.Equal(
                    "text-resource key \"only-nb\" is declared in resource.nb.json but missing from resource.en.json",
                    f.Message
                );
                Assert.Equal("App/config/texts/resource.en.json", f.Position.File);
                Assert.Equal("/language", f.Position.Pointer);
            },
            f =>
            {
                Assert.Equal(
                    "text-resource key \"only-en\" is declared in resource.en.json but missing from resource.nb.json",
                    f.Message
                );
                Assert.Equal("App/config/texts/resource.nb.json", f.Position.File);
                Assert.Equal("/language", f.Position.Pointer);
            }
        );
        Assert.All(findings, f => Assert.Equal(Severity.Info, f.Severity));
    }

    [Fact]
    public void FilesTheAppDoesNotServeAsALanguage_AreNotCompared()
    {
        var findings = Findings(
            ("resource.nb.json", """{"language":"nb","resources":[{"id":"a","value":"A"}]}"""),
            ("resource.nb-NO.json", """{"language":"nb-NO","resources":[{"id":"b","value":"B"}]}"""),
            ("resource.en.json", """{"language":"nb","resources":[{"id":"c","value":"C"}]}""")
        );

        Assert.Empty(findings);
    }

    [Theory]
    [InlineData(
        2,
        "2 text-resource keys are declared in resource.nb.json but missing from resource.en.json: \"k01\" and \"k02\""
    )]
    [InlineData(
        3,
        "3 text-resource keys are declared in resource.nb.json but missing from resource.en.json: \"k01\", \"k02\" and \"k03\""
    )]
    [InlineData(
        89,
        "89 text-resource keys are declared in resource.nb.json but missing from resource.en.json: \"k01\", \"k02\", \"k03\" and 86 more"
    )]
    public void KeysMissingFromALanguage_AreReportedOnceOnThatLanguage(int count, string message)
    {
        var resources = string.Join(
            ",",
            Enumerable
                .Range(1, count)
                .Select(i => $$"""{"id":"k{{i.ToString("D2", CultureInfo.InvariantCulture)}}","value":"x"}""")
        );

        var finding = Assert.Single(
            Findings(
                ("resource.nb.json", $$"""{"language":"nb","resources":[{{resources}}]}"""),
                ("resource.en.json", """{"language":"en","resources":[]}""")
            )
        );

        Assert.Equal(message, finding.Message);
        Assert.Equal("App/config/texts/resource.en.json", finding.Position.File);
        Assert.Equal("/language", finding.Position.Pointer);
    }
}
