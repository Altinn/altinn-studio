using System.Globalization;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class TextResourceCoverageRuleTests
{
    private const string Rule = "TEXT-RESOURCE-COVERAGE";

    private static List<Finding> Findings(params (string Path, string Content)[] files)
    {
        var all = new Dictionary<string, string> { ["App/config/applicationmetadata.json"] = TestMeta.Json() };
        foreach (var (path, content) in files)
            all[path] = content;
        return AppConfigEngine
            .Open(new InMemoryAppDirectory(all))
            .Validate()
            .Findings.Where(f => f.RuleId == Rule)
            .ToList();
    }

    private static (string Path, string Content) Texts(string language, params string[] keys) =>
        TextFile($"resource.{language}.json", language, keys);

    private static (string Path, string Content) TextFile(string file, string language, params string[] keys) =>
        (
            $"App/config/texts/{file}",
            $$"""{"language":"{{language}}","resources":[{{string.Join(
                ",",
                keys.Select(key => $$"""{"id":"{{key}}","value":"x"}""")
            )}}]}"""
        );

    private static (string Path, string Content) OptionLabels(params string[] keys) =>
        (
            "App/options/labels.json",
            $"[{string.Join(",", keys.Select(key => $$"""{"value":"{{key}}","label":"{{key}}"}"""))}]"
        );

    [Fact]
    public void LanguageMissingFromTitle_IsStillCompared()
    {
        var findings = Findings(
            Texts("nb", "shared", "only-nb"),
            Texts("en", "shared", "only-en"),
            OptionLabels("shared", "only-nb", "only-en")
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
            Texts("nb", "a"),
            TextFile("resource.nb-NO.json", "nb-NO", "b"),
            TextFile("resource.en.json", "nb", "c"),
            OptionLabels("a", "b", "c")
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
        var keys = Enumerable
            .Range(1, count)
            .Select(i => "k" + i.ToString("D2", CultureInfo.InvariantCulture))
            .ToArray();

        var finding = Assert.Single(Findings(Texts("nb", keys), Texts("en"), OptionLabels(keys)));

        Assert.Equal(message, finding.Message);
        Assert.Equal("App/config/texts/resource.en.json", finding.Position.File);
        Assert.Equal("/language", finding.Position.Pointer);
    }

    [Fact]
    public void KeysTheAppNeverUses_AreLeftOut()
    {
        var finding = Assert.Single(
            Findings(Texts("nb", "used.key", "unused.key", "unused.too"), Texts("en"), OptionLabels("used.key"))
        );

        Assert.Equal(
            "text-resource key \"used.key\" is declared in resource.nb.json but missing from resource.en.json",
            finding.Message
        );
    }

    [Fact]
    public void KeyWhoseOnlyMentionIsItsOwnValue_IsLeftOut() =>
        Assert.Empty(
            Findings(
                (
                    "App/config/texts/resource.nb.json",
                    """{"language":"nb","resources":[{"id":"Adresse","value":"Adresse"}]}"""
                ),
                Texts("en")
            )
        );

    public static TheoryData<string, string> Usages =>
        new()
        {
            {
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"p","type":"Paragraph","textResourceBindings":{"title":"used.key"}}]}}"""
            },
            { "App/ui/Settings.json", """{"taskNavigation":[{"taskId":"Task_1","name":"used.key"}]}""" },
            { "App/ui/footer.json", """{"footer":[{"type":"Text","title":"used.key"}]}""" },
            { "App/models/model.validation.json", """{"validations":{"x":[{"message":"used.key"}]}}""" },
            { "App/logic/Validator.cs", """public class Validator { public string Key => "used.key"; }""" },
            {
                "App/config/process/process.bpmn",
                """<definitions><process><task id="Task_1"><extensionElements><filenameTextResourceKey>used.key</filenameTextResourceKey></extensionElements></task></process></definitions>"""
            },
            {
                "App/config/texts/resource.nn.json",
                """{"language":"nn","resources":[{"id":"x","value":"used.key"}]}"""
            },
            {
                "App/config/texts/resource.nn.json",
                """{"language":"nn","resources":[{"id":"x","value":"{0}","variables":[{"key":"used.key","dataSource":"text"}]}]}"""
            },
        };

    [Theory]
    [MemberData(nameof(Usages))]
    public void KeysNamedAnywhereInTheApp_AreUsed(string path, string content) =>
        Assert.Contains(
            Findings(Texts("nb", "used.key"), Texts("en"), (path, content)),
            f => f.Message.Contains("\"used.key\"", StringComparison.Ordinal)
        );

    [Fact]
    public void PageNames_AreUsed() =>
        Assert.Single(
            Findings(
                Texts("nb", "Oppsummering"),
                Texts("en"),
                ("App/ui/Task_1/Settings.json", """{"pages":{"order":["Oppsummering"]}}"""),
                ("App/ui/Task_1/layouts/Oppsummering.json", """{"data":{"layout":[]}}""")
            )
        );

    [Theory]
    [InlineData("appName")]
    [InlineData("appOwner")]
    [InlineData("dp.summary")]
    [InlineData("backend.pdf_default_file_name")]
    [InlineData("general.back")]
    public void KeysTheRuntimeLooksUpByName_AreUsed(string key) =>
        Assert.Single(Findings(Texts("nb", key), Texts("en")));
}
