using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for CommitProcessState command.
/// Contains the complete process state change with old and new states, and whether the workflow runs
/// further steps after the commit, which then own the release of the instance. A process end always has them.
/// </summary>
internal sealed record ProcessStateChangePayload(ProcessStateChange ProcessStateChange, bool StepsFollowCommit = false)
    : CommandRequestPayload;

/// <summary>
/// Command that stages the process state transition for the callback controller's workflow-owned Storage save.
/// </summary>
internal sealed class CommitProcessState : WorkflowEngineCommandBase<ProcessStateChangePayload>
{
    public static string Key => "CommitProcessState";

    public override string GetKey() => Key;

    protected override ProcessStateChangePayload? ResolvePayload(ProcessEngineCommandContext context)
    {
        ProcessStateChangePayload? payload = base.ResolvePayload(context);
        return payload?.ProcessStateChange is null ? null : payload;
    }

    public override Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessStateChangePayload toStoragePayload
    )
    {
        try
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

            ProcessState newProcessState = processStateChange.NewProcessState;
            if (newProcessState.Ended is null && newProcessState.CurrentTask is null)
            {
                return Task.FromResult<ProcessEngineCommandResult>(
                    FailedProcessEngineCommandResult.Permanent(
                        "A non-ended process state requires a current task.",
                        nameof(InvalidOperationException)
                    )
                );
            }

            if (newProcessState.Ended is not null)
            {
                if (newProcessState.CurrentTask is not null || string.IsNullOrWhiteSpace(newProcessState.EndEvent))
                {
                    return Task.FromResult<ProcessEngineCommandResult>(
                        FailedProcessEngineCommandResult.Permanent(
                            "An ended process state requires no current task and a nonblank end event.",
                            nameof(InvalidOperationException)
                        )
                    );
                }

                if (!toStoragePayload.StepsFollowCommit)
                {
                    return Task.FromResult<ProcessEngineCommandResult>(
                        FailedProcessEngineCommandResult.Permanent(
                            $"An ended process state is released by {nameof(ReleaseEndedInstance)}, which must follow the commit.",
                            nameof(InvalidOperationException)
                        )
                    );
                }
            }

            if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
            {
                return Task.FromResult<ProcessEngineCommandResult>(
                    FailedProcessEngineCommandResult.Permanent(
                        "Workflow process state save requires callback state restored into an InstanceDataUnitOfWork.",
                        "InvalidOperationException"
                    )
                );
            }

            Instance instance = unitOfWork.Instance;
            newProcessState.Status = instance.Process?.Status;
            instance.Process = newProcessState;
            unitOfWork.UpdateProcessState(processStateChange);

            if (!toStoragePayload.StepsFollowCommit)
            {
                unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
                instance.Process.Status = ProcessStatus.Idle;
            }

            return Task.FromResult<ProcessEngineCommandResult>(new SuccessfulProcessEngineCommandResult());
        }
        catch (Exception ex)
        {
            return Task.FromResult<ProcessEngineCommandResult>(FailedProcessEngineCommandResult.Retryable(ex));
        }
    }
}
