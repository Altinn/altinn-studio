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

/// <summary>
/// The legacy task-abandon step: for a workflow enqueued before task commands existed, it runs the task's
/// declared abandon commands inline, in order, in the one callback.
/// </summary>
public class AbandonTaskTests
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
                CommandKey = AbandonTask.Key,
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

    private static AbandonTask CreateCommand(IProcessTask processTask, params IProcessTaskCommand[] commands)
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
        return new AbandonTask(new ProcessTaskResolver(factory), new ProcessTaskCommandExecutor(factory));
    }

    [Fact]
    public async Task Execute_RunsDeclaredAbandonCommands_ReturnsSuccess()
    {
        var log = new List<string>();
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask.Setup(x => x.GetAbandonCommands("Task_1")).Returns([new ProcessTaskCommandRef("Abort")]);
        AbandonTask command = CreateCommand(processTask.Object, new RecordingCommand("Abort", log));

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(["Abort"], log);
    }

    [Fact]
    public async Task Execute_WhenDeclaringThrows_ReturnsRetryableFailure()
    {
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask.Setup(x => x.GetAbandonCommands("Task_1")).Throws(new InvalidOperationException("Abandon failed"));
        AbandonTask command = CreateCommand(processTask.Object);

        ProcessEngineCommandResult result = await command.Execute(CreateContext(CreateInstance()));

        FailedProcessEngineCommandResult failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Abandon failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private sealed class RecordingCommand(string key, List<string> log) : IProcessTaskCommand
    {
        public string Key => key;

        public Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
        {
            log.Add(key);
            return Task.FromResult(ProcessTaskCommandResult.Completed());
        }
    }
}
