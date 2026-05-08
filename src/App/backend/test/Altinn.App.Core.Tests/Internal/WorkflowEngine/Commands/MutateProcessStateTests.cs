using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class MutateProcessStateTests
{
    private static ProcessEngineCommandContext CreateContext(
        Instance instance,
        SaveProcessStateToStoragePayload? payload = null
    )
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        string? serializedPayload = payload is not null ? CommandPayloadSerializer.Serialize(payload) : null;

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = MutateProcessState.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                Payload = serializedPayload,
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
        };
    }

    [Fact]
    public async Task Execute_WithValidNewProcessState_SetsInstanceProcessAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance();
        var newProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } };
        var payload = new SaveProcessStateToStoragePayload(
            new ProcessStateChange { OldProcessState = instance.Process, NewProcessState = newProcessState }
        );
        var command = new MutateProcessState();
        var context = CreateContext(instance, payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("Task_2", instance.Process.CurrentTask.ElementId);
    }

    [Fact]
    public async Task Execute_WithNullNewProcessState_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance();
        var payload = new SaveProcessStateToStoragePayload(
            new ProcessStateChange { OldProcessState = instance.Process, NewProcessState = null }
        );
        var command = new MutateProcessState();
        var context = CreateContext(instance, payload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("ProcessStateChange.NewProcessState is null", failed.ErrorMessage);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    [Fact]
    public async Task Execute_WithNullPayload_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance();
        var command = new MutateProcessState();
        var context = CreateContext(instance, payload: null);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("MutateProcessState payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }
}
