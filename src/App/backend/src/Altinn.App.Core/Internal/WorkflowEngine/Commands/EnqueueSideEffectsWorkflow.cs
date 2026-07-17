using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// The pre-assembled enqueue request for the transition's side-effects workflow, built by
/// <c>ProcessNextRequestFactory</c> at Main-enqueue time. The command fills in the runtime-only
/// values on execution: the commit-time state blob and a link back to the Main workflow.
/// </summary>
internal sealed record EnqueueSideEffectsWorkflowPayload(WorkflowEnqueueRequest EnqueueRequest) : CommandRequestPayload;

/// <summary>
/// Critical post-commit command that enqueues the transition's side-effects workflow. Runs
/// immediately after <see cref="SaveProcessStateToStorage"/>, so the side-effects workflow exists
/// if and only if the transition committed — and, as an independent root with its own commit-time
/// state, survives whatever happens to Main afterwards. Idempotent per Main workflow: step retries
/// dedup on the derived idempotency key.
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
