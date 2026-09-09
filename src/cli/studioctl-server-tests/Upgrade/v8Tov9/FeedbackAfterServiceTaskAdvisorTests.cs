using Altinn.Studio.Cli.Upgrade.v8Tov9.ProcessAdvisories;
using static Studioctl.Tests.Upgrade.v8Tov9.BpmnBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class FeedbackAfterServiceTaskAdvisorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Altinn.Studio.Cli.Upgrade.v8Tov9.MigrationResult Analyze(string? bpmn)
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
    public void FeedbackBehindDataTask_DoesNotWarn()
    {
        // data -> feedback is the ordinary pattern (waiting for an org-driven decision) and stays
        // valid in v9; only a service-task predecessor makes the wait likely redundant.
        var result = Analyze(
            Process(Task("Task_1", "data"), Task("Task_Wait", "feedback"), Flow("f1", "Task_1", "Task_Wait"))
        );

        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
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

        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
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

        var todo = Assert.Single(eFormidling.Todos);
        Assert.Contains("must be removed", todo, StringComparison.Ordinal);
        Assert.Contains("indefinitely", todo, StringComparison.Ordinal);
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

        var todo = Assert.Single(result.Todos);
        Assert.Contains("may be a redundant", todo, StringComparison.Ordinal);
        Assert.DoesNotContain("must be removed", todo, StringComparison.Ordinal);
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
