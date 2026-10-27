using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Runs one stage of the current task type's start pipeline (<see cref="IProcessTask.DefineStart"/>). Each stage
/// is a step of its own that carries the stage's index, so a retry starts at the stage that failed. The pipeline
/// is composed again when the step runs and the stage is picked by position, as for service task items.
/// </summary>
internal sealed class StartTask : WorkflowEngineCommandBase<ProcessTaskStagePayload>
{
    public static string Key => "StartTask";

    internal const string FailedReasonCode = "ProcessTaskStageFailedException";

    private readonly ProcessTaskResolver _processTaskResolver;

    public StartTask(ProcessTaskResolver processTaskResolver)
    {
        _processTaskResolver = processTaskResolver;
    }

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskStagePayload payload
    )
    {
        string? altinnTaskType = context.InstanceDataMutator.Instance.Process.CurrentTask.AltinnTaskType;

        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            IReadOnlyList<PipelineStage.Plain> stages = processTask.DefineStart(new PipelineBuilder()).Stages;
            if (stages.ElementAtOrDefault(payload.StageIndex) is not { } stage)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"Task type '{altinnTaskType}' composes no start stage at index {payload.StageIndex}. A "
                        + "pipeline's indexes are positions in its composition: if stages were inserted, reordered "
                        + "or removed since this workflow was enqueued, every index behind the change has moved. "
                        + "Resume the workflow on the code that enqueued it, or abandon it deliberately.",
                    "ProcessTaskStageNotFound"
                );
            }

            StageResult result = await stage.Work(StageExecution.CreateContext(context));
            return StageExecution.MapResult(
                result,
                message => $"Task type '{altinnTaskType}' start stage {payload.StageIndex} failed: {message}",
                FailedReasonCode
            );
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
