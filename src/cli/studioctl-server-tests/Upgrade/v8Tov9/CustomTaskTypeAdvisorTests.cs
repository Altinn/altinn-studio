using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.ProcessAdvisories;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CustomTaskTypeAdvisorTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Analyze() => CustomTaskTypeAdvisor.Analyze(_app.Root);

    [Fact]
    public async Task CustomTypes_OneWarningNamesEachTypeAndItsTasks_AndTheFileIsUnchanged()
    {
        var bpmn = Process(
            Task("Task_1", "data"),
            Task("Task_Sftp", "sftp"),
            ServiceTask("Task_Sign1", "parallel_signing"),
            Task("Task_Sign2", "parallel_signing"),
            PdfServiceTask("Task_Pdf")
        );
        _app.Write(ProcessPath, bpmn);

        var result = await Analyze();

        var warning = Assert.Single(result.Warnings);
        Assert.Equal(
            "The process uses the custom task type(s) 'sftp' (Task_Sftp), 'parallel_signing' (Task_Sign1, Task_Sign2). "
                + "Instances started under v8 store their current task's type, so keep the same Type string when you "
                + "port each task class to v9, or those instances can't finish the task.",
            warning
        );
        Assert.Empty(result.Todos);
        Assert.Equal(bpmn, _app.Read(ProcessPath));
    }

    [Theory]
    [InlineData("data")]
    [InlineData("confirmation")]
    [InlineData("feedback")]
    [InlineData("signing")]
    [InlineData("payment")]
    [InlineData("pdf")]
    [InlineData("subformPdf")]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    [InlineData("NullType")]
    [InlineData("")]
    public async Task BuiltInType_IsSilent(string taskType)
    {
        _app.Write(ProcessPath, Process(Task("Task_1", taskType), ServiceTask("Task_2", taskType)));

        var result = await Analyze();

        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task TypeDifferingFromABuiltInOnlyInCase_IsCustom()
    {
        // The app matches the type as written, so 'Data' is no data task.
        _app.Write(ProcessPath, Process(Task("Task_1", "Data")));

        var result = await Analyze();

        Assert.Contains("'Data' (Task_1)", Assert.Single(result.Warnings), StringComparison.Ordinal);
    }

    [Fact]
    public async Task NoTaskTypes_IsSilent()
    {
        _app.Write(ProcessPath, Process(StartEvent("Start"), Gateway("Gateway_1"), EndEvent("End")));

        var result = await Analyze();

        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task NoProcessFile_IsSilent()
    {
        var result = await Analyze();

        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task UnreadableProcess_IsATodo()
    {
        _app.Write(ProcessPath, "<bpmn:definitions");

        var result = await Analyze();

        var todo = Assert.Single(result.Todos);
        Assert.StartsWith($"Could not read {ProcessPath} (", todo, StringComparison.Ordinal);
        Assert.EndsWith(
            "skipped the check for custom task types. Fix the file and run the upgrade again.",
            todo,
            StringComparison.Ordinal
        );
        Assert.Empty(result.Warnings);
    }
}
