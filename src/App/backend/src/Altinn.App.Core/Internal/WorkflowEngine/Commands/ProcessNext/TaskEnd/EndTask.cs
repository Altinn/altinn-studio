using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

/// <summary>
/// Runs one stage of the current task type's end pipeline (<see cref="IProcessTask.DefineEnd"/>). Each stage
/// is a step of its own that carries the stage's index, so a retry starts at the stage that failed. The pipeline
/// is composed again when the step runs and the stage is picked by position, as for service task items. A step
/// enqueued before the task composed stages carries no index and runs every stage, as that version did.
/// </summary>
internal sealed class EndTask : WorkflowEngineCommandBase<ProcessTaskStagePayload>
{
    public static string Key => "EndTask";

    private readonly ProcessTaskResolver _processTaskResolver;

    public EndTask(ProcessTaskResolver processTaskResolver)
    {
        _processTaskResolver = processTaskResolver;
    }

    public override string GetKey() => Key;

    protected override ProcessTaskStagePayload? ResolvePayload(ProcessEngineCommandContext context) =>
        StageExecution.ResolvePayload(context);

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskStagePayload payload
    )
    {
        string? altinnTaskType = context.InstanceDataMutator.Instance.Process.CurrentTask.AltinnTaskType;

        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            Pipeline pipeline = processTask.ResolvePipeline(LifecyclePhase.End);
            return await StageExecution.Run(pipeline, payload, context, LifecyclePhase.End, altinnTaskType);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
