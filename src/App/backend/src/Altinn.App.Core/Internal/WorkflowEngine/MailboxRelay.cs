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
    /// The continuation returned alongside the outcome is run by <see cref="Continue"/> once the handler's data
    /// changes are saved.
    /// </summary>
    /// <param name="result">
    /// The handler's verdict on this message, or on the closure. Typed as the exchange vocabulary because a
    /// message handler may also answer "await the next message"; a closure handler cannot.
    /// </param>
    /// <param name="serviceTaskType">The task whose exchange this is, for the failure wording.</param>
    /// <param name="stepId">The executing step, which every keyed engine call is keyed off.</param>
    /// <param name="mailbox">The rendezvous the engine handed this execution.</param>
    /// <param name="carry">The blob's bookkeeping, which a conclusion stops carrying the mailbox in.</param>
    /// <param name="openingStageIndex">
    /// The item that opened the exchange — the carry's key for it, and the identity a successor is enqueued
    /// against. Sourced by the executing command from the step's own payload, never re-derived here: a
    /// mid-flight reshape would otherwise point the successor at another exchange and make
    /// <see cref="WorkflowCallbackStateCarry"/>'s concluding removal a silent no-op, leaving the concluded
    /// mailbox in the published blob.
    /// </param>
    internal static ProcessEngineCommandResult Decide(
        ServiceTaskExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        int openingStageIndex
    )
    {
        switch (result)
        {
            case ServiceTaskAwaitNextReplyResult:
                // Only a message handler can have returned this — a closure handler returns ServiceTaskResult,
                // which cannot express it.
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's next receiver") is { } noKey)
                {
                    return noKey;
                }

                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        openingStageIndex,
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
                // A deferral changes nothing: the receiver stays parked as a head and re-runs on the same message.
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

            // An answer this version has no move for. THE REACHABILITY ANCHOR for all four of these arms
            // (DecideSegment's own and the two mappers in ExecuteServiceTask are the others): declaring a
            // result type does not compile, because the roots' declared constructors are inaccessible outside
            // this assembly — but these roots are records, and C# forbids narrowing a record's synthesized
            // copy constructor below protected on an unsealed type, so an app can still reach here by
            // chaining that. Permanent, not a throw: the outer catch in ExecuteServiceTask would turn a throw
            // into a retryable failure, and an unrecognised result type is an author error no retry converges
            // on. No continuation: an unrecognised verdict is no conclusion, and closing would pick the most
            // destructive of the readings it could have meant. Left open, the deadline still bounds it, an
            // operator can close it by hand, and a resume replays the message into the corrected handler.
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
    /// vocabulary, so concluding the task and advancing the process are not among the moves, and what a
    /// concluded exchange starts is the pipeline's next segment rather than an after-workflow.
    /// </summary>
    /// <remarks>
    /// A separate method rather than an arm of <see cref="Decide"/> because the two vocabularies are
    /// unrelated roots — a type has one base, and <see cref="ServiceTaskStageExchangeResult"/> deliberately
    /// sits under neither <see cref="ServiceTaskExchangeResult"/> nor anything it shares. Merging them behind
    /// a common supertype would put <c>Success(action)</c> back within reach of a handler that must not have
    /// it. <paramref name="openingStageIndex"/> carries a third meaning here beyond the ones
    /// <see cref="Decide"/> gives it: the handler position the next segment starts after.
    /// </remarks>
    internal static ProcessEngineCommandResult DecideSegment(
        ServiceTaskStageExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        int openingStageIndex
    )
    {
        switch (result)
        {
            case ServiceTaskStageAwaitNextReplyResult:
                // Only a message handler can have returned this — a closure handler returns
                // ServiceTaskStageResult, which cannot express it. Same move and same key as a terminal's
                // AwaitNextReply: nothing about the successor depends on which kind of handler answers it.
                if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's next receiver") is { } noKey)
                {
                    return noKey;
                }

                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        openingStageIndex,
                        mailbox.Seq
                    ),
                };

            case CompletedServiceTaskStageResult
                when StepIdMissing(stepId, serviceTaskType, "start the pipeline's next segment") is { } noContinueKey:
                return noContinueKey;

            case CompletedServiceTaskStageResult:
                // The mailbox stops travelling in the blob here, before the state is captured, so the
                // continuation and everything after it carry only the exchanges still open.
                carry.RecordMailboxConcluded(openingStageIndex);
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.ConcludeAndContinue(
                        mailbox.Id,
                        serviceTaskType,
                        openingStageIndex
                    ),
                };

            case FailedServiceTaskStageResult { Kind: FailureKind.Permanent } failed:
                // Later mailboxes already open are deliberately left alone: closing them would sabotage a
                // resume, which replays this handler and may then carry the chain on. A failing callback
                // publishes no blob, so there is nothing for the carry to un-say.
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
                // A deferral changes nothing: the receiver stays parked as a head and re-runs on the same message.
                return new DeferredProcessEngineCommandResult { Delay = deferred.Delay, Reason = deferred.Reason };

            // An answer this version has no move for, reached by the route Decide's own last arm documents
            // and answered the same way, for the same reasons.
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
    /// <c>MailboxStepIdMissing</c>. Engine drift: an engine version that does not send <c>stepId</c> on the
    /// callback. Every enqueue the saga makes is keyed off it, and an empty id is a constant — engine
    /// idempotency is scoped to <c>(namespace, key)</c>, so every exchange in the application would collapse
    /// onto one successor and one after-workflow.
    /// </summary>
    /// <remarks>
    /// Only the keyed verdicts are refused — two per vocabulary — and before anything is closed or enqueued:
    /// refusing a verdict that makes no keyed call would fail a working callback over a key it never uses.
    /// </remarks>
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
                // The same order as Conclude's, and for the same reason: the reverse compiles, and would let
                // a message land in an exchange the pipeline has already moved past. Only *this* exchange's
                // mailbox closes — a later one already open spends its own deadline, which is what lets a
                // resume replay this handler and carry the chain on.
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
            .CreateReceiveHandlerStep(continuation.ServiceTaskType, continuation.OpeningStageIndex)
            .ApplyStepOptions(_stepOptionsResolver, taskId, continuation.ServiceTaskType);

        // Minted at this hop: with the re-signed blob below, this binds each hop to current app code. The lock
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
                    // A head, so the exchange stays visible to the frontier; depending on no head, so nothing gates a
                    // workflow whose only release is the rendezvous.
                    IsHead = true,
                    DependsOnHeads = false,
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
    /// The pipeline's next segment, as one workflow: the stages composed after the handler that just
    /// concluded, ended by the step that enqueues the next exchange's first receiver — or by the pipeline's
    /// conclusion when no exchange is left.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Identity carried, shape re-derived: the concluded exchange's index says <em>where</em> the segment
    /// starts, and <em>what</em> it contains is planned from the pipeline as it resolves at this hop. The
    /// pipeline is resolvable by construction: dispatch found this exchange's handler in this very callback,
    /// and a redeploy that withdrew it stops the receiver at <c>MailboxHandlerNotFound</c> before the relay
    /// ever runs.
    /// </para>
    /// <para>
    /// The step that enqueues the next receiver is appended <em>here</em>, last, rather than by the planner —
    /// the frontier-never-empty convention on this hop: the continuation cannot settle before the receiver
    /// that follows it exists.
    /// </para>
    /// </remarks>
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

        // The handler answering the concluded exchange, in this hop's own resolution of the pipeline. Its item
        // index is where the next segment starts. Dispatch found this very handler in this same callback, so a
        // miss here would take Define breaking its determinism contract rather than model drift.
        int handlerIndex =
            pipeline.FindReplySegmentIndex(continuation.OpeningStageIndex)
            ?? throw new InvalidOperationException(
                $"The pipeline composes no handler for the exchange opened at index "
                    + $"{continuation.OpeningStageIndex}, so the segment that follows it cannot be planned. "
                    + "Define must return the same pipeline every time it is called."
            );

        ServiceTaskSegmentPlan segmentPlan = WorkflowCommandSet.PlanSegment(
            serviceTaskType,
            pipeline,
            afterHandlerItemIndex: handlerIndex
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
                        // A head, so the next exchange stays visible to the frontier; depending on no head, so
                        // nothing gates a workflow whose only release is the rendezvous.
                        IsHead = true,
                        DependsOnHeads = false,
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
                    DependsOnHeads = false,
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
    /// The transition labels every workflow the relay enqueues must carry — a successor receiver, a
    /// continuation, and the receiver a continuation ends with — re-derived from the committed instance. Two
    /// readers need them: <c>ResolveWorkflowTaskStatus</c> (via <c>processNextTargetTask</c>) and the collection lookup in
    /// <c>ListCurrentTaskProcessNextWorkflows</c> — a successor invisible to that filter would let downstream
    /// work start on an open exchange once retention purged the earlier workflows. <c>processNextSourceId</c>
    /// is unrecoverable here and deliberately omitted.
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
