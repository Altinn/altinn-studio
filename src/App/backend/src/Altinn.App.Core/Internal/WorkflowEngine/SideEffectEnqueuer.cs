using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Starts the side effects steps enqueued (<see cref="SideEffectQueue"/>), once the work that enqueued them is
/// saved: one side-effects workflow per side effect, carrying the first segment of its pipeline, exactly like the
/// side effects a transition schedules itself. Called by the callback controller after the save of a command that
/// <see cref="Commands.IWorkflowEngineCommand.EnqueuesPendingSideEffects"/>.
/// </summary>
internal sealed class SideEffectEnqueuer(
    AppImplementationFactory appImplementationFactory,
    IWorkflowEngineClient workflowEngineClient,
    IWorkflowCallbackTokenGenerator callbackTokenGenerator,
    ProcessStepOptionsResolver stepOptionsResolver
)
{
    /// <summary>
    /// Enqueues <paramref name="sideEffects"/> in one atomic batch, keyed on the callback's step so a retried step
    /// enqueues nothing twice. Each workflow starts from <paramref name="state"/>, the state the step published,
    /// and is an independent root linked to the workflow that started it: nothing in the process waits on it.
    /// </summary>
    public async Task Enqueue(
        IReadOnlyList<PendingSideEffect> sideEffects,
        AppIdentifier appId,
        InstanceIdentifier instanceId,
        AppCallbackPayload payload,
        Instance instance,
        string state,
        CancellationToken cancellationToken
    )
    {
        if (sideEffects.Count == 0)
        {
            return;
        }

        string? currentTask = instance.Process?.CurrentTask?.ElementId;
        string currentElement = currentTask ?? instance.Process?.EndEvent ?? "End event";

        var workflows = new List<WorkflowRequest>(sideEffects.Count);
        foreach (PendingSideEffect sideEffect in sideEffects)
        {
            ISideEffect registered =
                appImplementationFactory.FindSideEffect(sideEffect.Name)
                ?? throw new InvalidOperationException(
                    $"The side effect '{sideEffect.Name}' was enqueued, but none is registered with that name."
                );

            var host = new PipelineHost.SideEffect(sideEffect.Name, sideEffect.Input);
            ServiceTaskSegmentPlan plan = WorkflowCommandSet.PlanSegment(host, registered.ResolvePipeline());

            workflows.Add(
                new WorkflowRequest
                {
                    OperationId =
                        $"{ProcessNextRequestFactory.SideEffectsOperationIdPrefix} "
                        + $"{sideEffect.EnqueuedFrom ?? currentElement} -> {currentElement} · {sideEffect.Name}",
                    Steps = [.. plan.Steps.ApplyStepOptions(stepOptionsResolver, currentTask, serviceTaskType: null)],
                    State = state,
                    IsHead = false,
                    DependsOnHeads = false,
                    Links = [WorkflowRef.FromDatabaseId(payload.WorkflowId)],
                }
            );
        }

        var context = new AppWorkflowContext
        {
            Actor = payload.Actor,
            Org = appId.Org,
            App = appId.App,
            InstanceOwnerPartyId = instanceId.InstanceOwnerPartyId,
            InstanceGuid = instanceId.InstanceGuid,
            CallbackToken = callbackTokenGenerator.GenerateToken(instanceId.InstanceGuid, payload.Actor, workflows),
        };

        await workflowEngineClient.EnqueueWorkflows(
            ns: $"{appId.Org}/{appId.App}",
            idempotencyKey: CreateIdempotencyKey(payload.StepId),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(instanceId),
            request: new WorkflowEnqueueRequest
            {
                Labels = CreateLabels(instanceId, instance),
                Context = JsonSerializer.SerializeToElement(context),
                Workflows = workflows,
            },
            cancellationToken: cancellationToken
        );
    }

    /// <summary>Deterministic per step, and distinct from every other key the step's callback enqueues under.</summary>
    internal static string CreateIdempotencyKey(Guid stepId) => $"{stepId}:enqueued-side-effects";

    /// <summary>
    /// The labels every side-effects workflow carries: the instance, and the task the process is in, which status
    /// reads filter on. Side effects stay out of those reads by being no head, not by their labels.
    /// </summary>
    private static Dictionary<string, string> CreateLabels(InstanceIdentifier instanceId, Instance instance)
    {
        var labels = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [ProcessNextRequestFactory.ProcessNextInstanceGuidLabel] = instanceId.InstanceGuid.ToString(
                "N",
                CultureInfo.InvariantCulture
            ),
        };

        if (instance.Process?.CurrentTask is { ElementId.Length: > 0 } currentTask)
        {
            labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel] = ProcessNextRequestFactory.CreateProcessNextId(
                currentTask.ElementId,
                currentTask.Flow ?? 0
            );
            labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = currentTask.ElementId;
        }

        return labels;
    }
}
