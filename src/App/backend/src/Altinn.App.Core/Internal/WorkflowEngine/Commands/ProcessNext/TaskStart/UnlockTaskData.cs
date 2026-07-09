using System.Diagnostics;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

internal sealed class UnlockTaskData : WorkflowEngineCommandBase<TaskDataLockPayload>
{
    public static string Key => "UnlockTaskData";

    public override string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;

    public UnlockTaskData(IAppMetadata appMetadata)
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
                false
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
