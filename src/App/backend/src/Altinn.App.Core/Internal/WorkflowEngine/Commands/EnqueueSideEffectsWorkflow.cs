using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the EnqueueSideEffectsWorkflow command: the pre-assembled enqueue request for
/// the transition's fire-and-forget side-effects workflow. Assembled by
/// <c>ProcessNextRequestFactory</c> at Main-enqueue time (steps, operation id, labels, context incl.
/// callback token); the command injects the runtime-only values when it executes — the commit-time
/// state blob and a link back to the Main workflow.
/// </summary>
internal sealed record EnqueueSideEffectsWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// Critical post-commit command that enqueues the transition's side-effects workflow. It runs
/// immediately after <see cref="SaveProcessStateToStorage"/>, so the side-effects workflow exists
/// if and only if the transition committed — a transition that never committed schedules no side
/// effects, and a committed transition's side effects survive whatever happens to the Main workflow
/// afterwards (a post-commit failure, an abandon) because the enqueued workflow is an independent
/// root carrying its own state.
///
/// The enqueued workflow starts from the commit-time state blob (this step's own StateIn — the
/// exact state the transition committed), is invisible to the collection heads frontier
/// (<c>IsHead = false</c>, <c>DependsOnHeads = false</c>), and is linked (not dependency-bound) to
/// the Main workflow for ops traversal. The enqueue is idempotent per Main workflow: retries of
/// this step dedup on the derived idempotency key.
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
        if (payload.EnqueueRequest.Workflows.Count != 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{Key} expects exactly one workflow in the pre-assembled enqueue request, got {payload.EnqueueRequest.Workflows.Count}",
                "InvalidPayloadException"
            );
        }

        try
        {
            WorkflowRequest sideEffectsWorkflow = payload.EnqueueRequest.Workflows[0] with
            {
                // The state this step executed with is the committed transition's state blob - the
                // callback controller rejects a missing state before any command runs.
                State = context.Payload.State,
                Links = [WorkflowRef.FromDatabaseId(context.Payload.WorkflowId)],
            };

            await workflowEngineClient.EnqueueWorkflows(
                ns: $"{context.AppId.Org}/{context.AppId.App}",
                // Deterministic per Main workflow: step retries dedup, and a superseding transition
                // (new Main workflow) gets its own key.
                idempotencyKey: CreateIdempotencyKey(context.Payload.WorkflowId),
                collectionKey: ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
                request: payload.EnqueueRequest with
                {
                    Workflows = [sideEffectsWorkflow],
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
