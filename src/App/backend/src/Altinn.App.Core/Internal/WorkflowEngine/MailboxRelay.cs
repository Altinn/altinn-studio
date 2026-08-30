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
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The mailbox relay saga. Correct under at-least-once retries by three invariants: the mailbox closes before
/// anything downstream starts; at most one execution concludes per exchange (structural, via
/// <see cref="MailboxContinuation"/>); and every engine call is keyed off
/// <see cref="AppCallbackPayload.StepId"/>. Every enqueue lands as a collection head from inside the
/// still-unsettled receiver, keeping the frontier non-empty for the whole exchange.
/// </summary>
internal sealed class MailboxRelay
{
    private readonly IWorkflowEngineClient _workflowEngineClient;
    private readonly IWorkflowCallbackTokenGenerator _callbackTokenGenerator;
    private readonly ProcessStepOptionsResolver _stepOptionsResolver;
    private readonly IProcessEngine _processEngine;
    private readonly AppImplementationFactory _appImplementationFactory;

    public MailboxRelay(
        IWorkflowEngineClient workflowEngineClient,
        IWorkflowCallbackTokenGenerator callbackTokenGenerator,
        ProcessStepOptionsResolver stepOptionsResolver,
        IProcessEngine processEngine,
        AppImplementationFactory appImplementationFactory
    )
    {
        _workflowEngineClient = workflowEngineClient;
        _callbackTokenGenerator = callbackTokenGenerator;
        _stepOptionsResolver = stepOptionsResolver;
        _processEngine = processEngine;
        _appImplementationFactory = appImplementationFactory;
    }

    /// <summary>Keyed so a replayed conclusion advances the process once.</summary>
    internal static string CreateAfterWorkflowIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-after";

    /// <summary>Keyed so a replayed conclusion starts the pipeline's next segment once.</summary>
    internal static string CreateContinuationIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-continue";

    /// <summary>
    /// Maps a terminal reply handler's verdict to the callback's outcome plus the continuation
    /// <see cref="Continue"/> runs after the save. Two distinct indexes: <paramref name="handlerItemIndex"/>
    /// is the item this execution ran (what a successor receiver's step names), taken from the step's own
    /// payload; <paramref name="openingStageIndex"/> is the item that opened the exchange (the carry's key),
    /// read off the handler this hop's <c>ResolvePipeline()</c> produced. Re-deriving the latter carries a
    /// mid-flight-reshape hazard, accepted and unguarded — see the Mailboxes section of this folder's
    /// AGENTS.md.
    /// </summary>
    internal static ProcessEngineCommandResult Decide(
        ServiceTaskExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        int handlerItemIndex,
        int openingStageIndex
    )
    {
        switch (result)
        {
            case ServiceTaskAwaitNextReplyResult:
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's next receiver") is { } noKey)
                {
                    return noKey;
                }

                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        handlerItemIndex,
                        mailbox.Seq
                    ),
                };

            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // A failing callback publishes no blob, so there is nothing for the carry to un-say.
                return FailedProcessEngineCommandResult.Permanent(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode,
                    new MailboxContinuation.Conclude(mailbox.Id)
                );

            case ServiceTaskFailedResult failed:
                // The saga has not started; the next attempt gets the same message.
                return FailedProcessEngineCommandResult.Retryable(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode
                );

            case ServiceTaskDeferredResult deferred:
                return new DeferredProcessEngineCommandResult { Delay = deferred.Delay, Reason = deferred.Reason };

            case ServiceTaskSuccessResult { AutoAdvanceProcess: true }
                when StepIdMissing(stepId, serviceTaskType, "start the workflow that follows the exchange")
                    is { } noAfterKey:
                return noAfterKey;

            case ServiceTaskSuccessResult success:
                carry.RecordMailboxConcluded(openingStageIndex);
                return new SuccessfulProcessEngineCommandResult
                {
                    AutoAdvanceProcess = success.AutoAdvanceProcess,
                    AutoAdvanceAction = success.Action,
                    MailboxContinuation = new MailboxContinuation.Conclude(mailbox.Id),
                };

