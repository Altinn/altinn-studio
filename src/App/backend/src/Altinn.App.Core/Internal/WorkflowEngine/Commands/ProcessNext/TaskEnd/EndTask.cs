using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

/// <summary>
/// Legacy task-end step, kept for one release. A workflow enqueued before task commands existed carries this
/// step and nothing else for the leaving task's own work, so it runs the task's declared end commands inline,
/// in order, with one commit at the end. New workflows never contain it.
/// </summary>
internal sealed class EndTask : IWorkflowEngineCommand
{
    public static string Key => "EndTask";

    public string GetKey() => Key;

    private readonly ProcessTaskResolver _processTaskResolver;
    private readonly ProcessTaskCommandExecutor _executor;

    public EndTask(ProcessTaskResolver processTaskResolver, ProcessTaskCommandExecutor executor)
    {
        _processTaskResolver = processTaskResolver;
        _executor = executor;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        string? altinnTaskType = parameters.InstanceDataMutator.Instance.Process.CurrentTask.AltinnTaskType;
        string taskId = parameters.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;

        IReadOnlyList<ProcessTaskCommandRef> commands;
        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            commands = processTask.GetEndCommands(taskId);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }

        return await _executor.ExecuteAll(commands, parameters);
    }
}
