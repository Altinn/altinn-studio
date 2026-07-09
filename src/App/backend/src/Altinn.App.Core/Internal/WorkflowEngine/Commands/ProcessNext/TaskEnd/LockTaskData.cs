using System.Diagnostics;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

internal sealed class LockTaskData : WorkflowEngineCommandBase<TaskDataLockPayload>
{
    public static string Key => "LockTaskData";

    public override string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;

    public LockTaskData(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext parameters,
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
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (UnreachableException ex)
        {
            return FailedProcessEngineCommandResult.Permanent(ex.Message, ex.GetType().Name);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
