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
/// The mailbox relay saga. Correct under at-least-once retries by three invariants, all properties of this
/// file: the mailbox closes before anything downstream starts; at most one execution concludes (structural,
/// via <see cref="MailboxContinuation"/>); and every engine call is keyed off
/// <see cref="AppCallbackPayload.StepId"/>, so a replayed attempt deduplicates instead of forking. Every
/// enqueue lands as a collection head from inside the still-unsettled receiver, keeping the frontier
/// non-empty for the whole exchange.
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

    /// <summary>Derived from the concluding step, so a replayed conclusion advances the process once.</summary>
    internal static string CreateAfterWorkflowIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-after";

    /// <summary>
    /// Turns a reply handler's verdict into the callback's outcome and, when the saga has something to do, the
    /// continuation <see cref="Continue"/> runs once the handler's data changes are saved.
    /// </summary>
    internal static ProcessEngineCommandResult Decide(
        ServiceTaskResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry
    )
    {
        switch (result)
        {
            case ServiceTaskAwaitNextReplyResult:
                // The one contract violation the engine leaves to the app-lib: no message means the mailbox is closed,
                // so there is no next message to await, and a retry re-derives the same truth.
                if (mailbox.Delivery is null)
                {
                    return FailedProcessEngineCommandResult.Permanent(
                        $"Service task '{serviceTaskType}' answered AwaitNextReply to a closed mailbox. "
                            + $"ServiceTaskContext.Reply was null, which means the mailbox closed "
                            + $"({mailbox.DisposedReason}) and no further message can arrive, so the handler must "
                            + "conclude with Success or FailedPermanent.",
                        "MailboxExchangeAlreadyClosed"
                    );
                }

                if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's next receiver") is { } noKey)
                {
                    return noKey;
                }

                // The exchange stays open: the task concludes on a later message or the closing signal.
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        mailbox.Seq
                    ),
                };

            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // The close still happens; nothing downstream starts, and a failing callback publishes no blob, so
                // there is nothing for the carry to un-say.
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
                carry.RecordMailboxConcluded();
                return new SuccessfulProcessEngineCommandResult
                {
                    AutoAdvanceProcess = success.AutoAdvanceProcess,
                    AutoAdvanceAction = success.Action,
                    MailboxContinuation = new MailboxContinuation.Conclude(mailbox.Id),
                };

            default:
                throw new UnreachableException($"Unknown service task result type: {result.GetType().Name}");
        }
    }

    /// <summary>
    /// Refuses a verdict that would make a keyed call when the engine supplied no step id: an empty id is a
    /// constant, so every exchange in the app would share one key — cross-exchange damage, not repeated work.
    /// Only the two keyed verdicts are refused, before anything is closed or enqueued.
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

    /// <summary>Runs the saga for one verdict, called from the callback controller.</summary>
    public async Task Continue(MailboxContinuation continuation, MailboxRelayRequest request, CancellationToken ct)
    {
        switch (continuation)
        {
            case MailboxContinuation.AwaitNextMessage awaitNext:
                // The one workflow this enqueues keeps the frontier non-empty once the receiver settles.
                await EnqueueSuccessorReceiver(awaitNext, request, ct);
                return;

            case MailboxContinuation.Conclude conclude:
                // Invariant 1: the mailbox stops accepting messages before anything downstream starts. Awaited.
                await _workflowEngineClient.CloseMailbox(GetNamespace(request.AppId), conclude.MailboxId, ct);

                if (request.AutoAdvanceProcess)
                {
                    await EnqueueAfterWorkflow(request, ct);
                }

                return;

            default:
                throw new UnreachableException($"Unknown mailbox continuation type: {continuation.GetType().Name}");
        }
    }

    /// <summary>
    /// Enqueues the receive workflow for the next message — the same shape
    /// <see cref="Commands.EnqueueReceiveWorkflow"/> gives the first one.
    /// </summary>
    private async Task EnqueueSuccessorReceiver(
        MailboxContinuation.AwaitNextMessage continuation,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        // Resolved as the factory resolves them for the first receiver; a null stage name is the conclusion.
        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(continuation.ServiceTaskType)
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

    /// <summary>Enqueues the ordinary auto-advance workflow, with the relay's own idempotency key.</summary>
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

/// <summary>Everything the relay needs that is not the verdict itself.</summary>
internal readonly record struct MailboxRelayRequest
{
    public required AppIdentifier AppId { get; init; }

    public required InstanceIdentifier InstanceId { get; init; }

    /// <summary>
    /// The callback being answered — the source of the actor, the lock token, and the step id every key is
    /// derived from.
    /// </summary>
    public required AppCallbackPayload Payload { get; init; }

    public required Instance Instance { get; init; }

    /// <summary>The state blob the handler published, re-signed. <c>null</c> only on a permanent failure.</summary>
    public required string? State { get; init; }

    public required bool AutoAdvanceProcess { get; init; }

    public required string? AutoAdvanceAction { get; init; }
}
