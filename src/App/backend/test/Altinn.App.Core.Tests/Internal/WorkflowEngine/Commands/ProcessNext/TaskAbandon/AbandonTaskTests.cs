using Altinn.App.Core.Features;
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
    private static ProcessEngineCommandContext CreateContext(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = AbandonTask.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
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

    private static AbandonTask CreateCommand(IProcessTask processTask)
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton(processTask);
        var sp = services.BuildServiceProvider();
        var resolver = new ProcessTaskResolver(sp.GetRequiredService<AppImplementationFactory>());
        return new AbandonTask(resolver);
    }

    [Fact]
    public async Task Execute_ResolvesProcessTaskAndCallsAbandon_ReturnsSuccess()
    {
        // Arrange
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask.Setup(x => x.Abandon(It.IsAny<IInstanceDataMutator>())).Returns(Task.CompletedTask);
        var command = CreateCommand(processTask.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        processTask.Verify(x => x.Abandon(It.IsAny<IInstanceDataMutator>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenAbandonThrows_ReturnsFailedResult()
    {
        // Arrange
        var processTask = new Mock<IProcessTask>();
        processTask.Setup(x => x.Type).Returns("data");
        processTask
            .Setup(x => x.Abandon(It.IsAny<IInstanceDataMutator>()))
            .ThrowsAsync(new InvalidOperationException("Abandon failed"));
        var command = CreateCommand(processTask.Object);
        var context = CreateContext(CreateInstance());

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Abandon failed", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }
}
