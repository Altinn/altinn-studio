using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Starts what follows each service task pipeline step. Correct under at-least-once retries by three invariants: a
/// mailbox closes before anything downstream starts; a service task keeps at most one mailbox open, and only the step
/// that is done with it closes it; and each step performs <strong>at most one</strong> idempotency-keyed enqueue —
/// which one is decided by the step's result, and results are deterministic per the handler contract — so the bare
/// <see cref="AppCallbackPayload.StepId"/> is the whole key. Every enqueue lands as a collection head from inside the
/// still-unsettled step that asked for it, keeping the frontier non-empty until the task ends.
/// </summary>
/// <remarks>
/// Nothing here resolves a service task or its pipeline. A hand-over carries the steps its result planned, whole;
/// a successor receiver rebuilds its one step from the stage index its result carried, which is data rather
/// than a plan. The options resolver does its own lookups from each step's identity.
/// </remarks>
internal sealed class ServiceTaskRelay
{
    private readonly IWorkflowEngineClient _workflowEngineClient;
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;
    private readonly ProcessStepOptionsResolver _stepOptionsResolver;
    private readonly IProcessEngine _processEngine;

    public ServiceTaskRelay(
        IWorkflowEngineClient workflowEngineClient,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        ProcessStepOptionsResolver stepOptionsResolver,
        IProcessEngine processEngine
    )
    {
        _workflowEngineClient = workflowEngineClient;
        _callbackTokenGenerator = callbackTokenGenerator;
        _stepOptionsResolver = stepOptionsResolver;
        _processEngine = processEngine;
    }

    /// <summary>
    /// Maps a stage's result. Completing the stage starts the next item's workflow, or, after the last item, ends
    /// the task with no action. Ending the task closes the open mailbox first, if one is.
    /// </summary>
    internal static WorkflowEngineCommandResult DecideStage(
        ServiceTaskResult result,
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry,
        int stageIndex,
        ServiceTaskPipeline pipeline
    ) =>
        result switch
        {
            CompletedServiceTaskResult => CarryOn(serviceTaskType, stepId, carry, stageIndex, pipeline, closing: null),
            EndedServiceTaskResult ended => EndTask(ended.Action, serviceTaskType, stepId, carry),
            _ => DeferOrFail(result, serviceTaskType),
        };

    /// <summary>
    /// Maps an external stage's send result. Completing the send starts the stage's first receive workflow, parked
    /// on the mailbox the send published. Ending the task closes that mailbox without waiting for a reply.
    /// </summary>
    internal static WorkflowEngineCommandResult DecideSend(
        ServiceTaskResult result,
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry,
        CarriedMailbox mailbox,
        ServiceTaskItem.ExternalStage stage,
        int stageIndex
    )
    {
        switch (result)
        {
            case CompletedServiceTaskResult:
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the stage's first receiver") is { } noKey)
                {
                    return noKey;
                }

                var handover = new ServiceTaskHandover(
                    stageIndex,
                    WorkflowStepSet.PlanReceive(serviceTaskType, stage, stageIndex),
                    new MailboxTarget(mailbox.Id, stageIndex)
                );
                return new SuccessfulWorkflowEngineCommandResult
                {
                    ServiceTaskContinuation = new ServiceTaskContinuation.ContinueAfterStage(serviceTaskType, handover),
                };

            case EndedServiceTaskResult ended:
                return EndTask(ended.Action, serviceTaskType, stepId, carry);

            default:
                return DeferOrFail(result, serviceTaskType);
        }
    }

    /// <summary>
    /// Maps an external stage's reply handler's or timeout handler's result: <paramref name="receipt"/> is the
    /// engine's rendezvous the step ran on, and the mailbox it names is the stage's. Awaiting the next reply
    /// enqueues the stage's next receiver. Completing closes the mailbox and carries on as a completed stage does;
    /// ending the task closes it and ends the task.
    /// </summary>
    internal static WorkflowEngineCommandResult DecideReply(
        ServiceTaskReplyResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox receipt,
        WorkflowCallbackStateCarry carry,
        ServiceTaskItem.ExternalStage stage,
        int stageIndex,
        ServiceTaskPipeline pipeline
    )
    {
        switch (result)
        {
            case ServiceTaskAwaitNextReplyResult:
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the stage's next receiver") is { } noKey)
                {
                    return noKey;
                }

                return new SuccessfulWorkflowEngineCommandResult
                {
                    ServiceTaskContinuation = new ServiceTaskContinuation.AwaitNextMessage(
                        receipt.Id,
                        serviceTaskType,
                        stageIndex,
                        receipt.Seq,
                        stage.StepOptions,
                        stage.ReplyDisplayName
                    ),
                };

            case CompletedServiceTaskResult:
                return CarryOn(serviceTaskType, stepId, carry, stageIndex, pipeline, closing: receipt.Id);

            case EndedServiceTaskResult ended:
                return EndTask(ended.Action, serviceTaskType, stepId, carry);

            default:
                return DeferOrFail(result, serviceTaskType);
        }
    }

