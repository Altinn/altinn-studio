using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
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
/// anything downstream starts; at most one execution concludes (structural, via
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

    public MailboxRelay(
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

    /// <summary>Keyed so a replayed conclusion advances the process once.</summary>
    internal static string CreateAfterWorkflowIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-after";

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
    /// <param name="openingStageName">
    /// The stage that opened the exchange — the carry's key for it, and the identity a successor is enqueued
    /// against. Sourced by the executing command from the step's own payload (falling back to the pipeline's
    /// opening stage only for a step that carries no name), never re-derived here: a mid-flight rename would
    /// otherwise point the successor at another exchange and make <see cref="WorkflowCallbackStateCarry"/>'s
    /// concluding removal a silent no-op, leaving the concluded mailbox in the published blob.
    /// </param>
    internal static ProcessEngineCommandResult Decide(
        ServiceTaskExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        string openingStageName
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
                        openingStageName,
                        mailbox.Seq
                    ),
                };

            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // A failing callback publishes no blob, so there is nothing for the carry to un-say.
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException",
                    new MailboxContinuation.Conclude(mailbox.Id)
                );

            case ServiceTaskFailedResult failed:
                // The saga has not started; the next attempt gets the same message.
                return FailedProcessEngineCommandResult.Retryable(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException"
                );

            case ServiceTaskDeferredResult deferred:
                // A deferral changes nothing: the receiver stays parked as a head and re-runs on the same message.
                return new DeferredProcessEngineCommandResult { Delay = deferred.Delay, Reason = deferred.Reason };

            case ServiceTaskSuccessResult { AutoAdvanceProcess: true }
                when StepIdMissing(stepId, serviceTaskType, "start the workflow that follows the exchange")
                    is { } noAfterKey:
                return noAfterKey;

            case ServiceTaskSuccessResult success:
                carry.RecordMailboxConcluded(openingStageName);
                return new SuccessfulProcessEngineCommandResult
                {
                    AutoAdvanceProcess = success.AutoAdvanceProcess,
                    AutoAdvanceAction = success.Action,
                    MailboxContinuation = new MailboxContinuation.Conclude(mailbox.Id),
                };

            // An answer this version has no move for. THE REACHABILITY ANCHOR for all three of these arms
            // (the two mappers in ExecuteServiceTask are the others): declaring a result type does not
            // compile, because the roots' declared constructors are inaccessible outside this assembly — but
            // these roots are records, and C# forbids narrowing a record's synthesized copy constructor below
            // protected on an unsealed type, so an app can still reach here by chaining that. Permanent, not
            // a throw: the outer catch in ExecuteServiceTask would turn a throw into a retryable failure, and
            // an unrecognised result type is an author error no retry converges on. No continuation, though:
            // what closes the mailbox in this switch is the app having *concluded* the exchange, and an
            // unrecognised verdict is no conclusion — the runtime cannot tell whether Success,
            // FailedPermanent or AwaitNextReply was meant, and closing picks the most destructive reading,
            // losing the answer even after the author fixes the bug. Left open, the deadline still bounds it,
            // an operator can close it by hand, and a resume replays the message into the corrected handler.
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
    /// <c>MailboxStepIdMissing</c>. Engine drift: an engine version that does not send <c>stepId</c> on the
    /// callback. Every enqueue the saga makes is keyed off it, and an empty id is a constant — engine
    /// idempotency is scoped to <c>(namespace, key)</c>, so every exchange in the application would collapse
    /// onto one successor and one after-workflow.
    /// </summary>
    /// <remarks>
    /// Only the two keyed verdicts are refused, and before anything is closed or enqueued: refusing a verdict
    /// that makes no keyed call would fail a working callback over a key it never uses.
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

            // Drift guard for this assembly's own vocabulary: MailboxContinuation is a closed two-member set —
            // deliberately, since that is what makes "at most one execution concludes" structural — so the only
            // way here is a third member added without a case to perform it.
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

        // Resolved as the factory resolves them for the first receiver, and naming the same exchange: the
        // continuation carries the identity its predecessor's step carried, so the whole chain answers the
        // exchange the first receiver was enqueued against.
        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(continuation.ServiceTaskType, continuation.OpeningStageName)
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
    /// The transition labels a successor must carry, re-derived from the committed instance. Two readers need
    /// them: <c>ResolveWorkflowTaskStatus</c> (via <c>processNextTargetTask</c>) and the collection lookup in
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
