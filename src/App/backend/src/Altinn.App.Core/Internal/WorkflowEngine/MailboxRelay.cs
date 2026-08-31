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
/// anything downstream starts; at most one execution concludes per exchange (structural, via
/// <see cref="MailboxContinuation"/>); and each step performs <strong>at most one</strong> idempotency-keyed
/// enqueue — which one is decided by the verdict, and verdicts are deterministic per the handler contract —
/// so the bare <see cref="AppCallbackPayload.StepId"/> is the whole key. Every enqueue lands as a collection
/// head from inside the still-unsettled step that asked for it — a receiver's or a stage's — keeping the
/// frontier non-empty from the moment a mailbox exists until the task concludes.
/// </summary>
/// <remarks>
/// Nothing here resolves a service task or its pipeline: what a hop starts was decided, and planned, by the
/// verdict that produced its <see cref="MailboxContinuation"/>. The options resolver does its own lookups
/// from each step's identity.
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
    /// Maps the completion of a segment's last stage to the continuation that starts the exchange's receive
    /// leg. The <see cref="MailboxReceivePlan"/> was fixed at assembly time and never re-derived: the
    /// receiver must answer the exchange this expansion minted, not whatever sits at that index when the
    /// step runs. The mailbox is read from the carry here, where a missing entry can still fail the step
    /// legibly.
    /// </summary>
    internal static ProcessEngineCommandResult DecideSegmentEnd(
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry,
        MailboxReceivePlan receive
    )
    {
        if (StepIdMissing(stepId, serviceTaskType, "enqueue the exchange's first receiver") is { } noKey)
        {
            return noKey;
        }

        // Carried in the state blob because the mint's key is the mint step's own step id, which nothing later
        // can re-derive. Looked up by index, so a second carried mailbox is no obstacle.
        if (carry.FindMailbox(receive.OpeningStageIndex) is not { } carried)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"This service task's exchange is opened by the stage at index {receive.OpeningStageIndex}, but "
                    + "no mailbox id for it reached this step in the workflow state. The mint step that runs "
                    + "before that stage records the id; a step between the two must have dropped it.",
                "MailboxIdMissingFromState"
            );
        }

        return new SuccessfulProcessEngineCommandResult
        {
            MailboxContinuation = new MailboxContinuation.AwaitFirstMessage(
                carried.Id,
                serviceTaskType,
                receive.HandlerItemIndex,
                receive.OpeningStageIndex
            ),
        };
    }

    /// <summary>
    /// Maps a mailbox-opening stage's completion when the exchange's handler is <em>not</em> what follows it:
    /// such a stage is still its workflow's last step, so the items composed after it ride a continuation this
    /// completion enqueues. Nothing closes — neither this stage's exchange nor an earlier one's. The segment is
    /// planned here, from the same resolution dispatch ran the stage from, for the reason
    /// <see cref="DecideSegment"/> plans its empty case here: a reshape that leaves this hop nothing to start
    /// must fail legibly at the verdict rather than throw from the relay tail, where the retry would re-run
    /// the send on every attempt.
    /// </summary>
    internal static ProcessEngineCommandResult DecideOpeningStageEnd(
        string serviceTaskType,
        Guid stepId,
        int openingStageIndex,
        ServiceTaskPipeline pipeline
    )
    {
        if (StepIdMissing(stepId, serviceTaskType, "start the pipeline's next segment") is { } noKey)
        {
            return noKey;
        }

        // An opening stage contributes its own mint and stage step, so an empty plan here means the item after
        // this stage is a reply handler — which it was not when this step was assembled, since the assembly
        // would then have baked that exchange into this step's payload and taken the DecideSegmentEnd route.
        ServiceTaskSegmentPlan nextSegment = WorkflowCommandSet.PlanSegment(
            serviceTaskType,
            pipeline,
            afterItemIndex: openingStageIndex
        );
        if (nextSegment.Steps.Count == 0)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' composes no step between the stage at index "
                    + $"{openingStageIndex} and the reply handler that now follows it, so completing that stage "
                    + "starts nothing. The pipeline was reshaped since this workflow was enqueued, when the "
                    + "stage handed over to a segment of its own. Resume the workflow on the code that "
                    + "enqueued it, or abandon it deliberately — its mailbox stays open until its deadline, "
                    + "and can be closed by hand if the exchange is no longer wanted.",
                "PipelineSegmentNotFound"
            );
        }

        return new SuccessfulProcessEngineCommandResult
        {
            MailboxContinuation = new MailboxContinuation.ContinueAfterStage(
                serviceTaskType,
                new MailboxHandover.NextSegment(openingStageIndex, nextSegment)
            ),
        };
    }

    /// <summary>
    /// Maps a mailbox-opening stage's conclusion of the whole task. A concluding verdict closes
    /// <em>every</em> mailbox the carry still holds — the task is over, so no exchange of its may keep
    /// accepting messages — before anything downstream starts; the wrapped verdicts that conclude nothing
    /// (retryable failure, deferral) act exactly as the stage vocabulary's own members and close nothing.
    /// </summary>
    internal static ProcessEngineCommandResult DecideOpeningStageConclusion(
        ServiceTaskResult result,
        string serviceTaskType,
        Guid stepId,
        WorkflowCallbackStateCarry carry
    )
    {
        switch (result)
        {
            case ServiceTaskFailedResult { Kind: FailureKind.Permanent } failed:
                // A failing callback publishes no blob, so there is nothing for the carry to un-say.
                return FailedProcessEngineCommandResult.Permanent(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode,
                    new MailboxContinuation.Conclude([.. carry.FindAllMailboxes().Select(m => m.Mailbox.Id)])
                );

            case ServiceTaskFailedResult failed:
                // The saga has not started; the next attempt re-runs the stage.
                return FailedProcessEngineCommandResult.Retryable(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode
                );

            case ServiceTaskDeferredResult deferred:
                return new DeferredProcessEngineCommandResult { Delay = deferred.Delay, Reason = deferred.Reason };

            case ServiceTaskSuccessResult { AutoAdvanceProcess: true }
                when StepIdMissing(stepId, serviceTaskType, "start the workflow that follows the conclusion")
                    is { } noAfterKey:
                return noAfterKey;

            case ServiceTaskSuccessResult success:
                IReadOnlyList<(int StageIndex, CarriedMailbox Mailbox)> carried = carry.FindAllMailboxes();
                // Dropped from the carry here, before the state is captured, so the blob this callback
                // publishes carries no exchange the conclusion just closed.
                foreach ((int stageIndex, _) in carried)
                {
                    carry.RecordMailboxConcluded(stageIndex);
                }

                return new SuccessfulProcessEngineCommandResult
                {
                    AutoAdvanceProcess = success.AutoAdvanceProcess,
                    AutoAdvanceAction = success.Action,
                    MailboxContinuation = new MailboxContinuation.Conclude([.. carried.Select(m => m.Mailbox.Id)]),
                };

            // Reached by the route Decide's last arm documents; answered the same way.
            default:
                return FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' concluded from its mailbox-opening stage with a result "
                        + $"of type '{result.GetType().Name}', which this version of the app-lib cannot act "
                        + "on. A conclusion must carry one of the results the factory methods produce — "
                        + $"{nameof(ServiceTaskResult.Success)}, "
                        + $"{nameof(ServiceTaskResult.SuccessWithoutAutoAdvance)}, "
                        + $"{nameof(ServiceTaskResult.FailedRetryable)}, "
                        + $"{nameof(ServiceTaskResult.FailedPermanent)} or "
                        + $"{nameof(ServiceTaskResult.Defer)} — never a type of its own.",
                    "ServiceTaskResultUnknown"
                );
        }
    }

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
                    new MailboxContinuation.Conclude([mailbox.Id])
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
                    MailboxContinuation = new MailboxContinuation.Conclude([mailbox.Id]),
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
    /// <c>Success(action)</c> back within reach of a handler that must not have it. A concluding verdict
    /// plans the next segment from <paramref name="pipeline"/> — the same resolution dispatch just ran the
    /// handler from — because a segment with no steps of its own needs its exchange's mailbox resolved from
    /// the carry <em>here</em>, where a missing entry can still fail the verdict legibly.
    /// </summary>
    internal static ProcessEngineCommandResult DecideSegment(
        ServiceTaskStageExchangeResult result,
        string serviceTaskType,
        Guid stepId,
        AppCallbackMailbox mailbox,
        WorkflowCallbackStateCarry carry,
        int handlerItemIndex,
        int openingStageIndex,
        ServiceTaskPipeline pipeline
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
                ServiceTaskSegmentPlan nextSegment = WorkflowCommandSet.PlanSegment(
                    serviceTaskType,
                    pipeline,
                    afterItemIndex: handlerItemIndex
                );

                MailboxHandover handover;
                if (nextSegment.Steps.Count > 0)
                {
                    // The plan travels as it was made: the enqueue hop applies step options to it and never
                    // plans again.
                    handover = new MailboxHandover.NextSegment(handlerItemIndex, nextSegment);
                }
                else
                {
                    // PlanSegment ends every segment on an exchange or on the conclusion's own step, so an
                    // empty segment always names an exchange.
                    MailboxReceivePlan receive =
                        nextSegment.Receive
                        ?? throw new UnreachableException("An empty segment plan must name the exchange it ends on.");

                    // Only up-front sends produce an empty segment, so the next exchange's mint ran in an
                    // earlier segment and its entry provably travels in the carry unless the carry broke.
                    if (carry.FindMailbox(receive.OpeningStageIndex) is not { } nextCarried)
                    {
                        // Refused before anything is recorded: the exchange is untouched, so a resume
                        // replays this handler.
                        return FailedProcessEngineCommandResult.Permanent(
                            $"The pipeline's next exchange is opened by the stage at index "
                                + $"{receive.OpeningStageIndex}, but no mailbox id for it reached this step in "
                                + "the workflow state. The mint step that runs before that stage records the "
                                + "id; a step between the two must have dropped it.",
                            "MailboxIdMissingFromState"
                        );
                    }

                    handover = new MailboxHandover.FirstReceiver(
                        nextCarried.Id,
                        receive.HandlerItemIndex,
                        receive.OpeningStageIndex
                    );
                }

                // Dropped from the carry here, before the state is captured, so the continuation and everything
                // after it carry only the exchanges still open.
                carry.RecordMailboxConcluded(openingStageIndex);
                return new SuccessfulProcessEngineCommandResult
                {
                    MailboxContinuation = new MailboxContinuation.ConcludeAndContinue(
                        mailbox.Id,
                        serviceTaskType,
                        handover
                    ),
                };

            case FailedServiceTaskStageResult { Kind: FailureKind.Permanent } failed:
                // Later mailboxes already open are left alone: closing them would sabotage a resume, which
                // replays this handler and may then carry the chain on.
                return FailedProcessEngineCommandResult.Permanent(
                    ExecuteServiceTask.FailedMessage(serviceTaskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailedReasonCode,
                    new MailboxContinuation.Conclude([mailbox.Id])
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
    /// <c>MailboxStepIdMissing</c>, for the keyed verdicts only: the bare step id is the whole idempotency
    /// key, engine idempotency is scoped to <c>(namespace, key)</c>, and an empty id is a constant — so
    /// every exchange in the application would collapse onto one enqueued workflow. Verdicts that make no
    /// keyed call are not refused.
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
            case MailboxContinuation.AwaitFirstMessage first:
                await EnqueueReceiver(
                    first.MailboxId,
                    first.ServiceTaskType,
                    first.HandlerItemIndex,
                    operationIdSuffix: first.OpeningStageIndex.ToString(CultureInfo.InvariantCulture),
                    request,
                    ct
                );
                return;

            case MailboxContinuation.AwaitNextMessage awaitNext:
                await EnqueueReceiver(
                    awaitNext.MailboxId,
                    awaitNext.ServiceTaskType,
                    awaitNext.HandlerItemIndex,
                    operationIdSuffix: "after message " + awaitNext.Position.ToString(CultureInfo.InvariantCulture),
                    request,
                    ct
                );
                return;

            case MailboxContinuation.ContinueAfterStage afterStage:
                await EnqueueContinuation(afterStage.ServiceTaskType, afterStage.Segment, request, ct);
                return;

            case MailboxContinuation.Conclude conclude:
                // Invariant 1: every named mailbox stops accepting messages before anything downstream
                // starts. Sequential on purpose — the count is the task's open exchanges, and a close must
                // not race the after-workflow.
                foreach (Guid mailboxId in conclude.MailboxIds)
                {
                    await _workflowEngineClient.CloseMailbox(GetNamespace(request.AppId), mailboxId, ct);
                }

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
                await HandOver(continuing.Handover, continuing.ServiceTaskType, request, ct);
                return;

            default:
                throw new UnreachableException($"Unknown mailbox continuation type: {continuation.GetType().Name}");
        }
    }

    /// <summary>
    /// Starts whatever the deciding hop said follows the item it ran: the segment it planned, or — when that
    /// segment had no steps of its own — the next exchange's first receiver, which <em>is</em> the pipeline's
    /// continuation then. Only reached after the closure its caller performs.
    /// </summary>
    private Task HandOver(
        MailboxHandover handover,
        string serviceTaskType,
        MailboxRelayRequest request,
        CancellationToken ct
    ) =>
        handover switch
        {
            MailboxHandover.NextSegment segment => EnqueueContinuation(serviceTaskType, segment, request, ct),
            MailboxHandover.FirstReceiver receiver => EnqueueReceiver(
                receiver.MailboxId,
                serviceTaskType,
                receiver.HandlerItemIndex,
                operationIdSuffix: receiver.OpeningStageIndex.ToString(CultureInfo.InvariantCulture),
                request,
                ct
            ),
            _ => throw new UnreachableException($"Unknown mailbox handover type: {handover.GetType().Name}"),
        };

    /// <summary>
    /// One receive workflow, first receiver and successors alike: a single step naming the handler by its
    /// item index, parked on the exchange's mailbox, enqueued as a head that depends on the current head —
    /// the still-unsettled step running this relay — so the exchange stays visible to the frontier and a
    /// failed hop condemns everything downstream. Keyed on the bare executing step id, per the invariant on
    /// this class.
    /// </summary>
    private async Task EnqueueReceiver(
        Guid mailboxId,
        string serviceTaskType,
        int handlerItemIndex,
        string operationIdSuffix,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        StepRequest receiveStep = WorkflowCommandSet
            .CreateReceiveHandlerStep(serviceTaskType, handlerItemIndex)
            .ApplyStepOptions(_stepOptionsResolver, taskId, serviceTaskType);

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
                        $"{ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix} {taskId} · {operationIdSuffix}",
                    Steps = [receiveStep],
                    Mailbox = new MailboxReference { Id = mailboxId },
                    State = request.State,
                    IsHead = true,
                    DependsOnHeads = true,
                },
            ],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: request.Payload.StepId.ToString(),
            collectionKey: ProcessNextRequestFactory.CreateCollectionKey(request.InstanceId),
            request: enqueueRequest,
            ct: ct
        );
    }

    /// <summary>
    /// The pipeline's next segment, as one workflow: the plan the deciding hop made, carried here whole and
    /// enqueued — the items composed after the one that hop ran (the reply handler that concluded its
    /// exchange, or the mailbox-opening stage that ended its own workflow), ended by the step whose completion
    /// enqueues the next exchange's first receiver or the next segment, or by the pipeline's conclusion when
    /// nothing is left. This hop resolves nothing about the pipeline: the plan is authoritative, and the only
    /// thing left to do to it is resolve each step's options, which the resolver does from the step's own
    /// identity.
    /// </summary>
    private async Task EnqueueContinuation(
        string serviceTaskType,
        MailboxHandover.NextSegment segment,
        MailboxRelayRequest request,
        CancellationToken ct
    )
    {
        string? taskId = request.Instance.Process?.CurrentTask?.ElementId;

        List<StepRequest> steps =
        [
            .. segment.Plan.Steps.ApplyStepOptions(_stepOptionsResolver, taskId, serviceTaskType),
        ];

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
                    // Named for the item it follows: with an opening stage ending a run too, an exchange's
                    // opening index no longer tells two continuations apart.
                    OperationId =
                        $"{ProcessNextRequestFactory.MailboxContinueOperationIdPrefix} {taskId} · after "
                        + segment.AfterItemIndex.ToString(CultureInfo.InvariantCulture),
                    Steps = steps,
                    State =
                        request.State
                        ?? throw new InvalidOperationException(
                            "A hop that continues the pipeline must carry the state the step it ran published."
                        ),
                    IsHead = true,
                    DependsOnHeads = true,
                },
            ],
        };

        await _workflowEngineClient.EnqueueWorkflows(
            ns: GetNamespace(request.AppId),
            idempotencyKey: request.Payload.StepId.ToString(),
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
            request.Payload.StepId.ToString(),
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
