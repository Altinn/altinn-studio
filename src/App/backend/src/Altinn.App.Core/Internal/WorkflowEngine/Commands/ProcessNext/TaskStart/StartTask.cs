using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

internal sealed class StartTask : IWorkflowEngineCommand
{
    public static string Key => "StartTask";

    public string GetKey() => Key;

    private readonly ProcessTaskResolver _processTaskResolver;

    public StartTask(ProcessTaskResolver processTaskResolver)
    {
        _processTaskResolver = processTaskResolver;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string? altinnTaskType = dataMutator.Instance.Process.CurrentTask.AltinnTaskType;

        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            await processTask.Start(dataMutator);
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
