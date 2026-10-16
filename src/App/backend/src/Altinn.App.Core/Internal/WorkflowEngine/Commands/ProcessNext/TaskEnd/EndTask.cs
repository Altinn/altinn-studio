using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

internal sealed class EndTask : IWorkflowEngineCommand
{
    public static string Key => "EndTask";

    public string GetKey() => Key;

    private readonly ProcessTaskResolver _processTaskResolver;
    private readonly AppImplementationFactory _appImplementationFactory;

    public EndTask(ProcessTaskResolver processTaskResolver, AppImplementationFactory appImplementationFactory)
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
            await processTask.End(taskContext);

            // What the task started waits for the transition to be saved, which this command runs before.
            return (ProcessEngineCommandResult?)
                    SideEffectStarts.Record(
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
