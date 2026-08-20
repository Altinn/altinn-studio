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
/// The mailbox relay saga: turns one reply handler's verdict into the next thing that happens — another
/// receiver, or the end of the exchange and whatever follows it. Three invariants make it correct under
/// at-least-once retries, and all three are properties of this file: the mailbox is closed before anything
/// downstream starts; at most one execution concludes (structural, via <see cref="MailboxContinuation"/>);
/// and every engine call made from a callback is keyed off <see cref="AppCallbackPayload.StepId"/>, so a
/// replayed attempt deduplicates instead of forking the relay. Every enqueue here lands as a collection head
/// from inside the still-unsettled receiver, which is what keeps the instance's frontier non-empty for the
/// whole exchange.
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

    /// <summary>
    /// The idempotency key for the workflow that runs after a concluded exchange. Derived from the step that
    /// concluded it, so a replayed conclusion advances the process once.
    /// </summary>
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
                // The one contract violation the engine does not enforce and the app-lib must: no message means the
                // mailbox is closed, so there is no next message to await and a retry would re-derive the same truth.
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

                // An ordinary successful step that leaves the exchange open: the task concludes on a later message,
                // or on the closing signal.
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        mailbox.Seq
                    ),
                };

            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // Concludes the exchange in this message's words. The close still happens, but nothing downstream
                // starts and the receive workflow fails so the transition reads as failed. No RecordMailboxConcluded:
                // a failing callback publishes no blob, so there is nothing for the carry to un-say.
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException",
                    new MailboxContinuation.Conclude(mailbox.Id)
                );

            case ServiceTaskFailedResult failed:
                // Retryable: the saga has not started, and the next attempt is handed the same message. A handler that
                // always lands here holds the exchange open until the mailbox's deadline instead.
                return FailedProcessEngineCommandResult.Retryable(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException"
                );

            case ServiceTaskDeferredResult deferred:
                // A deferral changes nothing about the exchange: the receiver parks, stays a collection head, and
                // re-runs against the same frozen message.
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
    /// Refuses a verdict that would make a keyed engine call when the engine supplied no step id to key it on;
    /// <c>null</c> when the id is usable. An empty id is a constant, and engine idempotency is scoped to the whole
    /// app namespace, so every exchange would enqueue its successor under one shared key — cross-exchange damage
    /// rather than repeated work. Only the two verdicts that make a keyed call are refused, and the refusal comes
    /// before any continuation exists, so nothing is closed and nothing is enqueued.
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

    /// <summary>
    /// Runs the saga for one handler verdict. Called once per receive-handler callback that reached a
    /// verdict, from the callback controller.
    /// </summary>
    public async Task Continue(MailboxContinuation continuation, MailboxRelayRequest request, CancellationToken ct)
    {
        switch (continuation)
        {
            case MailboxContinuation.AwaitNextMessage awaitNext:
                // Nothing is closed here and nothing else is started: the one workflow this enqueues is what keeps the
                // collection's frontier non-empty once the executing receiver settles.
                await EnqueueSuccessorReceiver(awaitNext, request, ct);
                return;

            case MailboxContinuation.Conclude conclude:
                // Invariant 1, and the reason this method exists: the mailbox stops accepting messages before anything
                // downstream is allowed to start. Awaited, not fired.
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
    /// Enqueues the receive workflow for the exchange's next message — the same shape
    /// <see cref="Commands.EnqueueReceiveWorkflow"/> gives the first one.
    /// </summary>
    private async Task EnqueueSuccessorReceiver(
        MailboxContinuation.AwaitNextMessage continuation,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        // The conclusion's own step options, resolved as the factory resolves them for the first receiver. A null
        // stage name is what identifies the conclusion.
        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(continuation.ServiceTaskType)
            .ApplyStepOptions(_stepOptionsResolver, taskId, continuation.ServiceTaskType);

        // Minted at this hop rather than inherited: together with the re-signed state blob below, this is what
        // binds each hop to whatever app code is current. The lock token is carried verbatim by design.
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
                    // The state the handler published, saved and re-signed.
                    State = request.State,
                    // A head, so the exchange stays visible to readers of the collection's frontier;
                    // depending on no head, so nothing gates a workflow whose only release is the rendezvous.
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
    /// The transition labels a successor receiver must carry, re-derived from the committed instance rather than
    /// from a transition this hop no longer has. Two readers depend on them:
    /// <c>ResolveWorkflowTaskStatus</c> reads <c>processNextTargetTask</c> off the matching head, and
    /// <c>ListCurrentTaskProcessNextWorkflows</c> finds the instance's collection by filtering on
    /// <c>processNextSourceId</c>/<c>processNextTargetId</c> — a successor invisible to that filter would let
    /// downstream work start on top of an open exchange once retention purged the transition's earlier workflows.
    /// <c>processNextSourceId</c> is unrecoverable here and deliberately omitted: no receiver is ever the answer
    /// to a lookup by departed task.
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

    /// <summary>
    /// Enqueues the workflow that advances the process past the service task the exchange belonged to — the
    /// ordinary auto-advance workflow, with the relay's own idempotency key.
    /// </summary>
    private Task EnqueueAfterWorkflow(MailboxRelayRequest request, CancellationToken ct) =>
        _processEngine.EnqueueProcessNext(
            request.Instance,
            request.Payload.Actor,
            request.Payload.LockToken,
            request.Payload.WorkflowId,
            // Derived rather than read from the callback's Collection-Key header: the key algorithm has one source
            // of truth, and a header the engine forgot to send must not decide whether the process advances.
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

/// <summary>
/// Everything the relay needs that is not the verdict itself: who the callback is for, what it published, and
/// whether the process should advance once the exchange is over.
/// </summary>
internal readonly record struct MailboxRelayRequest
{
    /// <summary>The app the exchange belongs to.</summary>
    public required AppIdentifier AppId { get; init; }

    /// <summary>The instance the exchange belongs to.</summary>
    public required InstanceIdentifier InstanceId { get; init; }

    /// <summary>
    /// The callback being answered — the source of the actor, the lock token, the workflow the after-workflow
    /// depends on, and the step id every enqueue key is derived from.
    /// </summary>
    public required AppCallbackPayload Payload { get; init; }

    /// <summary>
    /// The instance as the handler left it: the current task the successor's step options resolve against, and the
    /// process state the after-workflow's transition is computed from.
    /// </summary>
    public required Instance Instance { get; init; }

    /// <summary>
    /// The state blob the handler published: saved, re-captured and re-signed. <c>null</c> only on a conclusion
    /// that failed permanently.
    /// </summary>
    public required string? State { get; init; }

    /// <summary>Whether a concluded exchange should advance the process.</summary>
    public required bool AutoAdvanceProcess { get; init; }

    /// <summary>The action to advance with, when it does.</summary>
    public required string? AutoAdvanceAction { get; init; }
}
