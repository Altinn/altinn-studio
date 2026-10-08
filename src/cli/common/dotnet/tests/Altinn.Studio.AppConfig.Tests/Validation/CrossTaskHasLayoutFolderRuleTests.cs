using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CrossTaskHasLayoutFolderRuleTests
{
    private const string Rule = "CROSS-TASK-HAS-LAYOUT-FOLDER";

    private static string Process(params (string Id, string TaskType)[] tasks) =>
        "<definitions><process>"
        + string.Concat(
            tasks.Select(t =>
                $"<task id=\"{t.Id}\"><extensionElements><taskExtension><taskType>{t.TaskType}</taskType></taskExtension></extensionElements></task>"
            )
        )
        + "</process></definitions>";

    private static InMemoryAppDirectory App(string process, params string[] folders)
    {
        var files = new Dictionary<string, string>
        {
            ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/tf"),
            ["App/config/process/process.bpmn"] = process,
        };
        foreach (var folder in folders)
        {
            files[$"App/ui/{folder}/Settings.json"] = """{"pages":{"order":["P1"]}}""";
            files[$"App/ui/{folder}/layouts/P1.json"] = """{"data":{"layout":[]}}""";
        }
        return new InMemoryAppDirectory(files);
    }

    [Fact]
    public void DataTaskWithoutFolder_NextToAnUnusedFolder_IsOneErrorNamingThatFolder()
    {
        var report = AppConfigEngine.Open(App(Process(("Utfylling", "data")), "Task_1")).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Equal("App/config/process/process.bpmn", finding.Position.File);
        Assert.Contains("\"Utfylling\"", finding.Message, StringComparison.Ordinal);
        Assert.Contains("\"Task_1\"", finding.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "UNUSED-LAYOUT-FOLDER");
    }

    [Fact]
    public void DataTaskWithoutFolder_NextToAnotherTasksFolder_Fires()
    {
        var report = AppConfigEngine.Open(App(Process(("Task_1", "data"), ("Task_2", "data")), "Task_1")).Validate();

        var finding = Assert.Single(report.Findings, f => f.RuleId == Rule);
        Assert.Contains("\"Task_2\"", finding.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("unused", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void NonDataTaskWithoutFolder_IsClean()
    {
        var report = AppConfigEngine
            .Open(App(Process(("Task_1", "data"), ("Task_2", "confirmation")), "Task_1"))
            .Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void UnusedFolder_WhileEveryDataTaskHasAFolder_IsStillWarned()
    {
        var report = AppConfigEngine.Open(App(Process(("Task_1", "data")), "Task_1", "Leftover")).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
        var finding = Assert.Single(report.Findings, f => f.RuleId == "UNUSED-LAYOUT-FOLDER");
        Assert.Contains("\"Leftover\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void AppWithoutAnyFolder_IsNotChecked()
    {
        var report = AppConfigEngine.Open(App(Process(("Task_1", "data")))).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }

    [Fact]
    public void StatelessAppWithOnlyItsOnEntryFolder_IsNotChecked()
    {
        var dir = App(Process(("Task_1", "data")), "stateless");
        dir.Set(
            "App/config/applicationmetadata.json",
            """{"id":"ttd/tf","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[],"onEntry":{"show":"stateless"}}"""
        );

        var report = AppConfigEngine.Open(dir).Validate();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == Rule);
    }
}
