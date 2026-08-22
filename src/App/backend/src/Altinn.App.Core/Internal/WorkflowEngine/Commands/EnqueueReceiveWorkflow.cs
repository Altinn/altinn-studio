using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the first receive workflow, built at Main-enqueue time. The
/// command fills in the three execution-only values: the mailbox, the state blob, and a fresh callback
/// token.
/// </summary>
internal sealed record EnqueueReceiveWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// The last step of Main for a service task that opens a mailbox: enqueues the task's first
/// <em>receive workflow</em> — one step, the pipeline's conclusion, run once against one message.
/// </summary>
/// <remarks>
/// Last in Main on purpose: the receiver exists before Main settles, keeping the collection's frontier
/// non-empty for the whole exchange. Enqueued as a head that depends on no head, and with no <c>links</c>
/// edge back to Main — a receiver shares the collection key and labels, so an edge buys no reachability.
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

        // Carried in the state blob because the mint's key is the declaring stage's step id, which nothing later
        // can re-derive. The carry keys mailboxes by the stage that opened each; this step reads the sole entry
        // because a pipeline declares at most one mailbox and nothing tells this step which stage that was —
        // interim, until the payload names the opening stage. Either failure below is a broken carry, which
        // retrying only repeats.
        if (context.StateCarry.Mailboxes is not { Count: > 0 } carriedMailboxes)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "This service task opens a mailbox, but no mailbox id reached this step in the workflow state. "
                    + "The stage that opens it records the id when it mints; a step between the two must have "
                    + "dropped it.",
                "MailboxIdMissingFromState"
            );
        }

        // Redeploy drift: two stages of this one transition each minted a mailbox, which happens when the
        // declaration moved to a later stage while the workflow was in flight. Nothing here can tell which
        // exchange the receiver belongs to, and guessing would park it on the wrong address.
        if (carriedMailboxes.Count > 1)
        {
            string openedBy = string.Join(
                ", ",
                carriedMailboxes.Keys.Order(StringComparer.Ordinal).Select(stage => $"'{stage}'")
            );
            return FailedProcessEngineCommandResult.Permanent(
                $"This service task carries mailboxes opened by more than one stage ({openedBy}), so this step "
                    + "cannot tell which exchange the receive workflow answers. The mailbox declaration moved to "
                    + "another stage while this workflow was in flight: redeploy with it back on the stage that "
                    + "opened the exchange, and resume the workflow.",
                "MailboxAmbiguousInState"
            );
        }

        Guid mailboxId = carriedMailboxes.Values.Single().Id;

        // Saga rule: keyed off the executing step, so a crashed attempt's replay deduplicates. An empty step id
        // is a constant that would collapse every receive enqueue in the namespace onto one workflow.
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
            // Minted here for the relay's sake: each hop draws from whatever code is current then. It does not
            // extend receiver 1's life — the state blob is signed by the previous step's code and dies with it,
            // so viability is bounded by the signing code's expiry (see Internal/WorkflowEngine/AGENTS.md).
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
            // Retryable, and the step stays unfinished: Main must not complete having published a reply address
            // nothing is listening on.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    internal static string CreateIdempotencyKey(Guid stepId) => $"{stepId}:mailbox-receive";
}
