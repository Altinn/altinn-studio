using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type, and the one pipeline item this
/// engine step runs, named by its position in <see cref="ServiceTaskPipeline.Items"/>. That item is the whole
/// payload — a step says what it runs, never what runs after it, which every last step of a workflow derives
/// from the pipeline it resolves when it runs.
/// </summary>
/// <remarks>
/// <see cref="ItemIndex"/> is semantically required but nullable: deserialization runs outside any handler, so
/// a non-nullable <c>int</c> would either throw an old index-less payload out as an unhandled callback
/// exception or bind <c>0</c> and silently dispatch the pipeline's first item. Guarded in
/// <see cref="ExecuteServiceTask.Execute"/> so the refusal is a legible permanent failure.
/// </remarks>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, int? ItemIndex = null) : CommandRequestPayload;

internal sealed class ExecuteServiceTask(
    AppImplementationFactory appImplementationFactory,
    MailboxDeliveryEnvelope deliveryEnvelope,
    Telemetry? telemetry = null
) : WorkflowEngineCommandBase<ExecuteServiceTaskPayload>
{
    public static string Key => "ExecuteServiceTask";

    /// <summary>
    /// Service tasks routinely call slow external systems, so they get a far more generous default timeout
    /// than the engine's. Override per task via <see cref="IProcessStepConfigurable.StepOptions"/> or per
    /// stage on the builder.
    /// </summary>
    internal static readonly TimeSpan DefaultServiceTaskTimeout = TimeSpan.FromMinutes(10);

    /// <summary>
    /// Reason code for every failure a service task's own code reported, whichever part of the pipeline
    /// reported it. Operator-visible.
    /// </summary>
    internal const string FailedReasonCode = "ServiceTaskFailedException";

    private readonly PipelineItemRunner _runner = new(deliveryEnvelope);

    public override string GetKey() => Key;

    /// <summary>
    /// A service task runs after the commit, so what its steps start can start once their own work is saved.
    /// </summary>
    public override bool EnqueuesStartedSideEffects => true;

    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = DefaultServiceTaskTimeout };

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteServiceTaskPayload payload
    )
    {
        Instance instance = context.InstanceDataMutator.Instance;
        if (instance.Process is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "Executing a service task requires an active process state.",
                nameof(InvalidOperationException)
            );
        }
        string serviceTaskType = payload.ServiceTaskType;

        using Activity? activity = telemetry?.StartProcessExecuteServiceTaskActivity(instance, serviceTaskType);

        // Refused before task resolution: inside the try below, a resolution throw becomes a retryable
        // failure, and no retry fixes a payload.
        if (payload.ItemIndex is not { } itemIndex)
        {
            return MissingItemIndex(serviceTaskType);
        }

        try
        {
            IPipelineServiceTask serviceTask =
                appImplementationFactory.FindServiceTask(serviceTaskType)
                ?? throw new ProcessException($"No service task found for type {serviceTaskType}");

            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();
            var host = new PipelineHost.ServiceTask(serviceTaskType);

            PipelineValues values = PipelineValuesCarry.Restore(context.StateCarry, host.ValuesKey, itemIndex);
            ServiceTaskContext serviceTaskContext = PipelineItemRunner.CreateContext(context, values, input: null);

            ProcessEngineCommandResult result = await _runner.Run(
                context,
                host,
                pipeline,
                itemIndex,
                serviceTaskContext
            );

            if (
                StartedSideEffects(
                    result,
                    serviceTaskContext.SideEffects,
                    context,
                    host,
                    instance.Process.CurrentTask?.ElementId
                ) is
                { } refused
            )
            {
                return refused;
            }

            // A result that continues the process is the task's conclusion, whichever item answered it.
            return PipelineValuesCarry.Publish(
                result,
                values,
                context.StateCarry,
                host.ValuesKey,
                concludes: PipelineItemRunner.Concludes(pipeline.Items.ElementAtOrDefault(itemIndex), result),
                owner: host.Description
            );
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// Records what a step that succeeded started, to be enqueued once its work is saved, and refuses a step that
    /// started something and then deferred.
    /// </summary>
    private FailedProcessEngineCommandResult? StartedSideEffects(
        ProcessEngineCommandResult result,
        SideEffectStarter started,
        ProcessEngineCommandContext context,
        PipelineHost host,
        string? currentTask
    ) =>
        result switch
        {
            DeferredProcessEngineCommandResult when started.Started.Count > 0 => SideEffectStarts.StartedThenDeferred(
                host.Description
            ),
            SuccessfulProcessEngineCommandResult => SideEffectStarts.Record(
                started,
                appImplementationFactory,
                context.StateCarry,
                currentTask
            ),
            _ => null,
        };

    private static FailedProcessEngineCommandResult MissingItemIndex(string serviceTaskType) =>
        FailedProcessEngineCommandResult.Permanent(
            $"A step of service task '{serviceTaskType}' names no pipeline item. Every step of a pipeline — "
                + "its stages, its reply handlers and its conclusion alike — names the one item it runs by "
                + "that item's index, so this workflow was enqueued by a version of this app-lib that "
                + "identified steps differently. Resume it on the version that enqueued it, or abandon it "
                + "deliberately.",
            "InvalidPayloadException"
        );
}
