using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Extensions;

internal static class WorkflowRequestExtensions
{
    /// <summary>
    /// Creates a domain <see cref="Workflow"/> from a <see cref="WorkflowRequest"/>,
    /// server-computed <see cref="WorkflowRequestMetadata"/>, and shared enqueue-level fields.
    /// Namespace is normalized at this boundary before persistence.
    /// </summary>
    public static Workflow ToWorkflow(
        this WorkflowRequest workflowRequest,
        WorkflowRequestMetadata metadata,
        WorkflowEnqueueRequest enqueueRequest
    )
    {
        var idempotencyKey = metadata.IdempotencyKey;

        return new Workflow
        {
            DatabaseId = Guid.CreateVersion7(),
            CorrelationId = metadata.CorrelationId,
            OperationId = workflowRequest.OperationId,
            IdempotencyKey = idempotencyKey,
            Namespace = WorkflowNamespace.Normalize(metadata.Namespace),
            CreatedAt = metadata.CreatedAt,
            StartAt = workflowRequest.StartAt,
            BackoffUntil = workflowRequest.StartAt,
            Status = PersistentItemStatus.Enqueued,
            Labels = enqueueRequest.Labels,
            Context = enqueueRequest.Context,
            DistributedTraceContext = metadata.TraceContext,
            InitialState = workflowRequest.State,
            Steps = workflowRequest
                .Steps.Select(
                    (s, i) =>
                        new Step
                        {
                            DatabaseId = Guid.CreateVersion7(),
                            OperationId = s.OperationId,
                            Status = PersistentItemStatus.Enqueued,
                            CreatedAt = metadata.CreatedAt,
                            ProcessingOrder = i,
                            Command = s.Command,
                            RetryStrategy = s.RetryStrategy,
                            Labels = s.Labels,
                        }
                )
                .ToList(),
        };
    }
}
