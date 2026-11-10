using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests what the executor puts on spans: the attributes a command names for the domain object a step works on,
/// and how a failed execution is recorded.
/// </summary>
public sealed class WorkflowExecutorTelemetryTests
{
    [Fact]
    public async Task Execute_CommandDescribesTheStep_AttributesLandOnTheStepAndWorkflowSpans()
    {
        // Arrange
        var command = new DescribingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var (workflow, step) = DescribedWorkflow();
        using var workflowSpan = RecordedSpan("WorkflowHandler.Handle");
        using var stepSpan = RecordedSpan("WorkflowHandler.ProcessStep");
        workflow.EngineActivity = workflowSpan;
        step.EngineActivity = stepSpan;

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert — from the deserialized data and context, on both spans
        Assert.Equal(ExecutionStatus.Success, result.Status);
        foreach (var span in new[] { workflowSpan, stepSpan })
        {
            Assert.Equal("ttd", span.GetTagItem("test.owner"));
            Assert.Equal("key-1", span.GetTagItem("test.key"));
        }
    }

    [Fact]
    public async Task Execute_CommandFailsToDescribeTheStep_StepRunsAsIfItHadNotBeenAsked()
    {
        // Arrange
        var command = new DescribingCommand { ThrowWhenDescribing = true };
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var (workflow, step) = DescribedWorkflow();
        using var workflowSpan = RecordedSpan("WorkflowHandler.Handle");
        using var stepSpan = RecordedSpan("WorkflowHandler.ProcessStep");
        workflow.EngineActivity = workflowSpan;
        step.EngineActivity = stepSpan;

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(1, command.DescribeCalls);
        Assert.Equal(1, command.ExecuteCalls);
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Null(stepSpan.GetTagItem("test.owner"));
        Assert.Null(workflowSpan.GetTagItem("test.owner"));
        Assert.Equal(ActivityStatusCode.Unset, stepSpan.Status);
    }

    [Fact]
    public async Task Execute_NoRecordedSpans_CommandIsNotAskedToDescribeTheStep()
    {
        // Arrange
        var command = new DescribingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var (workflow, step) = DescribedWorkflow();
        using var unrecorded = new Activity("WorkflowHandler.ProcessStep") { IsAllDataRequested = false };
        step.EngineActivity = unrecorded;

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(ExecutionStatus.Success, result.Status);
        Assert.Equal(0, command.DescribeCalls);
        Assert.Equal(1, command.ExecuteCalls);
    }

    [Fact]
    public async Task Execute_CommandThrows_ExecuteSpanCarriesTheExceptionTypeAndNoExceptionEvent()
    {
        // Arrange
        var delegateHandler = new TestDelegateCommand();
        delegateHandler.SetAction((_, _, _) => throw new InvalidOperationException("Delegate failed"));
        using var fixture = WorkflowEngineTestFixture.Create(services =>
            services.AddSingleton<ICommand>(delegateHandler)
        );
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();
        var step = WorkflowEngineTestFixture.CreateStep(new CommandDefinition { Type = "test-delegate" });
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step);

        var executeSpans = new ConcurrentBag<Activity>();
        using var listener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == Metrics.ServiceName,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
            ActivityStopped = activity =>
            {
                if (activity.OperationName == "WorkflowExecutor.Execute")
                    executeSpans.Add(activity);
            },
        };
        ActivitySource.AddActivityListener(listener);

        using var stepSpan = Metrics.Source.StartActivity("test.step");
        Assert.NotNull(stepSpan);
        step.EngineActivity = stepSpan;

        // Act
        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        // Assert — the exception reaches an ERROR log; the span keeps only its class
        Assert.Equal(ExecutionStatus.RetryableError, result.Status);
        var executeSpan = Assert.Single(executeSpans, s => s.ParentSpanId == stepSpan.SpanId);
        Assert.Equal(ActivityStatusCode.Error, executeSpan.Status);
        Assert.Equal("Delegate failed", executeSpan.StatusDescription);
        Assert.Equal("System.InvalidOperationException", executeSpan.GetTagItem("error.type"));
        Assert.Empty(executeSpan.Events);
    }

    private static (Workflow Workflow, Step Step) DescribedWorkflow()
    {
        var step = WorkflowEngineTestFixture.CreateStep(
            CommandDefinition.Create(DescribingCommand.TypeId, new DescribedData { Key = "key-1" })
        );
        var workflow = WorkflowEngineTestFixture.CreateWorkflow(step) with
        {
            Context = JsonSerializer.SerializeToElement(new DescribedContext { Owner = "ttd" }),
        };
        return (workflow, step);
    }

    private static Activity RecordedSpan(string name) => new(name) { IsAllDataRequested = true };
}

internal sealed record DescribedData
{
    public required string Key { get; init; }
}

internal sealed record DescribedContext
{
    public required string Owner { get; init; }
}

/// <summary>
/// A command that names what its step works on from its typed data and context, or throws while doing so.
/// </summary>
internal sealed class DescribingCommand : Command<DescribedData, DescribedContext>
{
    public const string TypeId = "test-describing";

    private int _describeCalls;
    private int _executeCalls;

    public override string CommandType => TypeId;

    public bool ThrowWhenDescribing { get; init; }

    public int DescribeCalls => _describeCalls;

    public int ExecuteCalls => _executeCalls;

    protected override CommandValidationResult Validate(
        DescribedData? commandData,
        DescribedContext? workflowContext
    ) => new CommandValidationResult.Valid();

    protected override Task<ExecutionResult> Execute(
        CommandExecutionContext context,
        CancellationToken cancellationToken
    )
    {
        Interlocked.Increment(ref _executeCalls);
        return Task.FromResult(ExecutionResult.Success());
    }

    protected override IReadOnlyList<KeyValuePair<string, object?>> GetTelemetryAttributes(
        DescribedData? commandData,
        DescribedContext? workflowContext
    )
    {
        Interlocked.Increment(ref _describeCalls);

        if (ThrowWhenDescribing)
            throw new InvalidOperationException("Cannot describe this step");

        return [new("test.owner", workflowContext?.Owner), new("test.key", commandData?.Key)];
    }
}