            // Reachable from app code: the result roots declare no callable constructor, but they are records,
            // and C# forbids narrowing a record's synthesized copy constructor, so chaining it still compiles.
            // Permanent, not a throw — the outer catch in ExecuteServiceTask would retry an author error
            // forever. No continuation: an unrecognised verdict is no conclusion, and closing would pick the
            // most destructive of the readings it could have meant.
            default:
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' answered a message with a result of type "
                        + $"'{result.GetType().Name}', which this version of the app-lib cannot act on. A reply "
                        + "handler must return one of the results the factory methods produce — "
                        + $"{nameof(ServiceTaskResult.Success)}, "
                        + $"{nameof(ServiceTaskResult.SuccessWithoutAutoAdvance)}, "
                        + $"{nameof(ServiceTaskResult.FailedRetryable)}, "
                        + $"{nameof(ServiceTaskResult.FailedPermanent)}, {nameof(ServiceTaskResult.Defer)} or "
                        + $"{nameof(ServiceTaskExchangeResult.AwaitNextReply)} — never a type of its own.",
                    "ServiceTaskResultUnknown"
                );
        }
    }

    /// <summary>
    /// The same decision for a handler the pipeline <em>carries on past</em>: the verdict is the stage
    /// vocabulary, so concluding the task and advancing the process are not among the moves, and a concluded
    /// exchange starts the pipeline's next segment rather than an after-workflow. A separate method because
    /// the two vocabularies are unrelated roots — merging them behind a supertype would put
    /// <c>Success(action)</c> back within reach of a handler that must not have it.
    /// </summary>
    internal static ProcessEngineCommandResult DecideSegment(
        ServiceTaskStageExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        int handlerItemIndex,
        int openingStageIndex
    )
    {
        switch (result)
        {
            case ServiceTaskStageAwaitNextReplyResult:
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's next receiver") is { } noKey)
                {
                    return noKey;
                }

                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        handlerItemIndex,
                        mailbox.Seq
                    ),
                };

            case CompletedServiceTaskStageResult
                when StepIdMissing(stepId, serviceTaskType, "start the pipeline's next segment") is { } noContinueKey:
                return noContinueKey;

            case CompletedServiceTaskStageResult:
                // Dropped from the carry here, before the state is captured, so the continuation and everything
                // after it carry only the exchanges still open.
                carry.RecordMailboxConcluded(openingStageIndex);
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.ConcludeAndContinue(
                        mailbox.Id,
                        serviceTaskType,
                        handlerItemIndex,
                        openingStageIndex
                    ),
                };

            case FailedServiceTaskStageResult { Kind: FailureKind.Permanent } failed:
                // Later mailboxes already open are left alone: closing them would sabotage a resume, which
                // replays this handler and may then carry the chain on.
                return FailedProcessEngineCommandResult.Permanent(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode,
                    new MailboxContinuation.Conclude(mailbox.Id)
                );

            case FailedServiceTaskStageResult failed:
                // The saga has not started; the next attempt gets the same message.
                return FailedProcessEngineCommandResult.Retryable(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode
                );

            case DeferredServiceTaskStageResult deferred:
                return new DeferredProcessEngineCommandResult { Delay = deferred.Delay, Reason = deferred.Reason };

            // Reached by the route Decide's last arm documents; answered the same way.
            default:
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' answered a message with a result of type "
                        + $"'{result.GetType().Name}', which this version of the app-lib cannot act on. A reply "
                        + "handler that continues the pipeline must return one of the results the factory "
                        + $"methods produce — {nameof(ServiceTaskStageResult.Completed)}, "
                        + $"{nameof(ServiceTaskStageResult.FailedRetryable)}, "
                        + $"{nameof(ServiceTaskStageResult.FailedPermanent)}, "
                        + $"{nameof(ServiceTaskStageResult.Defer)} or "
                        + $"{nameof(ServiceTaskStageExchangeResult.AwaitNextReply)} — never a type of its own.",
                    "ServiceTaskResultUnknown"
                );
        }
    }

    /// <summary>
    /// <c>MailboxStepIdMissing</c>, for the keyed verdicts only: engine idempotency is scoped to
    /// <c>(namespace, key)</c> and an empty id is a constant, so every exchange in the application would
    /// collapse onto one successor and one after-workflow. Verdicts that make no keyed call are not refused.
    /// </summary>
    private static FailedProcessEngineCommandResult? StepIdMissing(Guid stepId, string serviceTaskType, string wouldDo)
    {
        if (stepId != Guid.Empty)
        {
            return null;
        }

        return FailedProcessEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' must {wouldDo}, but the workflow engine supplied no step id to key "
                + "that on. An enqueue keyed on an empty id would be shared by every mailbox exchange in this "
                + "application. Upgrade the workflow engine to a version that sends stepId.",
            "MailboxStepIdMissing"
        );
    }

    public async Task Continue(MailboxContinuation continuation, MailboxRelayRequest request, CancellationToken ct)
    {
        switch (continuation)
        {
            case MailboxContinuation.AwaitNextMessage awaitNext:
                await EnqueueSuccessorReceiver(awaitNext, request, ct);
                return;

            case MailboxContinuation.Conclude conclude:
                // Invariant 1: the mailbox stops accepting messages before anything downstream starts.
                await _workflowEngineClient.CloseMailbox(GetNamespace(request.AppId), conclude.MailboxId, ct);

                if (request.AutoAdvanceProcess)
                {
                    await EnqueueAfterWorkflow(request, ct);
                }

                return;

            case MailboxContinuation.ConcludeAndContinue continuing:
                // Same order as Conclude's: the reverse would let a message land in an exchange the pipeline
                // has already moved past. Only this exchange's mailbox closes — a later one already open
                // spends its own deadline, which is what lets a resume replay this handler.
                await _workflowEngineClient.CloseMailbox(GetNamespace(request.AppId), continuing.MailboxId, ct);
                await EnqueueContinuation(continuing, request, ct);
                return;

            default:
                throw new UnreachableException($"Unknown mailbox continuation type: {continuation.GetType().Name}");
        }
    }

    /// <summary>The same shape <see cref="Commands.EnqueueReceiveWorkflow"/> gives the first receiver.</summary>
    private async Task EnqueueSuccessorReceiver(
        MailboxContinuation.AwaitNextMessage continuation,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(continuation.ServiceTaskType, continuation.HandlerItemIndex)
            .ApplyStepOptions(_stepOptionsResolver, taskId, continuation.ServiceTaskType);

        // Token minted at this hop; with the re-signed blob this binds each hop to current app code. The lock
        // token is carried verbatim by design.
        var receiveContext = new AppWorkflowContext
        {
            Actor = request.Payload.Actor,
            LockToken = request.Payload.LockToken,
            Org = request.AppId.Org,
            App = request.AppId.App,
            InstanceOwnerPartyId = request.InstanceId.InstanceOwnerPartyId,
            InstanceGuid = request.InstanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(request.InstanceId.InstanceGuid),
        };

        var enqueueRequest = new WorkflowEnqueueRequest
        {
            Labels = CreateSuccessorLabels(request),
            Context = JsonSerializer.SerializeToElement(receiveContext),
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId =
                        $"{ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix} {taskId} · after message "
                        + continuation.Position.ToString(CultureInfo.InvariantCulture),
                    Steps = [receiveStep],
                    Mailbox = new MailboxReference { Id = continuation.MailboxId },
                    State = request.State,
                    // A head that depends on the current head — the previous hop — so the exchange stays
                    // visible to the frontier and a failed hop condemns everything downstream.
                    IsHead = true,
                    DependsOnHeads = true,
                },
            ],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: Commands.EnqueueReceiveWorkflow.CreateIdempotencyKey(request.Payload.StepId),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request: enqueueRequest,
            ct: ct
        );
    }

    /// <summary>
    /// The pipeline's next segment, as one workflow: the items composed after the handler that just concluded,
    /// ended by the step that enqueues the next exchange's first receiver — or by the pipeline's conclusion
    /// when no exchange is left. Identity carried, shape re-derived: the continuation says where the segment
    /// starts, and what it contains is planned from the pipeline as it resolves at this hop. The step that
    /// enqueues the next receiver is appended here, last — the continuation cannot settle before the receiver
    /// that follows it exists.
    /// </summary>
    private async Task EnqueueContinuation(
        MailboxContinuation.ConcludeAndContinue continuation,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;
        string serviceTaskType = continuation.ServiceTaskType;

        IPipelineServiceTask serviceTask =
            _appImplementationFactory.FindServiceTask(serviceTaskType)
            ?? throw new InvalidOperationException(
                $"No service task is registered for type '{serviceTaskType}', so the segment following the "
                    + $"exchange opened at index {continuation.OpeningStageIndex} cannot be planned."
            );

        ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

        ServiceTaskSegmentPlan segmentPlan = WorkflowCommandSet.PlanSegment(
            serviceTaskType,
            pipeline,
            afterHandlerItemIndex: continuation.HandlerItemIndex
        );

        List<StepRequest> steps =
        [
            .. segmentPlan.Steps.ApplyStepOptions(_stepOptionsResolver, taskId, serviceTaskType),
        ];

        if (segmentPlan.Receive is { } receive)
        {
            var receiveEnqueueRequest = new WorkflowEnqueueRequest
            {
                Labels = CreateSuccessorLabels(request),
                Workflows =
                [
                    new WorkflowRequest
                    {
                        OperationId =
                            $"{ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix} {taskId} · "
                            + receive.OpeningStageIndex.ToString(CultureInfo.InvariantCulture),
                        Steps = [receive.Step.ApplyStepOptions(_stepOptionsResolver, taskId, serviceTaskType)],
                        IsHead = true,
                        DependsOnHeads = true,
                    },
                ],
            };

            steps.Add(
                WorkflowCommandSet
                    .CreateReceiveEnqueueStep(receiveEnqueueRequest, receive.OpeningStageIndex)
                    .ApplyStepOptions(_stepOptionsResolver, taskId: null, serviceTaskType: null)
            );
        }

        // Minted at this hop, exactly as a successor receiver's is.
        var continuationContext = new AppWorkflowContext
        {
            Actor = request.Payload.Actor,
            LockToken = request.Payload.LockToken,
            Org = request.AppId.Org,
            App = request.AppId.App,
            InstanceOwnerPartyId = request.InstanceId.InstanceOwnerPartyId,
            InstanceGuid = request.InstanceId.InstanceGuid,
            CallbackToken = _callbackTokenGenerator.GenerateToken(request.InstanceId.InstanceGuid),
        };

        var enqueueRequest = new WorkflowEnqueueRequest
        {
            Labels = CreateSuccessorLabels(request),
            Context = JsonSerializer.SerializeToElement(continuationContext),
            Workflows =
            [
                new WorkflowRequest
                {
                    OperationId =
                        $"{ProcessNextRequestFactory.MailboxContinueOperationIdPrefix} {taskId} · after "
                        + continuation.OpeningStageIndex.ToString(CultureInfo.InvariantCulture),
                    Steps = steps,
                    State =
                        request.State
                        ?? throw new InvalidOperationException(
                            "A concluded mailbox exchange that continues the pipeline must carry the state its "
                                + "handler published."
                        ),
                    IsHead = true,
                    DependsOnHeads = true,
                },
            ],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: CreateContinuationIdempotencyKey(request.Payload.StepId),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request: enqueueRequest,
            ct: ct
        );
    }

    /// <summary>
    /// The transition labels every workflow the relay enqueues must carry, re-derived from the committed
    /// instance: <c>ResolveWorkflowTaskStatus</c> and the collection lookup in
    /// <c>ListCurrentTaskProcessNextWorkflows</c> read them, and a successor invisible to that filter would
    /// let downstream work start on an open exchange once retention purged the earlier workflows.
    /// <c>processNextSourceId</c> is unrecoverable here and deliberately omitted.
    /// </summary>
    private static Dictionary<string, string> CreateSuccessorLabels(MailboxRelayRequest request)
    {
        var labels = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            [ProcessNextRequestFactory.ProcessNextInstanceGuidLabel] = request.InstanceId.InstanceGuid.ToString(
                "N",
                CultureInfo.InvariantCulture
            ),
        };

        if (request.Instance.Process?.CurrentTask is { ElementId.Length: > 0 } currentTask)
        {
            labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel] = ProcessNextRequestFactory.CreateProcessNextId(
                currentTask.ElementId,
                currentTask.Flow ?? 0
            );
            labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel] = currentTask.ElementId;
        }

        return labels;
    }

    private Task EnqueueAfterWorkflow(MailboxRelayRequest request, CancellationToken ct) =>
        _processEngine.EnqueueProcessNext(
            request.Instance,
            request.Payload.Actor,
            request.Payload.LockToken,
            request.Payload.WorkflowId,
            // Derived, not read from the Collection-Key header: a header the engine forgot must not decide
            // whether the process advances.
            ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request.State
                ?? throw new InvalidOperationException(
                    "A concluded mailbox exchange that advances the process must carry the state its handler "
                        + "published."
                ),
            request.AutoAdvanceAction,
            CreateAfterWorkflowIdempotencyKey(request.Payload.StepId),
            ct
        );

    private static string GetNamespace(AppIdentifier appId) => $"{appId.Org}/{appId.App}";
}

internal readonly record struct MailboxRelayRequest
{
    public required AppIdentifier AppId { get; init; }

    public required InstanceIdentifier InstanceId { get; init; }

    public required AppCallbackPayload Payload { get; init; }

    public required Instance Instance { get; init; }

    /// <summary>The state blob the handler published, re-signed. <c>null</c> only on a permanent failure.</summary>
    public required string? State { get; init; }

    public required bool AutoAdvanceProcess { get; init; }

    public required string? AutoAdvanceAction { get; init; }
}
