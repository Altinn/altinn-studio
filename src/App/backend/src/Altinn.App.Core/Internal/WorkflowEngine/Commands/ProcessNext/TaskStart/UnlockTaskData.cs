using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

internal sealed class UnlockTaskData : IWorkflowEngineCommand
{
    public static string Key => "UnlockTaskData";

    public string GetKey() => Key;

    private readonly IProcessTaskDataLocker _processTaskDataLocker;

    public UnlockTaskData(IProcessTaskDataLocker processTaskDataLocker)
    {
        _processTaskDataLocker = processTaskDataLocker;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;

        try
        {
            await _processTaskDataLocker.Unlock(taskId, instance);
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
