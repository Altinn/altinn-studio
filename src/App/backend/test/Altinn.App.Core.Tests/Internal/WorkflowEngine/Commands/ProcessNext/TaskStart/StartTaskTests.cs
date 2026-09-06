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

/// <summary>
/// The legacy task-start step: for a workflow enqueued before task commands existed, it runs the task's declared
/// start commands inline, in order, in the one callback.
/// </summary>
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
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = StartTask.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
                State = "{}",
                WorkflowId = Guid.Empty,
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

    private static StartTask CreateCommand(IProcessTask processTask, params IProcessTaskCommand[] commands)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(processTask);
        foreach (IProcessTaskCommand command in commands)
        {
            services.AddSingleton(command);
        }

        ServiceProvider sp = services.BuildServiceProvider();
        AppImplementationFactory factory = sp.GetRequiredService<AppImplementationFactory>();
        return new StartTask(new ProcessTaskResolver(factory), new ProcessTaskCommandExecutor(factory));
    }

    [Fact]
    public async Task Execute_RunsDeclaredStartCommandsInOrder_ReturnsSuccess()
    {
        var log = new List<string>();
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask
            .Setup(x => x.GetStartCommands("Task_1"))
            .Returns([new ProcessTaskCommandRef("First"), new ProcessTaskCommandRef("Second")]);
        StartTask command = CreateCommand(
            processTask.Object,
            new RecordingCommand("First", log),
            new RecordingCommand("Second", log)
        );

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(["First", "Second"], log);
    }

    [Fact]
    public async Task Execute_TaskDeclaresNothing_ReturnsSuccess()
    {
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask.Setup(x => x.GetStartCommands("Task_1")).Returns([]);
        StartTask command = CreateCommand(processTask.Object);

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
    }

    [Fact]
    public async Task Execute_CommandFails_StopsAndReturnsThatFailure()
    {
        var log = new List<string>();
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask
            .Setup(x => x.GetStartCommands("Task_1"))
            .Returns([new ProcessTaskCommandRef("First"), new ProcessTaskCommandRef("Second")]);
        StartTask command = CreateCommand(
            processTask.Object,
            new RecordingCommand("First", log, ProcessTaskCommandResult.FailedRetryable("dependency down")),
            new RecordingCommand("Second", log)
        );

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.False(failed.NonRetryable);
        Assert.Contains("dependency down", failed.ErrorMessage);
        Assert.Equal(["First"], log);
    }

    [Fact]
    public async Task Execute_WhenDeclaringThrows_ReturnsRetryableFailure()
    {
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask
            .Setup(x => x.GetStartCommands("Task_1"))
            .Throws(new InvalidOperationException("Declaration failed"));
        StartTask command = CreateCommand(processTask.Object);

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Declaration failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private sealed class RecordingCommand(string key, List<string> log, ProcessTaskCommandResult? result = null)
        : IProcessTaskCommand
    {
        public string Key => key;

        public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
        {
            log.Add(key);
            return Task.FromResult(result ?? ProcessTaskCommandResult.Completed());
        }
    }
}
