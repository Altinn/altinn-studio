#pragma warning disable CS0618 // The default pipeline runs the deprecated Start, End and Abandon until they are removed.
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class StartTaskTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, int? stageIndex = 0)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = new CancellationToken(canceled: true),
            Payload = new AppCallbackPayload
            {
                CommandKey = StartTask.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                Payload = stageIndex is { } index
                    ? CommandPayloadSerializer.Serialize(new ProcessTaskStagePayload(index))
                    : null,
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1", string altinnTaskType = "data")
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = taskId, AltinnTaskType = altinnTaskType },
            },
        };
    }

    private static IWorkflowEngineCommand CreateCommand(IProcessTask processTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(processTask);
        var sp = services.BuildServiceProvider();
        var resolver = new ProcessTaskResolver(sp.GetRequiredService<AppImplementationFactory>());
        return new StartTask(resolver);
    }

    private sealed class RecordingTask(List<StageContext> seen) : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline
                .Stage(context =>
                {
                    seen.Add(context);
                    return Task.FromResult(StageResult.Completed());
                })
                .Build();
    }

    private sealed class ThrowingTask(Exception exception) : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline.Stage(_ => throw exception).Build();
    }

    [Fact]
    public async Task Execute_RunsTheTasksStageWithTheStepsContext_ReturnsSuccess()
    {
        var seen = new List<StageContext>();
        var command = CreateCommand(new RecordingTask(seen));
        var context = CreateContext(CreateInstance());

        var result = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        StageContext stage = Assert.Single(seen);
        Assert.Same(context.InstanceDataMutator, stage.InstanceDataMutator);
        Assert.Equal(context.CancellationToken, stage.CancellationToken);
    }

    [Fact]
    public async Task Execute_WhenTheStageThrows_ReturnsFailedResult()
    {
        var command = CreateCommand(new ThrowingTask(new InvalidOperationException("Start failed")));
        var context = CreateContext(CreateInstance());

        var result = await command.Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Start failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private sealed class StagedTask(List<string> ran, StageResult? firstStageResult = null) : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline
                .Stage(context =>
                {
                    ran.Add($"first:{context.StepId}");
                    return Task.FromResult(firstStageResult ?? StageResult.Completed());
                })
                .Stage(context =>
                {
                    ran.Add($"second:{context.StepId}");
                    return Task.FromResult(StageResult.Completed());
                })
                .Build();
    }

    [Fact]
    public async Task Execute_WithStageIndex_RunsOnlyThatStage()
    {
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));
        var context = CreateContext(CreateInstance(), stageIndex: 1);

        var result = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal([$"second:{context.Payload.StepId}"], ran);
    }

    [Fact]
    public async Task Execute_WithoutStageIndex_RunsEveryStageInThisStep()
    {
        // A version from before lifecycle stages planned one step with no payload and ran the whole lifecycle in
        // it. A workflow it enqueued may still be in flight after an upgrade; its step runs the way it was planned.
        // Each stage runs under an id of its own, the same on every attempt, so what the stages key on it stays apart.
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));
        var context = CreateContext(CreateInstance(), stageIndex: null);

        var result = await command.Execute(context);
        var secondAttempt = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.IsType<SuccessfulProcessEngineCommandResult>(secondAttempt);
        Guid stepId = context.Payload.StepId;
        Guid secondStageId = StageExecution.StepIdForStage(stepId, 1);
        Assert.NotEqual(stepId, secondStageId);
        Assert.Equal([$"first:{stepId}", $"second:{secondStageId}", $"first:{stepId}", $"second:{secondStageId}"], ran);
    }

    private sealed class RecordThenPollTask : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline
                .Stage(_ => Task.FromResult(StageResult.Completed()))
                .Stage(_ => Task.FromResult(StageResult.Defer(TimeSpan.FromMinutes(2))))
                .Build();
    }

    [Fact]
    public async Task Execute_WithoutStageIndex_ALaterStageThatDefersFailsPermanently()
    {
        // The step cannot save between its stages, and a deferral discards what was staged before it. Run as a step
        // of its own, the same stage defers freely (Execute_StageDefers_DefersTheStep).
        var command = CreateCommand(new RecordThenPollTask());

        var result = await command.Execute(CreateContext(CreateInstance(), stageIndex: null));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(StageExecution.DeferredAfterOtherStagesReasonCode, failed.ExceptionType);
        Assert.Contains("start stage 1 deferred", failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_WithoutStageIndex_StopsAtTheFirstStageThatDoesNotComplete()
    {
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran, firstStageResult: StageResult.Defer(TimeSpan.FromMinutes(2))));

        var result = await command.Execute(CreateContext(CreateInstance(), stageIndex: null));

        Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Single(ran);
    }

    [Fact]
    public async Task Execute_WithStageIndexPastTheDefinition_FailsPermanently()
    {
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));

        var result = await command.Execute(CreateContext(CreateInstance(), stageIndex: 2));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ProcessTaskStageNotFound", failed.ExceptionType);
        Assert.Empty(ran);
    }

    private sealed class DeferringTask : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline.Stage(_ => Task.FromResult(StageResult.Defer(TimeSpan.FromMinutes(1), "not yet"))).Build();
    }

    [Fact]
    public async Task Execute_StageDefers_DefersTheStep()
    {
        var command = CreateCommand(new DeferringTask());

        var result = await command.Execute(CreateContext(CreateInstance()));

        var deferred = Assert.IsType<DeferredProcessEngineCommandResult>(result);
        Assert.Equal(TimeSpan.FromMinutes(1), deferred.Delay);
        Assert.Equal("not yet", deferred.Reason);
    }

    private sealed class FailingTask(StageResult result) : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
            pipeline.Stage(_ => Task.FromResult(result)).Build();
    }

    // A record's protected copy constructor lets an app derive its own result, which no mapper can act on.
    private sealed record HomemadeResult : StageResult
    {
        public HomemadeResult()
            : base(Completed()) { }
    }

    [Fact]
    public async Task Execute_StageReturnsAResultOfItsOwn_FailsPermanentlyNamingTheType()
    {
        var command = CreateCommand(new FailingTask(new HomemadeResult()));

        var result = await command.Execute(CreateContext(CreateInstance()));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(StageExecution.UnknownResultReasonCode, failed.ExceptionType);
        Assert.Contains(nameof(HomemadeResult), failed.ErrorMessage);
    }

    [Fact]
    public async Task Execute_StageReturnsNull_FailsPermanentlyWithoutThrowing()
    {
        var command = CreateCommand(new FailingTask(null!));

        var result = await command.Execute(CreateContext(CreateInstance()));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(StageExecution.UnknownResultReasonCode, failed.ExceptionType);
        Assert.Contains("returned null", failed.ErrorMessage);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Execute_StageFails_FailsTheStepAsTheStageSaid(bool permanent)
    {
        var command = CreateCommand(
            new FailingTask(
                permanent ? StageResult.FailedPermanent("no signee provider") : StageResult.FailedRetryable("busy")
            )
        );

        var result = await command.Execute(CreateContext(CreateInstance()));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal(permanent, failed.NonRetryable);
        Assert.Equal(StageExecution.FailedReasonCode, failed.ExceptionType);
        Assert.Contains(permanent ? "no signee provider" : "busy", failed.ErrorMessage);
        Assert.Contains("start stage 0", failed.ErrorMessage);
    }
}
