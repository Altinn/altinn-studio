using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class MutateProcessStateTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, string? serializedPayload)
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
                CommandKey = MutateProcessState.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        return new Instance
        {
            Org = "ttd",
            AppId = "ttd/test-app",
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = taskId },
            },
        };
    }

    [Fact]
    public async Task Execute_WithValidNewProcessState_SetsInstanceProcessAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance();
        var newProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_2" } };
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = instance.Process, NewProcessState = newProcessState }
        );
        var command = new MutateProcessState();
        var context = CreateContext(instance, CommandPayloadSerializer.Serialize(payload));

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("Task_2", instance.Process.CurrentTask.ElementId);
        Assert.Equal(ProcessStatus.Processing, instance.Process.Status);
    }

    [Fact]
    public async Task Execute_WithNullNewProcessState_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance();
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = instance.Process, NewProcessState = null }
        );
        var command = new MutateProcessState();
        var context = CreateContext(instance, CommandPayloadSerializer.Serialize(payload));

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
        var context = CreateContext(instance, serializedPayload: null);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("MutateProcessState payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
    }

    [Theory]
    [InlineData("{")]
    [InlineData("{\"serviceTaskType\":\"test\"}")]
    [InlineData("{\"processStateChange\":{},\"extra\":true}")]
    [InlineData("{\"$type\":\"processStateChange\"}")]
    [InlineData("{\"$type\":\"unknown\"}")]
    [InlineData("{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"test\"}")]
    public async Task Execute_WithUnsupportedPayloadShape_ReturnsPermanentInvalidPayload(string serializedPayload)
    {
        var instance = CreateInstance();
        ProcessState originalProcess = instance.Process;

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)new MutateProcessState()).Execute(
            CreateContext(instance, serializedPayload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("MutateProcessState payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        Assert.Same(originalProcess, instance.Process);
    }
}
