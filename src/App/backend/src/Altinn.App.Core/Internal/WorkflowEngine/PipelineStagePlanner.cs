using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>One ordinary stage becomes one engine step, regardless of the pipeline that contains it.</summary>
internal static class PipelineStagePlanner
{
    internal static StepRequest Plan(ProcessPipelineStage stage, StepRequest handlerStep, bool directCommand)
    {
        StepRequest step =
            directCommand && stage is ProcessPipelineStage.Command command
                ? WorkflowCommandSet.CreateSerializedCommand(command.Reference.Key, command.Reference.Payload)
                : handlerStep;
        return step with
        {
            OperationId = stage.Name ?? step.OperationId,
            StageOptions = stage.StepOptions,
            StageCommandKey = (stage as ProcessPipelineStage.Command)?.Reference.Key,
        };
    }

    internal static IReadOnlyList<StepRequest> PlanLifecycle(
        ProcessPipeline pipeline,
        string taskType,
        string taskId,
        string phase
    ) =>
        pipeline
            .Stages.Select(stage =>
                Plan(
                    stage,
                    WorkflowCommandSet.CreateSerializedCommand(
                        ExecuteProcessStage.Key,
                        CommandPayloadSerializer.Serialize(
                            new ExecuteProcessStagePayload(taskType, taskId, phase, stage.Name ?? string.Empty)
                        )
                    ),
                    directCommand: true
                )
            )
            .ToArray();
}
