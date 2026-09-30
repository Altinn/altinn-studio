using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class UniqueJsonKeyRuleTests
{
    private const string RuleId = "UNIQUE-JSON-KEY";
    private const string LayoutFile = "App/ui/Task_1/layouts/P1.json";

    [Fact]
    public void RepeatedKey_IsReportedAtTheIgnoredOccurrence()
    {
        const string layout = """
            {"data":{"layout":[{
              "id":"in","type":"Input",
              "hidden":true,
              "hidden":false
            }]}}
            """;

        var engine = AppConfigEngine.Open(App(layout));
        var finding = Assert.Single(engine.Validate().Findings, f => f.RuleId == RuleId);

        Assert.Equal(Severity.Warning, finding.Severity);
        Assert.Equal(LayoutFile, finding.Position.File);
        Assert.Equal("/data/layout/0/hidden", finding.Position.Pointer);
        Assert.Equal(
            (3, 3, 3, 11),
            (finding.Position.Line, finding.Position.Column, finding.Position.EndLine, finding.Position.EndColumn)
        );
        Assert.Equal(finding.Position, engine.ResolvePosition(finding.Position));
        Assert.Contains("\"hidden\"", finding.Message, StringComparison.Ordinal);
        Assert.Contains("line 4", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void KeyRepeatedThreeTimes_ReportsBothIgnoredOccurrences()
    {
        const string layout = """
            {"data":{"layout":[],
            "hidden":true,
            "hidden":false,
            "hidden":true}}
            """;

        var findings = AppConfigEngine.Open(App(layout)).Validate().Findings.Where(f => f.RuleId == RuleId).ToList();

        Assert.Equal([2, 3], findings.Select(f => f.Position.Line).Order());
        Assert.All(findings, f => Assert.Contains("line 4", f.Message, StringComparison.Ordinal));
    }

    [Fact]
    public void SameKeyInDifferentObjects_IsNotReported()
    {
        const string layout = """
            {"data":{"layout":[{"id":"a","type":"Input"},{"id":"b","type":"Input"}]}}
            """;

        Assert.DoesNotContain(AppConfigEngine.Open(App(layout)).Validate().Findings, f => f.RuleId == RuleId);
    }

    [Fact]
    public void RepeatedKeyInSettingsAndTexts_IsReported()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/config/texts/resource.nb.json"] = """
                {"language":"nb","language":"nb","resources":[]}
                """,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"],"order":["P1"]}}""",
                [LayoutFile] = """{"data":{"layout":[]}}""",
            }
        );

        var findings = AppConfigEngine.Open(dir).Validate().Findings.Where(f => f.RuleId == RuleId).ToList();

        Assert.Equal(
            ["/language", "/pages/order"],
            findings.Select(f => f.Position.Pointer).Order(StringComparer.Ordinal)
        );
    }

    [Fact]
    public void Model_ReadsTheLastValue_LikeTheApp()
    {
        const string layout = """
            {"data":{"layout":[{"id":"p","type":"Paragraph",
              "textResourceBindings":{"title":"texts.missing","title":"texts.present"}}]}}
            """;

        var findings = AppConfigEngine.Open(App(layout)).Validate().Findings;

        Assert.DoesNotContain(findings, f => f.Message.Contains("texts.missing", StringComparison.Ordinal));
        Assert.Contains(findings, f => f.RuleId == RuleId);
    }

    [Fact]
    public void SchemaCheck_ValidatesTheLastValueAndTheRestOfTheFile()
    {
        var schemas = SchemaSet.FromFiles(
            new Dictionary<string, string>
            {
                ["layout/layout.schema.v1.json"] = """
                {"properties":{"data":{"properties":{"layout":{"items":{
                  "properties":{"id":{"type":"string"},"type":{"type":"string"},"hidden":{"type":"boolean"}},
                  "additionalProperties":false
                }}}}}}
                """,
            }
        );
        const string layout = """
            {"data":{"layout":[
              {"id":"a","type":"Input","hidden":"yes","hidden":true},
              {"id":"b","type":"Input","hidden":true,"hidden":"no"},
              {"id":"c","type":"Input","size":1}
            ]}}
            """;

        var findings = AppConfigEngine
            .Open(App(layout))
            .ValidateAll(schemas)
            .Findings.Where(f => f.RuleId == "JSONSCHEMA-VALID")
            .ToList();

        Assert.DoesNotContain(findings, f => f.Message.Contains("evaluation failed", StringComparison.Ordinal));
        Assert.Equal(
            ["/data/layout/1/hidden", "/data/layout/2/size"],
            findings.Select(f => f.Position.Pointer).Order(StringComparer.Ordinal)
        );
    }

    private static InMemoryAppDirectory App(string layout) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/config/texts/resource.nb.json"] = """
                {"language":"nb","resources":[{"id":"texts.present","value":"Hei"}]}
                """,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                [LayoutFile] = layout,
            }
        );
}
