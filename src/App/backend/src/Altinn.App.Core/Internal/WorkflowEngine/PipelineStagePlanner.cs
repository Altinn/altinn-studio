using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>Shares per-stage option planning between lifecycle commands and service stages.</summary>
internal static class PipelineStagePlanner
{
    internal static StepRequest Plan(ProcessPipelineStage stage, StepRequest step) =>
        step with
        {
            StageOptions = stage.StepOptions,
            StageCommandKey = (stage as ProcessPipelineStage.Command)?.Reference.Key,
        };

    internal static IReadOnlyList<StepRequest> PlanLifecycle(ProcessPipeline pipeline) =>
        pipeline
            .Stages.Select(stage =>
                Plan(stage, WorkflowCommandSet.CreateSerializedCommand(stage.Reference.Key, stage.Reference.Payload))
            )
            .ToArray();
}