    /// <summary>
    /// The item at <paramref name="itemIndex"/> is done: start the next item's workflow, closing
    /// <paramref name="closing"/> first when the item is an external stage done with its replies, or end the task
    /// with no action after the last item, as <see cref="EndTask"/> does.
    /// </summary>
    private static WorkflowEngineCommandResult CarryOn(
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry,
        int itemIndex,
        ServiceTaskPipeline pipeline,
        Guid? closing
    )
    {
        if (pipeline.IsLast(itemIndex))
        {
            return EndTask(action: null, serviceTaskType, stepId, carry);
        }

        if (StepIdMissing(stepId, serviceTaskType, "start the pipeline's next item") is { } noKey)
        {
            return noKey;
        }

        var handover = new ServiceTaskHandover(
            itemIndex,
            WorkflowStepSet.PlanItem(serviceTaskType, pipeline, itemIndex + 1)
        );
        if (closing is not { } mailboxId)
        {
            return new SuccessfulWorkflowEngineCommandResult
            {
                ServiceTaskContinuation = new ServiceTaskContinuation.ContinueAfterStage(serviceTaskType, handover),
            };
        }

        // Dropped from the carry before the state is captured, so the next item's workflow carries no mailbox and
        // can open its own.
        carry.RecordMailboxClosed();
        return new SuccessfulWorkflowEngineCommandResult
        {
            ServiceTaskContinuation = new ServiceTaskContinuation.CloseAndContinue(
                mailboxId,
                serviceTaskType,
                handover
            ),
        };
    }

    /// <summary>
    /// Ends the task and moves the process on with <paramref name="action"/>. With a mailbox open in
    /// <paramref name="carry"/>, the relay closes it before it enqueues the next transition; with none, the callback
    /// enqueues it directly, as for any step that ends a task.
    /// </summary>
    private static WorkflowEngineCommandResult EndTask(
        string? action,
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry
    )
    {
        // The carry holds the task's one open mailbox, whichever step ends the task: the send's and the reply
        // step's state carry the mailbox they publish or are parked on.
        if (carry.OpenMailbox is not { } open)
        {
            return new SuccessfulWorkflowEngineCommandResult { ProcessNextContinuation = new(action) };
        }

        if (StepIdMissing(stepId, serviceTaskType, "start the workflow that follows the task") is { } noKey)
        {
            return noKey;
        }

        // Dropped from the carry before the state is captured, so the next transition's blob carries no mailbox
        // that has closed.
        carry.RecordMailboxClosed();
        return new SuccessfulWorkflowEngineCommandResult
        {
            ProcessNextContinuation = new(action),
            ServiceTaskContinuation = new ServiceTaskContinuation.CloseAndEndTask(open.Id),
        };
    }

