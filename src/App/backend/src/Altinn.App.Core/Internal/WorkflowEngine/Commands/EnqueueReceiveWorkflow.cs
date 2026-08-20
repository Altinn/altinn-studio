using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the first receive workflow of a service task that opens a
/// mailbox, built by <c>ProcessNextRequestFactory</c> at Main-enqueue time. The command fills in the
/// three values that only exist at execution: which mailbox to receive from, the state blob to start
/// the receiver on, and a callback token minted now rather than at the transition's enqueue.
/// </summary>
internal sealed record EnqueueReceiveWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// The last step of the Main workflow for a service task that opens a mailbox: it enqueues the task's
/// first <em>receive workflow</em> — the workflow whose single step is the pipeline's conclusion, run
/// once against one message from the mailbox (or against the fact that none can come).
/// </summary>
/// <remarks>
/// <para>
/// It is a step of Main, and the last one, on purpose. The receiver exists before Main settles, so at
/// no instant does the instance's collection read all-settled while the exchange is open — the
/// frontier-never-empty property everything that gates on the collection (the process-next wait,
/// the read-path status annotation, auto-advance) depends on without knowing mailboxes exist. Doing
/// it after Main settled, or from outside a step, would open exactly the window in which downstream
/// work runs early.
/// </para>
/// <para>
/// The receiver is enqueued as a collection <em>head</em> that depends on no head: it must join the
/// frontier, and it must not be condemned by a terminal head an earlier transition left behind, nor
/// wait on Main — the rendezvous alone decides when it runs.
/// </para>
/// <para>
/// It deliberately carries <strong>no <c>links</c> edge back to Main</strong>, unlike the side-effects
/// workflows its sibling command enqueues. Those need one because they are invisible to the collection
/// (<c>IsHead = false</c>) and would otherwise be unreachable from the transition that produced them; a
/// receiver shares the instance's collection key and the transition's labels, and the engine's
/// dashboard already renders it under its own mailbox. The mailbox design's ledger counts every edge it
/// removed, so an edge that buys no reachability is not added back.
/// </para>
/// </remarks>
internal sealed class EnqueueReceiveWorkflow(
    IWorkflowEngineClient workflowEngineClient,
    IWorkflowCallbackTokenGenerator callbackTokenGenerator
) : WorkflowEngineCommandBase<EnqueueReceiveWorkflowPayload>
{
    public static string Key => "EnqueueReceiveWorkflow";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        EnqueueReceiveWorkflowPayload payload
    )
    {
        if (payload.EnqueueRequest.Workflows.Count != 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{Key} expects exactly one receive workflow in the pre-assembled enqueue request, got "
                    + $"{payload.EnqueueRequest.Workflows.Count}",
                "InvalidPayloadException"
            );
        }

        // The mailbox the declaring stage minted, carried here in the state blob because the mint's key
        // is that stage's step id and nothing later can re-derive it. Missing means the stage never
        // completed successfully, which cannot happen — it is an earlier step of this same workflow —
        // so this is a broken carry rather than a slow one, and retrying it would only repeat.
        if (context.StateCarry.MailboxId is not { } mailboxId)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "This service task opens a mailbox, but no mailbox id reached this step in the workflow state. "
                    + "The stage that opens it records the id when it mints; a step between the two must have "
                    + "dropped it.",
                "MailboxIdMissingFromState"
            );
        }

        // Saga rule: every engine call made from inside a callback is keyed off the executing step, so a
        // crashed attempt's replay deduplicates instead of enqueueing a second receiver at a second
        // position in the mailbox. An empty step id is a constant, which would instead collapse every
        // receive enqueue in this namespace onto one workflow.
        if (context.Payload.StepId == Guid.Empty)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "The workflow engine supplied no step id to key the receive workflow's enqueue on. An enqueue keyed "
                    + "on an empty id would be shared by every mailbox exchange in this application. Upgrade the "
                    + "workflow engine to a version that sends stepId.",
                "MailboxStepIdMissing"
            );
        }

        try
        {
            // A token minted here rather than reused from the Main workflow's context. Be clear about
            // what that does and does not buy: GenerateToken sets Expires to the *signing code's*
            // expiry, and GetSigningSecret returns the first non-expired code in configuration order,
            // so minting seconds after the transition's enqueue almost always selects the same code and
            // produces the same exp. It only differs across a rotation that lands inside one Main
            // workflow — and it could not save the receiver anyway, because the state blob below was
            // signed by the previous step's code and WorkflowStateSigner rejects it once that code
            // expires. Token and blob die together, by design.
            //
            // Receiver 1's viability is therefore bounded by the signing code's ExpiresAt, not by the
            // mailbox's deadline — and nothing checks that bound, here or at the mint. It is the general
            // property of any parked workflow, set out under Key Design Constraints in
            // Internal/WorkflowEngine/AGENTS.md: a callback arriving after the code expires 401s and
            // fails its workflow terminally on the first attempt, a mailbox receiver and a step
            // deferring past its own code's expiry alike.
            //
            // What minting per enqueue is genuinely for is the relay: each hop's receiver is enqueued
            // from inside the previous hop's callback, whenever that happens to run, and draws from
            // whatever code is current then.
            var receiveContext = new AppWorkflowContext
            {
                Actor = context.Payload.Actor,
                LockToken = context.Payload.LockToken,
                Org = context.AppId.Org,
                App = context.AppId.App,
                InstanceOwnerPartyId = context.InstanceId.InstanceOwnerPartyId,
                InstanceGuid = context.InstanceId.InstanceGuid,
                CallbackToken = callbackTokenGenerator.GenerateToken(context.InstanceId.InstanceGuid),
            };

            WorkflowRequest receiveWorkflow = payload.EnqueueRequest.Workflows[0] with
            {
                Mailbox = new MailboxReference { Id = mailboxId },
                // The state this step executed with — which already carries the mailbox id, so the
                // receiver's own handler can address the mailbox it is answering on.
                State = context.Payload.State,
            };

            await workflowEngineClient.EnqueueWorkflows(
                ns: $"{context.AppId.Org}/{context.AppId.App}",
                idempotencyKey: CreateIdempotencyKey(context.Payload.StepId),
                collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                request: payload.EnqueueRequest with
                {
                    Context = JsonSerializer.SerializeToElement(receiveContext),
                    Workflows = [receiveWorkflow],
                },
                ct: context.CancellationToken
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            // Retryable, and the step stays unfinished until it succeeds: Main must not complete having
            // published a reply address that nothing is listening on.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    internal static string CreateIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-receive";
}
