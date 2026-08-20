using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the first receive workflow of a service task that opens a mailbox,
/// built by <c>ProcessNextRequestFactory</c> at Main-enqueue time. The command fills in the three values that
/// only exist at execution: which mailbox to receive from, the state blob to start the receiver on, and a
/// callback token minted now rather than at the transition's enqueue.
/// </summary>
internal sealed record EnqueueReceiveWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// The last step of the Main workflow for a service task that opens a mailbox: it enqueues the task's first
/// <em>receive workflow</em> — the workflow whose single step is the pipeline's conclusion, run once against
/// one message from the mailbox (or against the fact that none can come).
/// </summary>
/// <remarks>
/// It is a step of Main, and the last one, on purpose: the receiver exists before Main settles, so the
/// instance's collection never reads all-settled while the exchange is open — the frontier-never-empty property
/// everything gating on the collection depends on without knowing mailboxes exist. The receiver is enqueued as
/// a collection <em>head</em> that depends on no head, so it joins the frontier without being condemned by a
/// terminal head an earlier transition left behind or waiting on Main. It deliberately carries no <c>links</c>
/// edge back to Main: a receiver shares the instance's collection key and the transition's labels, so an edge
/// would buy no reachability.
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

        // The mailbox the declaring stage minted, carried here in the state blob because the mint's key is that
        // stage's step id and nothing later can re-derive it. Missing means the stage never completed, which
        // cannot happen — it is an earlier step of this same workflow — so retrying would only repeat.
        if (context.StateCarry.MailboxId is not { } mailboxId)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "This service task opens a mailbox, but no mailbox id reached this step in the workflow state. "
                    + "The stage that opens it records the id when it mints; a step between the two must have "
                    + "dropped it.",
                "MailboxIdMissingFromState"
            );
        }

        // Saga rule: every engine call made from inside a callback is keyed off the executing step, so a crashed
        // attempt's replay deduplicates instead of enqueueing a second receiver. An empty step id is a constant,
        // which would collapse every receive enqueue in this namespace onto one workflow.
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
            // A token minted here rather than reused from the Main workflow's context. It rarely differs — the
            // signing code is selected in configuration order, so minting seconds later usually picks the same one
            // — and it could not save the receiver anyway, since the state blob below was signed by the previous
            // step's code and dies with it. What minting per enqueue is genuinely for is the relay: each hop's
            // receiver is enqueued from inside the previous hop's callback and draws from whatever code is
            // current then. Receiver 1's viability is therefore bounded by the signing code's ExpiresAt rather
            // than by the mailbox's deadline — the general property of any parked workflow, set out under Key
            // Design Constraints in Internal/WorkflowEngine/AGENTS.md.
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
                // The state this step executed with, which already carries the mailbox id.
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
            // Retryable, and the step stays unfinished until it succeeds: Main must not complete having published a
            // reply address that nothing is listening on.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    internal static string CreateIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-receive";
}
