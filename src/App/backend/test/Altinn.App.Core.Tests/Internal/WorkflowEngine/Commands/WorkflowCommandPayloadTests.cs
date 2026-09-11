using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class WorkflowCommandPayloadTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not-json")]
    [InlineData("{}")]
    [InlineData("{\"taskId\":null}")]
    [InlineData("{\"taskId\":\" \"}")]
    [InlineData("{\"taskId\":42}")]
    public async Task InvalidTaskInput_FailsPermanentlyBeforeBusinessWork(string? payload)
    {
        var command = new RecordingCommand();
        IWorkflowEngineCommand entryPoint = command;

        var result = await entryPoint.Execute(
            new ProcessEngineCommandContext
            {
                InstanceDataMutator = Mock.Of<IInstanceDataMutator>(),
                CommandPayload = payload,
            }
        );

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failure.NonRetryable);
        Assert.Equal("InvalidPayloadException", failure.ExceptionType);
        Assert.Equal(0, command.ExecutionCount);
    }

    [Fact]
    public async Task TaskInput_UsesDeclaredTaskEvenWhenCurrentTaskIsDifferent()
    {
        var instance = new Instance
        {
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_Next" } },
        };
        var command = new RecordingCommand();
        var workflowId = Guid.NewGuid();
        var stepId = Guid.NewGuid();
        IWorkflowEngineCommand entryPoint = command;

        var result = await entryPoint.Execute(
            new ProcessEngineCommandContext
            {
                InstanceDataMutator = Mock.Of<IInstanceDataMutator>(data => data.Instance == instance),
                WorkflowId = workflowId,
                StepId = stepId,
                CommandPayload = CommandPayloadSerializer.Serialize(new ProcessTaskPayload("Task_Previous")),
            }
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal("Task_Previous", command.TaskId);
        Assert.Equal(workflowId, command.WorkflowId);
        Assert.Equal(stepId, command.StepId);
        Assert.Equal(1, command.ExecutionCount);
    }

    private sealed class RecordingCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
    {
        public int ExecutionCount { get; private set; }
        public string? TaskId { get; private set; }
        public Guid WorkflowId { get; private set; }
        public Guid StepId { get; private set; }

        public override string GetKey() => "RecordTask";

        public override Task<ProcessEngineCommandResult> Execute(
            ProcessEngineCommandContext context,
            ProcessTaskPayload payload
        )
        {
            ExecutionCount++;
            TaskId = payload.TaskId;
            WorkflowId = context.WorkflowId;
            StepId = context.StepId;
            return Task.FromResult(ProcessEngineCommandResult.Completed());
        }
    }
}
