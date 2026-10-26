using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the transition's auxiliary workflows (one single-step
/// workflow per auxiliary command), built by <c>ProcessNextRequestFactory</c> when it enqueues the
/// transition's primary workflow. The command fills in runtime authentication, the commit-time state
/// blob and a link back to the primary workflow on execution. Authentication stays out of the parent's
/// hashed command payload.
/// </summary>
internal sealed record EnqueueAuxiliaryWorkflowsPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// Primary post-commit command that enqueues the transition's auxiliary workflows — one
/// independent single-step workflow per auxiliary command, submitted as a single atomic batch. Runs
/// immediately after <see cref="CommitProcessState"/>, so the auxiliary workflows exist if and
/// only if the transition committed — and, as independent roots each carrying their own
/// commit-time state, they survive whatever happens to the primary workflow afterwards and fail
/// independently of each other. Idempotent per primary workflow: the derived idempotency key covers
/// the whole batch, so step retries dedup.
/// </summary>
internal sealed class EnqueueAuxiliaryWorkflows(
    IWorkflowEngineClient workflowEngineClient,
    IWorkflowCallbackTokenGenerator callbackTokenGenerator
) : WorkflowEngineCommandBase<EnqueueAuxiliaryWorkflowsPayload>
{
    public static string Key => "EnqueueAuxiliaryWorkflows";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        EnqueueAuxiliaryWorkflowsPayload payload
    )
    {
        if (payload.EnqueueRequest.Workflows.Count == 0)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{Key} expects at least one workflow in the pre-assembled enqueue request, got none",
                "InvalidPayloadException"
            );
        }

        try
        {
            List<WorkflowRequest> auxiliaryWorkflows = payload
                .EnqueueRequest.Workflows.Select(workflow =>
                    workflow with
                    {
                        // The state this step executed with is the committed transition's state
                        // blob - the callback controller rejects a missing state before any
                        // command runs.
                        State = context.Payload.State,
                        Links = [WorkflowRef.FromDatabaseId(context.Payload.WorkflowId)],
                    }
                )
                .ToList();

            await workflowEngineClient.EnqueueWorkflows(
                ns: $"{context.AppId.Org}/{context.AppId.App}",
                // Deterministic per primary workflow and covering the whole sibling batch (the
                // engine's batch enqueue is atomic): step retries dedup, and a superseding
                // transition (new primary workflow) gets its own key.
                idempotencyKey: CreateIdempotencyKey(context.Payload.WorkflowId),
                collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                request: payload.EnqueueRequest with
                {
                    Context = JsonSerializer.SerializeToElement(
                        new AppWorkflowContext
                        {
                            Actor = context.Payload.Actor,
                            Org = context.AppId.Org,
                            App = context.AppId.App,
                            InstanceOwnerPartyId = context.InstanceId.InstanceOwnerPartyId,
                            InstanceGuid = context.InstanceId.InstanceGuid,
                            CallbackToken = callbackTokenGenerator.GenerateToken(
                                context.InstanceId.InstanceGuid,
                                context.Payload.Actor,
                                auxiliaryWorkflows
                            ),
                        }
                    ),
                    Workflows = auxiliaryWorkflows,
                },
                cancellationToken: context.CancellationToken
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    internal static string CreateIdempotencyKey(Guid primaryWorkflowId) => $"{primaryWorkflowId}:auxiliary";
}
