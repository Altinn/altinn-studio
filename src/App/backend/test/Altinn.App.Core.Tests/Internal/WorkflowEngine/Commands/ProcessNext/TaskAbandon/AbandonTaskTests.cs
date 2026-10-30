#pragma warning disable CS0618 // The default pipeline runs the deprecated Start, End and Abandon until they are removed.
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;

public class AbandonTaskTests
{
    private static WorkflowEngineCommandContext CreateContext(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new WorkflowEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = new CancellationToken(canceled: true),
            Payload = new AppCallbackPayload
            {
                CommandKey = AbandonTask.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                Payload = CommandPayloadSerializer.Serialize(new ProcessTaskStagePayload(StageIndex: 0)),
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
        return new AbandonTask(resolver);
    }

    private sealed class RecordingTask(List<StageContext> seen) : IProcessTask
    {
        public string Type => "data";

        public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
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

        public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
            pipeline.Stage(_ => throw exception).Build();
    }

    [Fact]
    public async Task Execute_RunsTheTasksStageWithTheStepsContext_ReturnsSuccess()
    {
        var seen = new List<StageContext>();
        var command = CreateCommand(new RecordingTask(seen));
        var context = CreateContext(CreateInstance());

        var result = await command.Execute(context);

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        StageContext stage = Assert.Single(seen);
        Assert.Same(context.InstanceDataMutator, stage.InstanceDataMutator);
        Assert.Equal(context.CancellationToken, stage.CancellationToken);
    }

    [Fact]
    public async Task Execute_WhenTheStageThrows_ReturnsFailedResult()
    {
        var command = CreateCommand(new ThrowingTask(new InvalidOperationException("Abandon failed")));
        var context = CreateContext(CreateInstance());

        var result = await command.Execute(context);

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.Equal("Abandon failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
