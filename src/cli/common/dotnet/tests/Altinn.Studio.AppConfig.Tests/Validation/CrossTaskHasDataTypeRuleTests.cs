using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CrossTaskHasDataTypeRuleTests
{
    private const string Rule = "CROSS-TASK-HAS-DATATYPE";

    private static string Task(string id) =>
        $"<task id=\"{id}\"><extensionElements><taskExtension><taskType>data</taskType></taskExtension></extensionElements></task>";

    private static string Flow(string from, string to) =>
        $"<sequenceFlow id=\"{from}-{to}\" sourceRef=\"{from}\" targetRef=\"{to}\"/>";

    private static InMemoryAppDirectory App(string process, params (string Folder, string? DefaultDataType)[] folders)
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = """
                {"id":"ttd/td","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[
                  {"id":"model","taskId":"Task_1","appLogic":{"classRef":"M"}}
                ]}
                """,
                ["App/config/process/process.bpmn"] = $"<definitions><process>{process}</process></definitions>",
            }
        );
        foreach (var (folder, defaultDataType) in folders)
        {
            var dataType = defaultDataType is null ? "" : $",\"defaultDataType\":\"{defaultDataType}\"";
            dir.Set($"App/ui/{folder}/Settings.json", $$"""{"pages":{"order":["P1"]}{{dataType}}}""");
            dir.Set($"App/ui/{folder}/layouts/P1.json", """{"data":{"layout":[]}}""");
        }
        return dir;
    }

    private static List<Finding> Findings(InMemoryAppDirectory dir, string rule = Rule) =>
        AppConfigEngine.Open(dir).Validate().Findings.Where(f => f.RuleId == rule).ToList();

    private static readonly string _mainPath =
        "<startEvent id=\"Start\"/>"
        + Task("Task_1")
        + Task("Task_2")
        + Flow("Start", "Task_1")
        + Flow("Task_1", "Task_2");

    [Fact]
    public void ReachableDataTaskWithoutDataType_IsWarned()
    {
        var finding = Assert.Single(Findings(App(_mainPath, ("Task_1", "model"), ("Task_2", null))));

        Assert.Contains("\"Task_2\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void DataTaskNoSequenceFlowReaches_IsNotChecked()
    {
        var dir = App(
            _mainPath + Task("Orphan") + Task("Downstream") + Flow("Orphan", "Downstream"),
            ("Task_1", "model"),
            ("Task_2", "model")
        );

        Assert.Empty(Findings(dir));
        Assert.Empty(Findings(dir, "CROSS-TASK-HAS-LAYOUT-FOLDER"));
    }

    [Fact]
    public void DataTaskWhoseFolderShowsADeclaredDataType_IsNotWarned()
    {
        Assert.Empty(Findings(App(_mainPath, ("Task_1", "model"), ("Task_2", "model"))));
    }

    [Fact]
    public void DataTaskWhoseFolderNamesAnUndeclaredDataType_IsWarned()
    {
        var finding = Assert.Single(Findings(App(_mainPath, ("Task_1", "model"), ("Task_2", "ghost"))));

        Assert.Contains("\"Task_2\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ProcessWithoutAStartEvent_ChecksEveryTask()
    {
        var dir = App(Task("Task_1") + Task("Task_2"), ("Task_1", "model"), ("Task_2", null));

        Assert.Contains("\"Task_2\"", Assert.Single(Findings(dir)).Message, StringComparison.Ordinal);
    }
}
