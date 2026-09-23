using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

internal sealed record ExecuteProcessStagePayload(string TaskType, string TaskId, string Phase, string StageName)
    : CommandRequestPayload
{
    internal override string? Validate() =>
        string.IsNullOrWhiteSpace(TaskType)
        || string.IsNullOrWhiteSpace(TaskId)
        || string.IsNullOrWhiteSpace(StageName)
        || Phase is not ("start" or "end" or "abandon")
            ? "A lifecycle stage requires a task type, task ID, valid phase and handler name."
            : null;
}

/// <summary>Resolves one lifecycle handler in this callback's scope; never concludes a task.</summary>
internal sealed class ExecuteProcessStage(ProcessTaskResolver resolver, AppImplementationFactory factory)
    : WorkflowEngineCommandBase<ExecuteProcessStagePayload>
{
    internal static string Key => "ExecuteProcessStage";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteProcessStagePayload payload
    )
    {
        ProcessPipeline pipeline = resolver
            .GetProcessTaskInstance(payload.TaskType)
            .ResolveLifecyclePipeline(payload.TaskId, payload.Phase);
        ProcessPipelineStage.Handler? stage = pipeline
            .Stages.OfType<ProcessPipelineStage.Handler>()
            .SingleOrDefault(candidate => candidate.Name == payload.StageName);
        if (stage is null)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Lifecycle handler '{payload.StageName}' for task '{payload.TaskId}' ({payload.Phase}) no longer exists.",
                "PipelineStageNotFound"
            );
        }
        return await PipelineStageExecutor.Execute(stage, factory, context with { TaskId = payload.TaskId });
    }
}
