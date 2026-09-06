using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Legacy task-start step, kept for one release. A workflow enqueued before task commands existed carries this
/// step and nothing else for the entering task's own work, so it runs the task's declared start commands
/// inline, in order, with one commit at the end. New workflows never contain it: their task commands are steps
/// of their own (<see cref="ExecuteProcessTaskCommand"/>).
/// </summary>
internal sealed class StartTask : IWorkflowEngineCommand
{
    public static string Key => "StartTask";

    public string GetKey() => Key;

    private readonly ProcessTaskResolver _processTaskResolver;
    private readonly ProcessTaskCommandExecutor _executor;

    public StartTask(ProcessTaskResolver processTaskResolver, ProcessTaskCommandExecutor executor)
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
            commands = processTask.GetStartCommands(taskId);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }

        return await _executor.ExecuteAll(commands, parameters);
    }
}
