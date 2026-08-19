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
/// The mailbox relay saga: the whole protocol that turns one reply handler's verdict into the next
/// thing that happens — another receiver, or the end of the exchange and whatever follows it.
/// </summary>
/// <remarks>
/// <para>
/// <strong>This is the only place the saga lives.</strong> The design it implements trades an
/// engine-enforced conclusion (one response field, applied atomically with the reply's settlement)
/// for a sequence of idempotent app-made calls, which is correct under at-least-once retries only if
/// three invariants hold — and every one of them is a property of this file:
/// </para>
/// <list type="number">
/// <item>
/// <strong>Order: close the mailbox before starting what comes after.</strong> The reverse order
/// opens a window in which the continuation runs while the mailbox still accepts messages, so a
/// message could be delivered into an exchange the app has already concluded. In
/// <see cref="Continue"/> the close is awaited before the after-workflow is enqueued, in one method,
/// because the wrong ordering compiles.
/// </item>
/// <item>
/// <strong>At most one execution concludes.</strong> Structural, via <see cref="MailboxContinuation"/>:
/// a handler that asked for another message produces an <see cref="MailboxContinuation.AwaitNextMessage"/>,
/// which has no path to the close; a handler that concluded produces a
/// <see cref="MailboxContinuation.Conclude"/>, which has no path to a successor enqueue. The relay
/// parks at most one receiver at a time, so closure never releases a second handler that would also
/// have to conclude.
/// </item>
/// <item>
/// <strong>Every call made from inside a callback is keyed off the executing step.</strong> The
/// successor receiver and the after-workflow both derive their enqueue idempotency key from
/// <see cref="AppCallbackPayload.StepId"/>, which is stable across every attempt of the step, so a
/// crashed attempt's replay deduplicates onto the workflow the first attempt created instead of
/// forking the relay into two.
/// </item>
/// </list>
/// <para>
/// It also carries the <strong>frontier-never-empty</strong> convention's second half. Every enqueue
/// here happens inside a step of a workflow that is itself still unsettled — the executing
/// receiver — and lands as a collection head, so between the exchange's start and its conclusion the
/// instance's collection never reads all-settled. Everything that gates on that frontier (the
/// process-next wait, the read-path status annotation, auto-advance) therefore keeps waiting without
/// knowing mailboxes exist. Doing any of it after the receiver settled would be silent early
/// execution of downstream work.
/// </para>
/// <para>
/// The relay runs from the callback controller <em>after</em> the handler's data changes are saved
/// and re-captured, because the state it hands its successor must be the state the handler
/// published: a successor started on the pre-execution blob would not see the elements its
/// predecessor created, nor their Storage-assigned ids. That also re-signs the blob with whatever
/// app code is current at this hop, which is the only mechanism that lets an exchange outlive the
/// code that opened it.
/// </para>
/// </remarks>
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
    /// The idempotency key for the workflow that runs after a concluded exchange. Derived from the
    /// step that concluded it — saga invariant 3 — so a replayed conclusion advances the process once.
    /// </summary>
    internal static string CreateAfterWorkflowIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-after";

    /// <summary>
    /// Turns a reply handler's verdict into the callback's outcome and, when the saga has something
    /// to do, the continuation <see cref="Continue"/> will run after the handler's data changes are
    /// saved. The first half of the saga: which verdicts conclude, which continue, and which do
    /// neither.
    /// </summary>
    /// <param name="result">The handler's verdict.</param>
    /// <param name="serviceTaskType">The service task whose conclusion the handler is.</param>
    /// <param name="stepId">
    /// The engine's id for the executing step — the derivation every enqueue key in the saga is a
    /// function of. Checked here, before a continuation exists, because a continuation is a promise
    /// to make a keyed call.
    /// </param>
    /// <param name="mailbox">The rendezvous this execution was handed.</param>
    /// <param name="carry">
    /// The callback's non-data bookkeeping. A concluding verdict records the conclusion on it, so the
    /// blob this callback publishes stops naming a mailbox that no longer accepts anything.
    /// </param>
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
                // The one contract violation the engine does not enforce and the app-lib must. A
                // callback with no message means the mailbox is closed and no message can ever reach
                // this position, so there is no next message to await — and a retry would re-derive
                // the same closed truth, so the ladder cannot help. Refuse permanently, naming the
                // verdicts that are available, rather than enqueueing a receiver that would be born
                // holding the closing signal and demand a conclusion from a handler that already
                // declined to give one.
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

                // An ordinary successful step that happens to leave the exchange open. It advances
                // nothing: the task concludes on a later message, or on the closing signal.
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.AwaitNextMessage(
                        mailbox.Id,
                        serviceTaskType,
                        mailbox.Seq
                    ),
                };

            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // Concludes the exchange, in this message's words. The close still happens — an
                // exchange the app has given up on must stop accepting messages — but nothing
                // downstream starts, and the receive workflow fails so the transition reads as
                // failed for the user and for ops.
                //
                // Deliberately no RecordMailboxConcluded: a failing callback publishes no blob at all
                // (the controller neither saves nor captures on this path), so there is nothing for
                // the carry to un-say. It needs no key either — closing is not a keyed call.
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException",
                    new MailboxContinuation.Conclude(mailbox.Id)
                );

            case ServiceTaskFailedResult failed:
                // Retryable: the saga has not started. Nothing is closed, nothing is enqueued, and
                // the next attempt is handed the same message — so the handler may still reach any
                // verdict. A handler that will reach this one every time holds the exchange open
                // until the mailbox's deadline instead.
                return FailedProcessEngineCommandResult.Retryable(
                    $"Service task '{serviceTaskType}' failed: {failed.ErrorMessage}",
                    "ServiceTaskFailedException"
                );

            case ServiceTaskDeferredResult deferred:
                // A deferral is stateless and changes nothing about the exchange: the receiver parks,
                // stays a collection head, and re-runs against the same frozen message.
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
    /// Refuses a verdict that would make a keyed engine call when the engine supplied no step id to
    /// key it on; <c>null</c> when the id is usable.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <see cref="AppCallbackPayload.StepId"/> is deliberately not <c>required</c> — an engine
    /// predating the field leaves it <see cref="Guid.Empty"/> rather than failing the callback — and
    /// an empty id is a <em>constant</em>. Engine idempotency is scoped to
    /// <c>(namespace, key)</c> and the namespace is the whole application, so every exchange in the
    /// app would enqueue its successor under one key and its after-workflow under another: the first
    /// wins and every other exchange silently stalls with no successor, or never advances. That is
    /// the one place in this saga where a wrong key does cross-<em>exchange</em> damage instead of
    /// repeating work, so it is refused rather than deduplicated. Same shape and same argument as the
    /// mint's guard and the first receiver's.
    /// </para>
    /// <para>
    /// Narrow on purpose. Only the two verdicts that make a keyed call are refused; a conclusion that
    /// starts nothing (a permanent failure, or a success that does not advance the process) closes
    /// the mailbox and needs no key, and a retryable failure or a deferral touches nothing at all.
    /// Refusing those too would turn a working callback permanent for a key it never uses.
    /// </para>
    /// <para>
    /// It refuses before any continuation exists, so nothing is closed and nothing is enqueued; the
    /// receiver fails visibly for ops and the mailbox ages to its deadline, exactly as any other
    /// terminally failed receiver does. Inside <see cref="Continue"/> the same check could only
    /// throw, which the controller turns into a 500 and the engine retries forever.
    /// </para>
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

    /// <summary>
    /// Runs the saga for one handler verdict. Called once per receive-handler callback that reached a
    /// verdict, from the callback controller.
    /// </summary>
    public async Task Continue(MailboxContinuation continuation, MailboxRelayRequest request, CancellationToken ct)
    {
        switch (continuation)
        {
            case MailboxContinuation.AwaitNextMessage awaitNext:
                // Nothing is closed on this path, and nothing else is started: the exchange goes on,
                // and the one workflow this enqueues is what keeps the collection's frontier
                // non-empty once the executing receiver settles.
                await EnqueueSuccessorReceiver(awaitNext, request, ct);
                return;

            case MailboxContinuation.Conclude conclude:
                // Invariant 1, and the reason this method exists: the mailbox stops accepting
                // messages BEFORE anything downstream is allowed to start. Awaited, not fired: an
                // after-workflow enqueued first could run while a message was still landing in an
                // exchange the app considers over.
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
    /// <see cref="Commands.EnqueueReceiveWorkflow"/> gives the first one, because it is the same kind
    /// of workflow: one step, the pipeline's conclusion, declared against the same mailbox.
    /// </summary>
    private async Task EnqueueSuccessorReceiver(
        MailboxContinuation.AwaitNextMessage continuation,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        // The conclusion's own step options, resolved exactly as the factory resolves them for the
        // first receiver: the task's options with its Finally's on top. A null stage name is what
        // identifies the conclusion, here as everywhere else.
        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(continuation.ServiceTaskType)
            .ApplyStepOptions(_stepOptionsResolver, taskId, continuation.ServiceTaskType);

        // A callback token minted here, at this hop, rather than inherited. Together with the
        // re-signed state blob below this is what gives the relay per-hop credential freshness:
        // both are bound to whatever app code is current now, not to the one that opened the
        // exchange. The lock token, by contrast, is carried verbatim — see the type's remarks.
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
                    // The state the handler published, saved and re-signed — so the next handler sees
                    // what this one wrote, with Storage-assigned ids.
                    State = request.State,
                    // A head, so the exchange stays visible to everything that reads the collection's
                    // frontier; depending on no head, so neither the receiver that enqueued it nor a
                    // terminal head from an earlier transition gates a workflow whose only release is
                    // the rendezvous.
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
    /// The transition labels a successor receiver must carry — the same set the first receiver got,
    /// re-derived from the committed instance rather than from a transition this hop no longer has.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Not decoration. Two readers depend on them, and both are load-bearing for this design:
    /// <c>ResolveWorkflowTaskStatus</c> takes the task it annotates a read with from
    /// <c>processNextTargetTask</c> on the matching head, so a receiver without it reports a failed
    /// exchange with no target task at all; and <c>ListCurrentTaskProcessNextWorkflows</c> — the
    /// first hop of <c>GetCurrentTaskWorkflowState</c>, which is what every process action asks
    /// before it starts — <em>finds</em> the instance's collection by filtering on
    /// <c>processNextSourceId</c>/<c>processNextTargetId</c>. A successor carrying neither is
    /// invisible to that filter, so once the earlier workflows of the transition are purged by
    /// retention the lookup finds no collection key, answers <c>Unblocked</c>, and downstream work
    /// starts on top of an open exchange. Shipped defaults keep that out of reach (a mailbox cannot
    /// outlive 21 days, retention is 60), but the frontier invariant must not rest on two settings
    /// agreeing.
    /// </para>
    /// <para>
    /// A receiver runs only while the instance sits on the service task, so the task it is a receiver
    /// for <em>is</em> the instance's current task, and both target labels are exact.
    /// <c>processNextSourceId</c> — the task the transition left — is genuinely unrecoverable here
    /// and is deliberately omitted: it exists so a workflow can be found by the task it departs from,
    /// which is a lookup no receiver is ever the answer to.
    /// </para>
    /// </remarks>
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
    /// Enqueues the workflow that advances the process past the service task the exchange belonged
    /// to — the ordinary auto-advance workflow, with the relay's own idempotency key.
    /// </summary>
    private Task EnqueueAfterWorkflow(MailboxRelayRequest request, CancellationToken ct) =>
        _processEngine.EnqueueProcessNext(
            request.Instance,
            request.Payload.Actor,
            request.Payload.LockToken,
            request.Payload.WorkflowId,
            // Derived rather than read from the callback's Collection-Key header: the key algorithm
            // has one source of truth, and a header the engine forgot to send must not decide
            // whether a concluded exchange advances the process.
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
/// Everything the relay needs that is not the verdict itself: who the callback is for, what it
/// published, and whether the process should advance once the exchange is over.
/// </summary>
internal readonly record struct MailboxRelayRequest
{
    /// <summary>The app the exchange belongs to.</summary>
    public required AppIdentifier AppId { get; init; }

    /// <summary>The instance the exchange belongs to.</summary>
    public required InstanceIdentifier InstanceId { get; init; }

    /// <summary>
    /// The callback being answered — the source of the actor, the lock token, the workflow the
    /// after-workflow depends on, and the step id every enqueue key is derived from.
    /// </summary>
    public required AppCallbackPayload Payload { get; init; }

    /// <summary>
    /// The instance as the handler left it — the current task the successor's step options resolve
    /// against, and the process state the after-workflow's transition is computed from.
    /// </summary>
    public required Instance Instance { get; init; }

    /// <summary>
    /// The state blob the handler published: saved, re-captured and re-signed. <c>null</c> only on a
    /// conclusion that failed permanently, which saves nothing and starts nothing.
    /// </summary>
    public required string? State { get; init; }

    /// <summary>Whether a concluded exchange should advance the process.</summary>
    public required bool AutoAdvanceProcess { get; init; }

    /// <summary>The action to advance with, when it does.</summary>
    public required string? AutoAdvanceAction { get; init; }
}
