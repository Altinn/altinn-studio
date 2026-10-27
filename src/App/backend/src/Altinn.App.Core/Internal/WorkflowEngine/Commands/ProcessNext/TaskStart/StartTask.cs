using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Runs one stage of the current task type's start pipeline (<see cref="IProcessTask.DefineStart"/>). Each stage
/// is a step of its own that carries the stage's index, so a retry starts at the stage that failed. The pipeline
/// is composed again when the step runs and the stage is picked by position, as for service task items. A step
/// enqueued before the task composed stages carries no index and runs every stage, as that version did.
/// </summary>
internal sealed class StartTask : WorkflowEngineCommandBase<ProcessTaskStagePayload>
{
    public static string Key => "StartTask";

    private readonly ProcessTaskResolver _processTaskResolver;

    public StartTask(ProcessTaskResolver processTaskResolver)
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
            Pipeline pipeline = processTask.DefineStart(new PipelineBuilder());
            return await StageExecution.Run(pipeline, payload, context, "start", altinnTaskType);
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
