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
    private static ProcessEngineCommandContext CreateContext(Instance instance)
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

    private static StartTask CreateCommand(IProcessTask processTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(processTask);
        var sp = services.BuildServiceProvider();
        var resolver = new ProcessTaskResolver(sp.GetRequiredService<AppImplementationFactory>());
        return new StartTask(resolver);
    }

    [Fact]
    public async Task Execute_ResolvesProcessTaskAndCallsStart_ReturnsSuccess()
    {
        // Arrange
        var processTask = new Mock<IProcessTask> { CallBase = true };
        processTask.Setup(x => x.Type).Returns("data");
        processTask.Setup(x => x.Start(It.IsAny<ProcessTaskContext>())).Returns(Task.CompletedTask);
        var command = CreateCommand(processTask.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        processTask.Verify(
            x =>
                x.Start(
                    It.Is<ProcessTaskContext>(c =>
                        c.InstanceDataMutator == context.InstanceDataMutator
                        && c.CancellationToken.Equals(context.CancellationToken)
                    )
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenStartThrows_ReturnsFailedResult()
    {
        // Arrange
        var processTask = new Mock<IProcessTask> { CallBase = true };
        processTask.Setup(x => x.Type).Returns("data");
        processTask
            .Setup(x => x.Start(It.IsAny<ProcessTaskContext>()))
            .ThrowsAsync(new InvalidOperationException("Start failed"));
        var command = CreateCommand(processTask.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Start failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private static ProcessEngineCommandContext WithStage(ProcessEngineCommandContext context, int stageIndex) =>
        context with
        {
            Payload = context.Payload with
            {
                Payload = CommandPayloadSerializer.Serialize(new ProcessTaskStagePayload(stageIndex)),
            },
        };

    private sealed class StagedTask(List<string> ran) : IProcessTask
    {
        public string Type => "data";

        public Task Start(ProcessTaskContext context)
        {
            ran.Add($"unstaged:{context.StepId}");
            return Task.CompletedTask;
        }

        public ProcessTaskPipeline DefineStart(ProcessTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(context =>
                {
                    ran.Add($"first:{context.StepId}");
                    return Task.CompletedTask;
                })
                .Stage(context =>
                {
                    ran.Add($"second:{context.StepId}");
                    return Task.CompletedTask;
                })
                .Build();
    }

    [Fact]
    public async Task Execute_WithStageIndex_RunsOnlyThatStage()
    {
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));
        var context = WithStage(CreateContext(CreateInstance()), stageIndex: 1);

        var result = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal([$"second:{context.Payload.StepId}"], ran);
    }

    [Fact]
    public async Task Execute_WithoutStageIndexOnAStagedPipeline_RunsStartAsTheVersionThatEnqueuedItDid()
    {
        // Only a version from before the task composed stages plans a step without a stage index for this
        // pipeline. Its stages cannot run in one step, since none of them could see what the one before staged.
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));
        var context = CreateContext(CreateInstance());

        var result = await command.Execute(context);

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal([$"unstaged:{context.Payload.StepId}"], ran);
    }

    [Fact]
    public async Task Execute_WithStageIndexPastTheDefinition_FailsPermanently()
    {
        var ran = new List<string>();
        var command = CreateCommand(new StagedTask(ran));

        var result = await command.Execute(WithStage(CreateContext(CreateInstance()), stageIndex: 2));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("ProcessTaskStageNotFound", failed.ExceptionType);
        Assert.Empty(ran);
    }
}
