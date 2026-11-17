using System.Diagnostics;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

internal sealed class LockTaskData : WorkflowEngineCommandBase<TaskDataLockPayload>
{
    public static string Key => "LockTaskData";

    public override string GetKey() => Key;

    protected override TaskDataLockPayload? ResolvePayload(WorkflowEngineCommandContext context)
    {
        TaskDataLockPayload? payload = base.ResolvePayload(context);
        return payload is not null && !string.IsNullOrWhiteSpace(payload.TaskId) ? payload : null;
    }

    private readonly IAppMetadata _appMetadata;

    public LockTaskData(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    public override async Task<WorkflowEngineCommandResult> Execute(
        WorkflowEngineCommandContext parameters,
        TaskDataLockPayload payload
    )
    {
        try
        {
            await TaskDataLockStatusHelper.SetLockStatus(
                _appMetadata,
                parameters.InstanceDataMutator,
                payload.TaskId,
                true
            );
            return new SuccessfulWorkflowEngineCommandResult();
        }
        catch (UnreachableException ex)
        {
            return FailedWorkflowEngineCommandResult.Permanent(ex.Message, ex.GetType().Name);
        }
        catch (Exception ex)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }
}
