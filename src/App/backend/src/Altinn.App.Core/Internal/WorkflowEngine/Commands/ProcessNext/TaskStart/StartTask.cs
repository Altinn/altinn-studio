using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

internal sealed class StartTask : IWorkflowEngineCommand
{
    public static string Key => "StartTask";

    public string GetKey() => Key;

    private readonly ProcessTaskResolver _processTaskResolver;
    private readonly AppImplementationFactory _appImplementationFactory;

    public StartTask(ProcessTaskResolver processTaskResolver, AppImplementationFactory appImplementationFactory)
    {
        _processTaskResolver = processTaskResolver;
        _appImplementationFactory = appImplementationFactory;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string? altinnTaskType = dataMutator.Instance.Process.CurrentTask.AltinnTaskType;

        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            var taskContext = new ProcessTaskContext
            {
                InstanceDataMutator = dataMutator,
                CancellationToken = parameters.CancellationToken,
            };
            await processTask.Start(taskContext);

            // What the task started waits for the transition to be saved, which this command runs before.
            return (ProcessEngineCommandResult?)
                    EnqueuedSideEffects.Record(
                        taskContext.SideEffects,
                        _appImplementationFactory,
                        parameters.StateCarry,
                        dataMutator.Instance.Process?.CurrentTask?.ElementId
                    )
                ?? new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
