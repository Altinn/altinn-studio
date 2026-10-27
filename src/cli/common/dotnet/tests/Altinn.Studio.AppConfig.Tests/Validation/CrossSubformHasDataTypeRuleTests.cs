using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CrossSubformHasDataTypeRuleTests
{
    private const string Rule = "CROSS-SUBFORM-HAS-DATATYPE";

    private static InMemoryAppDirectory App(
        string dataTypes,
        string subformSettings,
        string layoutSet = "moped-subform"
    ) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    $$"""{"id":"ttd/sf","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{{dataTypes}}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"sf","type":"Subform","layoutSet":""" + $"\"{layoutSet}\"" + "}]}}",
                ["App/ui/moped-subform/Settings.json"] = subformSettings,
                ["App/ui/moped-subform/layouts/S1.json"] = """{"data":{"layout":[]}}""",
            }
        );

    private const string Model = """{"id":"model","appLogic":{"classRef":"App.Models.M"},"taskId":"Task_1"}""";
    private const string Moped = """{"id":"moped","appLogic":{"classRef":"App.Models.Moped"},"maxCount":3}""";

    [Fact]
    public void SubformFolderWithoutDataType_IsOneErrorNamingTheCandidateDataType()
    {
        var report = AppConfigEngine.Open(App($"{Model},{Moped}", """{"pages":{"order":["S1"]}}""")).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Equal("App/ui/moped-subform/Settings.json", finding.Position.File);
        Assert.Contains("\"sf\"", finding.Message, StringComparison.Ordinal);
        Assert.Contains("\"moped\"", finding.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "DATATYPE-COUNT");
    }

    [Fact]
    public void SubformFolderWithDataType_IsClean()
    {
        var report = AppConfigEngine
            .Open(App($"{Model},{Moped}", """{"pages":{"order":["S1"]},"defaultDataType":"moped"}"""))
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "DATATYPE-COUNT");
    }

    [Fact]
    public void MissingSubformFolder_IsLeftToRefLayoutSet()
    {
        var report = AppConfigEngine
            .Open(App($"{Model},{Moped}", """{"pages":{"order":["S1"]}}""", layoutSet: "no-such-folder"))
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
        Assert.Contains(report.Findings, f => f.RuleId == "REF-LAYOUT-SET");
    }

    [Fact]
    public void FormDataTypeOfATaskFolder_IsNotACandidate_AndStaysWithDataTypeCount()
    {
        var model = """{"id":"model","appLogic":{"classRef":"App.Models.M"},"taskId":"Task_1","maxCount":2}""";

        var report = AppConfigEngine.Open(App(model, """{"pages":{"order":["S1"]}}""")).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.DoesNotContain("\"model\"", finding.Message, StringComparison.Ordinal);
        Assert.Contains(
            report.Findings,
            f => f.RuleId == "DATATYPE-COUNT" && f.Message.Contains("\"model\"", StringComparison.Ordinal)
        );
    }
}
