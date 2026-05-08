using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Command that advances the in-memory process state without persisting to Storage.
/// Inserted between task-end and task-start command groups so that:
/// - Task-end commands see the OLD CurrentTask (the task being ended)
/// - Task-start commands see the NEW CurrentTask (the task being started)
/// The actual persistence happens later via <see cref="SaveProcessStateToStorage"/>.
///
/// Note: After this command runs, Storage still has the OLD process state until
/// <see cref="SaveProcessStateToStorage"/> persists it. Any data saves by subsequent
/// task-start commands are authorized by Storage against the OLD current task.
/// This works because callbacks use ServiceOwner authentication for data operations.
/// </summary>
internal sealed class MutateProcessState : WorkflowEngineCommandBase<SaveProcessStateToStoragePayload>
{
    public static string Key => "MutateProcessState";

    public override string GetKey() => Key;

    public override Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        SaveProcessStateToStoragePayload toStoragePayload
    )
    {
        ProcessStateChange processStateChange = toStoragePayload.ProcessStateChange;

        if (processStateChange.NewProcessState == null)
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "ProcessStateChange.NewProcessState is null",
                    "InvalidOperationException"
                )
            );
        }

        Instance instance = context.InstanceDataMutator.Instance;
        instance.Process = processStateChange.NewProcessState;

        return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
    }
}
