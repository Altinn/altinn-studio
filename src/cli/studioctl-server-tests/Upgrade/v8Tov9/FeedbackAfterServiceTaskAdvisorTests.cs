using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.ProcessAdvisories;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class FeedbackAfterServiceTaskAdvisorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private const string DeployWindowAdvice =
        "when the first v9 version is deployed may not move on by themselves if they are waiting for a "
        + "receipt: deploy that version in a quiet period and check for instances left in the feedback task "
        + "afterwards.";

    private MigrationResult Analyze(string? bpmn)
    {
        if (bpmn is not null)
            _app.Write("config/process/process.bpmn", bpmn);

        return new FeedbackAfterServiceTaskAdvisor(_app.Root).Analyze();
    }

    [Fact]
    public void FeedbackDirectlyBehindServiceTask_Warns()
    {
        var result = Analyze(
            Process(
                Task("Task_1", "data"),
                ServiceTask("Task_Send", "eFormidling"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Task_1", "Task_Send"),
                Flow("f2", "Task_Send", "Task_Wait")
            )
        );

        var todo = Assert.Single(result.Todos);
        Assert.Contains("'Task_Wait'", todo, StringComparison.Ordinal);
        Assert.Contains("'Task_Send'", todo, StringComparison.Ordinal);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public void FeedbackBehindServiceTaskThroughGateway_Warns()
    {
        var result = Analyze(
            Process(
                ServiceTask("Task_Send", "eFormidling"),
                Gateway("Gateway_1"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Task_Send", "Gateway_1"),
                Flow("f2", "Gateway_1", "Task_Wait")
            )
        );

        Assert.Single(result.Todos);
    }

    [Fact]
    public void FeedbackBehindDataTask_GetsOnlyTheDeployWindowWarning()
    {
        // data -> feedback is the ordinary pattern (waiting for an org-driven decision) and stays
        // valid in v9, so there is nothing to change - but an instance waiting there for a receipt
        // at the first v9 deploy may not move on.
        var result = Analyze(
            Process(Task("Task_1", "data"), Task("Task_Wait", "feedback"), Flow("f1", "Task_1", "Task_Wait"))
        );

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Equal($"Instances already waiting in the feedback task 'Task_Wait' {DeployWindowAdvice}", warning);
    }

    [Fact]
    public void NoFeedbackTask_StaysSilent()
    {
        var result = Analyze(
            Process(Task("Task_1", "data"), ServiceTask("Task_Send", "eFormidling"), Flow("f1", "Task_1", "Task_Send"))
        );

        Assert.Empty(result.Messages);
    }

    [Theory]
    [InlineData("eFormidling", "must be removed")]
    [InlineData("fiksArkiv", "may be a redundant")]
    public void FeedbackBehindServiceTypeOnTaskElement_Warns(string taskType, string verdict)
    {
        // v8 processes may declare a built-in service task on a <bpmn:task>; the type decides.
        var result = Analyze(
            Process(Task("Task_Send", taskType), Task("Task_Wait", "feedback"), Flow("f1", "Task_Send", "Task_Wait"))
        );

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.StartsWith("The feedback task 'Task_Wait' follows the ", todo, StringComparison.Ordinal);
        Assert.Contains("service task 'Task_Send'", todo, StringComparison.Ordinal);
        Assert.Contains(verdict, todo, StringComparison.Ordinal);
        Assert.EndsWith(
            $" Instances already waiting in 'Task_Wait' {DeployWindowAdvice}",
            todo,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task Upgrade_KeepsTheTaskElementAndWarnsAboutTheFeedbackTaskBehindIt()
    {
        // The real upgrade order: the PDF and eFormidling migrations run first and must leave a
        // <bpmn:task> eFormidling step as it is, so the advisor sees the element v8 apps really have.
        _app.Write(
            "config/process/process.bpmn",
            Process(
                StartEvent("Start"),
                Task("Task_1", "data"),
                Task("Task_Send", "eFormidling"),
                Task("Task_Wait", "feedback"),
                EndEvent("End"),
                Flow("f0", "Start", "Task_1"),
                Flow("f1", "Task_1", "Task_Send"),
                Flow("f2", "Task_Send", "Task_Wait"),
                Flow("f3", "Task_Wait", "End")
            )
        );
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );

        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Contains(
            "<bpmn:task id=\"Task_Send\"",
            _app.Read("config/process/process.bpmn"),
            StringComparison.Ordinal
        );
        var step = Assert.Single(report.Steps, step => step.Name == "Feedback tasks behind service tasks");
        var message = Assert.Single(step.Messages);
        Assert.Equal(UpgradeMessageStatus.Todo, message.Status);
        Assert.StartsWith(
            "The feedback task 'Task_Wait' follows the eFormidling service task 'Task_Send' and must be removed.",
            message.Text,
            StringComparison.Ordinal
        );
        Assert.EndsWith(
            $" Instances already waiting in 'Task_Wait' {DeployWindowAdvice}",
            message.Text,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void GatewayStopsAtNonServiceOrigins()
    {
        // The gateway's other branch comes from a data task; only the service-task origin warns,
        // and it warns once.
        var result = Analyze(
            Process(
                Task("Task_1", "data"),
                ServiceTask("Task_Send", "eFormidling"),
                Gateway("Gateway_1"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Task_1", "Gateway_1"),
                Flow("f2", "Task_Send", "Gateway_1"),
                Flow("f3", "Gateway_1", "Task_Wait")
            )
        );

        Assert.Single(result.Todos);
    }

    [Fact]
    public void GatewayCycle_Terminates()
    {
        var result = Analyze(
            Process(
                Gateway("Gateway_1"),
                Gateway("Gateway_2"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Gateway_1", "Gateway_2"),
                Flow("f2", "Gateway_2", "Gateway_1"),
                Flow("f3", "Gateway_2", "Task_Wait")
            )
        );

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
    }

    [Fact]
    public void NoProcessBpmn_NoWarningsNoManualAction()
    {
        var result = Analyze(bpmn: null);

        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
    }

    [Fact]
    public void EFormidlingPredecessor_WarnsThatRemovalIsRequired()
    {
        // Not a "may be redundant" case: the v9 eFormidling service task waits for the delivery
        // confirmation itself, and the Altinn Events reminder that used to move the process past the
        // feedback task is gone - so a trailing feedback task strands the instance.
        var eFormidling = Analyze(
            Process(
                ServiceTask("Task_Send", "eFormidling"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Task_Send", "Task_Wait")
            )
        );

        Assert.Empty(eFormidling.Warnings);
        var todo = Assert.Single(eFormidling.Todos);
        Assert.Contains("must be removed", todo, StringComparison.Ordinal);
        Assert.Contains("indefinitely", todo, StringComparison.Ordinal);
        Assert.EndsWith(
            $" Instances already waiting in 'Task_Wait' {DeployWindowAdvice}",
            todo,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void OtherServiceTaskPredecessor_WarnsThatReviewIsNeeded()
    {
        using var app = new TempAppFolder();
        app.Write(
            "config/process/process.bpmn",
            Process(
                ServiceTask("Task_Archive", "fiksArkiv"),
                Task("Task_Wait", "feedback"),
                Flow("f1", "Task_Archive", "Task_Wait")
            )
        );

        var result = new FeedbackAfterServiceTaskAdvisor(app.Root).Analyze();

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("may be a redundant", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("must be removed", todo, StringComparison.Ordinal);
        Assert.EndsWith(
            $" Instances already waiting in 'Task_Wait' {DeployWindowAdvice}",
            todo,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void MultipleFeedbackTasks_WarnPerPair()
    {
        var result = Analyze(
            Process(
                ServiceTask("Task_Send", "eFormidling"),
                ServiceTask("Task_Archive", "fiksArkiv"),
                Task("Task_Wait1", "feedback"),
                Task("Task_Wait2", "feedback"),
                Flow("f1", "Task_Send", "Task_Wait1"),
                Flow("f2", "Task_Archive", "Task_Wait2")
            )
        );

        Assert.Equal(2, result.Todos.Count);
    }
}