    /// <summary>
    /// The results that close nothing and start nothing: a deferral, which runs the step again later, and a
    /// failure, which leaves any open mailbox open so that a resume runs the step against it again. Any other
    /// result is one this version cannot act on.
    /// </summary>
    private static WorkflowEngineCommandResult DeferOrFail(ServiceTaskReplyResult result, string serviceTaskType) =>
        result switch
        {
            DeferredServiceTaskResult deferred => new DeferredWorkflowEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskResult { Kind: FailureKind.Permanent } failed =>
                FailedWorkflowEngineCommandResult.Permanent(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode
                ),
            FailedServiceTaskResult failed => FailedWorkflowEngineCommandResult.Retryable(
                ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                ExecuteServiceTask.FailedReasonCode
            ),
            // Reachable from app code: the result roots declare no callable constructor, but they are records,
            // and C# forbids narrowing a record's synthesized copy constructor, so chaining it still compiles.
            // Permanent, not a throw — the outer catch in ExecuteServiceTask would retry an author error forever.
            _ => FailedWorkflowEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' returned {StageExecution.DescribeResult(result)}, which this "
                    + "version of the app-lib cannot act on. Return one of the results the factory methods of "
                    + $"{nameof(ServiceTaskResult)} and {nameof(ServiceTaskReplyResult)} produce "
                    + $"({nameof(ServiceTaskResult.Completed)}, {nameof(ServiceTaskResult.EndTask)}, "
                    + $"{nameof(ServiceTaskResult.Defer)}, {nameof(ServiceTaskResult.FailedRetryable)}, "
                    + $"{nameof(ServiceTaskResult.FailedPermanent)} or {nameof(ServiceTaskReplyResult.AwaitNextReply)} "
                    + "from a reply handler) — never a type of your own, and never null.",
                "ServiceTaskResultUnknown"
            ),
        };

    /// <summary>
    /// <c>MailboxStepIdMissing</c>, for the keyed results only: the bare step id is the whole idempotency
    /// key, engine idempotency is scoped to <c>(namespace, key)</c>, and an empty id is a constant — so
    /// every service task in the application would collapse onto one enqueued workflow. Results that make no
    /// keyed call are not refused.
    /// </summary>
    private static FailedWorkflowEngineCommandResult? StepIdMissing(Guid stepId, string serviceTaskType, string wouldDo)
    {
        if (stepId != Guid.Empty)
        {
            return null;
        }

        return FailedWorkflowEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' must {wouldDo}, but the workflow engine supplied no step id to key "
                + "that on. An enqueue keyed on an empty id would be shared by every service task step in this "
                + "application. Upgrade the workflow engine to a version that sends stepId.",
            "MailboxStepIdMissing"
        );
    }

    public async Task Continue(
        ServiceTaskContinuation continuation,
        ServiceTaskRelayRequest request,
        CancellationToken cancellationToken
    )
    {
        switch (continuation)
        {
            case ServiceTaskContinuation.AwaitNextMessage awaitNext:
                await EnqueueReceiver(
                    awaitNext.MailboxId,
                    awaitNext.ServiceTaskType,
                    [
                        WorkflowStepSet.CreateItemStep(
                            awaitNext.ServiceTaskType,
                            awaitNext.StageIndex,
                            awaitNext.HandlerStepOptions,
                            awaitNext.HandlerStepName
                        ),
                    ],
                    operationIdSuffix: "after message " + awaitNext.Position.ToString(CultureInfo.InvariantCulture),
                    request,
                    cancellationToken
                );
                return;

            case ServiceTaskContinuation.ContinueAfterStage afterStage:
                await HandOver(afterStage.Handover, afterStage.ServiceTaskType, request, cancellationToken);
                return;

            case ServiceTaskContinuation.CloseAndEndTask conclude:
                // Invariant 1: the mailbox stops accepting messages before anything downstream starts.
                await _workflowEngineClient.CloseMailbox(
                    GetNamespace(request.AppId),
                    conclude.MailboxId,
                    cancellationToken
                );
                await EnqueueAfterWorkflow(request, cancellationToken);
                return;

            case ServiceTaskContinuation.CloseAndContinue continuing:
                // Same order as CloseAndEndTask's: the reverse would let a message land in a mailbox the pipeline has
                // already moved past.
                await _workflowEngineClient.CloseMailbox(
                    GetNamespace(request.AppId),
                    continuing.MailboxId,
                    cancellationToken
                );
                await HandOver(continuing.Handover, continuing.ServiceTaskType, request, cancellationToken);
                return;

            default:
                throw new UnreachableException(
                    $"Unknown service task continuation type: {continuation.GetType().Name}"
                );
        }
    }

    /// <summary>
    /// Starts what the deciding hop said follows the step it ran, as the one workflow it planned: a receive
    /// workflow when the hand-over names a mailbox to park on, and an ordinary continuation otherwise. Only reached
    /// after the closure its caller performs.
    /// </summary>
    private Task HandOver(
        ServiceTaskHandover handover,
        string serviceTaskType,
        ServiceTaskRelayRequest request,
        CancellationToken cancellationToken
    ) =>
        handover.Target is { } target
            ? EnqueueReceiver(
                target.MailboxId,
                serviceTaskType,
                handover.Steps,
                operationIdSuffix: target.StageIndex.ToString(CultureInfo.InvariantCulture),
                request,
                cancellationToken
            )
            : EnqueueContinuation(serviceTaskType, handover, request, cancellationToken);

    /// <summary>
    /// One receive workflow, first receiver and successors alike: a single step naming the external stage by its
    /// item index, parked on the stage's mailbox, enqueued as a head that depends on the current head —
    /// the still-unsettled step running this relay — so the wait stays visible to the frontier and a
    /// failed hop condemns everything downstream. Keyed on the bare executing step id, per the invariant on
    /// this class.
    /// </summary>
    private async Task EnqueueReceiver(
        Guid mailboxId,
        string serviceTaskType,
        IReadOnlyList<PlannedStep> steps,
        string operationIdSuffix,
        ServiceTaskRelayRequest request,
        CancellationToken cancellationToken
    )
    {
        string? taskId = request.DataAccessor.Instance.Process?.CurrentTask?.ElementId;

        List<StepRequest> receiveSteps = [.. steps.ToStepRequests(_stepOptionsResolver)];

        var receiveWorkflow = new WorkflowRequest
        {
            OperationId = $"{ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix} {taskId} · {operationIdSuffix}",
            Steps = receiveSteps,
            Mailbox = new MailboxReference { Id = mailboxId },
            State = request.State,
            IsHead = true,
            DependsOnHeads = true,
        };

        // Token minted at this hop; with the re-signed blob this binds each hop to current app code.
        var receiveContext = new AppWorkflowContext
        {
            Actor = request.Payload.Actor,
            Org = request.AppId.Org,
            App = request.AppId.App,
            InstanceOwnerPartyId = request.InstanceId.InstanceOwnerPartyId,
            InstanceGuid = request.InstanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(
                request.InstanceId.InstanceGuid,
                request.Payload.Actor,
                [receiveWorkflow]
            ),
        };

        var enqueueRequest = new WorkflowEnqueueRequest
        {
            Labels = CreateSuccessorLabels(request),
            Context = JsonSerializer.SerializeToElement(receiveContext),
            Workflows = [receiveWorkflow],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: request.Payload.StepId.ToString(),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request: enqueueRequest,
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// The workflow of the item composed after the one the deciding hop ran (a completed stage, or an external
    /// stage done with its replies): the steps that hop planned, carried here whole and enqueued. This hop
    /// resolves nothing about the pipeline: the steps are authoritative, and the only thing left to do to them is
    /// resolve each step's options, which the resolver does from the step's own identity.
    /// </summary>
    private async Task EnqueueContinuation(
        string serviceTaskType,
        ServiceTaskHandover handover,
        ServiceTaskRelayRequest request,
        CancellationToken cancellationToken
    )
    {
        string? taskId = request.DataAccessor.Instance.Process?.CurrentTask?.ElementId;

        List<StepRequest> steps = [.. handover.Steps.ToStepRequests(_stepOptionsResolver)];

        var continuationWorkflow = new WorkflowRequest
        {
            // Named for the item it runs, as that item's ExecuteServiceTask step is.
            OperationId =
                $"{ProcessNextRequestFactory.ServiceTaskStageOperationIdPrefix} {taskId} · "
                + (handover.AfterItemIndex + 1).ToString(CultureInfo.InvariantCulture),
            Steps = steps,
            State = request.State,
            IsHead = true,
            DependsOnHeads = true,
        };

        // Minted at this hop, exactly as a successor receiver's is.
        var continuationContext = new AppWorkflowContext
        {
            Actor = request.Payload.Actor,
            Org = request.AppId.Org,
            App = request.AppId.App,
            InstanceOwnerPartyId = request.InstanceId.InstanceOwnerPartyId,
            InstanceGuid = request.InstanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(
                request.InstanceId.InstanceGuid,
                request.Payload.Actor,
                [continuationWorkflow]
            ),
        };

        var enqueueRequest = new WorkflowEnqueueRequest
        {
            Labels = CreateSuccessorLabels(request),
            Context = JsonSerializer.SerializeToElement(continuationContext),
            Workflows = [continuationWorkflow],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: request.Payload.StepId.ToString(),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request: enqueueRequest,
            cancellationToken: cancellationToken
        );
    }

    // Target labels let workflow status reads identify the successor's destination.
    private static Dictionary<string, string> CreateSuccessorLabels(ServiceTaskRelayRequest request) =>
        ProcessNextRequestFactory.CreateProcessNextLabels(
            request.InstanceId,
            sourceTask: null,
            request.DataAccessor.Instance.Process?.CurrentTask?.ElementId
        );

    private Task EnqueueAfterWorkflow(ServiceTaskRelayRequest request, CancellationToken cancellationToken) =>
        _processEngine.EnqueueProcessNext(
            request.DataAccessor,
            request.Payload.Actor,
            request.Payload.WorkflowId,
            // Derived, not read from the Collection-Key header: a header the engine forgot must not decide
            // whether the process advances.
            ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request.State,
            request.Payload.ExecutionReferenceTime,
            request.AutoAdvanceAction,
            request.Payload.StepId.ToString(),
            cancellationToken
        );

    private static string GetNamespace(AppIdentifier appId) => $"{appId.Org}/{appId.App}";
}

internal readonly record struct ServiceTaskRelayRequest
{
    public required AppIdentifier AppId { get; init; }

    public required InstanceIdentifier InstanceId { get; init; }

    public required AppCallbackPayload Payload { get; init; }

    public required IInstanceDataAccessor DataAccessor { get; init; }

    /// <summary>
    /// The state blob the step published, re-signed: what every workflow the relay enqueues starts from.
    /// </summary>
    public required string State { get; init; }

    public required string? AutoAdvanceAction { get; init; }
}
