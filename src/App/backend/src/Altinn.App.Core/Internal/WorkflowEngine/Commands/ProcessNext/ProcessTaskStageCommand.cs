using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext;

/// <summary>
/// The lifecycle phases a process task composes a <see cref="ProcessTaskPipeline"/> for.
/// </summary>
internal enum ProcessTaskPhase
{
    Start,
    End,
    Abandon,
}

internal static class ProcessTaskPipelineExtensions
{
    /// <summary>
    /// The task's composed pipeline for <paramref name="phase"/>.
    /// </summary>
    public static ProcessTaskPipeline ResolvePipeline(this IProcessTask processTask, ProcessTaskPhase phase) =>
        phase switch
        {
            ProcessTaskPhase.Start => processTask.DefineStart(new ProcessTaskPipelineBuilder()),
            ProcessTaskPhase.End => processTask.DefineEnd(new ProcessTaskPipelineBuilder()),
            ProcessTaskPhase.Abandon => processTask.DefineAbandon(new ProcessTaskPipelineBuilder()),
            _ => throw new ArgumentOutOfRangeException(nameof(phase), phase, null),
        };
}

/// <summary>
/// Runs a process task's lifecycle pipeline for one phase against the instance's current task. A step with a
/// <see cref="ProcessTaskStagePayload"/> runs the one stage it names. A step without one runs the pipeline's only
/// stage, or, for a pipeline with several, the task's <c>Start</c>, <c>End</c> or <c>Abandon</c>: such a step was
/// enqueued by a version that called those directly, and its stages could not see each other's unsaved data if
/// they ran in one step.
/// </summary>
internal abstract class ProcessTaskStageCommand : IWorkflowEngineCommand
{
    private readonly ProcessTaskResolver _processTaskResolver;

    protected ProcessTaskStageCommand(ProcessTaskResolver processTaskResolver)
    {
        _processTaskResolver = processTaskResolver;
    }

    public abstract string GetKey();

    protected abstract ProcessTaskPhase Phase { get; }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string? altinnTaskType = dataMutator.Instance.Process.CurrentTask.AltinnTaskType;

        ProcessTaskStagePayload? payload;
        try
        {
            payload = ReadPayload(context.Payload.Payload);
        }
        catch (Exception ex) when (ex is JsonException or NotSupportedException or InvalidCastException)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{GetKey()} payload is missing or invalid",
                "InvalidPayloadException"
            );
        }

        try
        {
            IProcessTask processTask = _processTaskResolver.GetProcessTaskInstance(altinnTaskType);
            IReadOnlyList<ProcessTaskStage> stages = processTask.ResolvePipeline(Phase).Stages;
            var taskContext = new ProcessTaskContext
            {
                InstanceDataMutator = dataMutator,
                CancellationToken = context.CancellationToken,
                WorkflowId = context.Payload.WorkflowId,
                StepId = context.Payload.StepId,
            };

            if (payload is null)
            {
                // The factory plans a payload-less step only for a single-stage pipeline. One for a pipeline with
                // several stages was planned before the task composed stages, so it runs what that version ran.
                await (stages.Count == 1 ? stages[0].Work(taskContext) : RunUnstaged(processTask, taskContext));
                return new SuccessfulProcessEngineCommandResult();
            }

            if (payload.StageIndex < 0 || payload.StageIndex >= stages.Count)
            {
                // The definition changed while this workflow was in flight. Running whatever stage now sits at
                // this position could do the wrong work, so stop and leave the workflow to be resumed or written
                // off once the definition is restored.
                return FailedProcessEngineCommandResult.Permanent(
                    $"Task type '{altinnTaskType}' defines {stages.Count.ToString(CultureInfo.InvariantCulture)} "
                        + $"{Phase} stages, but this step runs stage {payload.StageIndex.ToString(CultureInfo.InvariantCulture)}. "
                        + "The definition changed after the workflow was enqueued.",
                    "ProcessTaskStageNotFound"
                );
            }

            await stages[payload.StageIndex].Work(taskContext);
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private Task RunUnstaged(IProcessTask processTask, ProcessTaskContext context) =>
        Phase switch
        {
            ProcessTaskPhase.Start => processTask.Start(context),
            ProcessTaskPhase.End => processTask.End(context),
            ProcessTaskPhase.Abandon => processTask.Abandon(context),
            _ => throw new UnreachableException($"Unknown process task phase {Phase}"),
        };

    private static ProcessTaskStagePayload? ReadPayload(string? json) =>
        CommandPayloadSerializer.Deserialize<CommandRequestPayload>(json) switch
        {
            null => null,
            ProcessTaskStagePayload stagePayload => stagePayload,
            CommandRequestPayload other => throw new InvalidCastException(
                $"Unexpected payload type {other.GetType().Name}"
            ),
        };
}
