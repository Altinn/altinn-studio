using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the transition's side-effects workflows (one single-step
/// workflow per side effect), built by <c>ProcessNextRequestFactory</c> at Main-enqueue time. The
/// command fills in the runtime-only values on execution: the commit-time state blob and a link
/// back to the Main workflow, on every sibling.
/// </summary>
internal sealed record EnqueueSideEffectsWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// Critical post-commit command that enqueues the transition's side-effects workflows — one
/// independent single-step workflow per side effect, submitted as a single atomic batch. Runs
/// immediately after <see cref="SaveProcessStateToStorage"/>, so the side effects exist if and
/// only if the transition committed — and, as independent roots each carrying their own
/// commit-time state, they survive whatever happens to Main afterwards and fail independently of
/// each other. Idempotent per Main workflow: the derived idempotency key covers the whole batch,
/// so step retries dedup.
/// </summary>
internal sealed class EnqueueSideEffectsWorkflow(IWorkflowEngineClient workflowEngineClient)
    : WorkflowEngineCommandBase<EnqueueSideEffectsWorkflowPayload>
{
    public static string Key => "EnqueueSideEffectsWorkflow";

    public override string GetKey() => Key;

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        EnqueueSideEffectsWorkflowPayload payload
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
            List<WorkflowRequest> sideEffectWorkflows = payload
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
                // Deterministic per Main workflow and covering the whole sibling batch (the
                // engine's batch enqueue is atomic): step retries dedup, and a superseding
                // transition (new Main workflow) gets its own key.
                idempotencyKey: CreateIdempotencyKey(context.Payload.WorkflowId),
                collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                request: payload.EnqueueRequest with
                {
                    Workflows = sideEffectWorkflows,
                },
                ct: context.CancellationToken
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    internal static string CreateIdempotencyKey(Guid mainWorkflowId) => $"{mainWorkflowId}:side-effects";
}
