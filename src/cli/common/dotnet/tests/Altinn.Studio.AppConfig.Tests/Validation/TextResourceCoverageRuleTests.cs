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
                    "text-resource key \"only-en\" is declared in resource.en.json but missing from resource.nb.json",
                    f.Message
                );
                Assert.Equal("App/config/texts/resource.en.json", f.Position.File);
                Assert.Equal("/resources/1/id", f.Position.Pointer);
            },
            f =>
            {
                Assert.Equal(
                    "text-resource key \"only-nb\" is declared in resource.nb.json but missing from resource.en.json",
                    f.Message
                );
                Assert.Equal("App/config/texts/resource.nb.json", f.Position.File);
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
}
