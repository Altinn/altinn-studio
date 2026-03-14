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
        var idempotencyKey = enqueueRequest.IdempotencyKey;

        return new Workflow
        {
            DatabaseId = Guid.CreateVersion7(),
            CorrelationId = metadata.CorrelationId ?? enqueueRequest.CorrelationId,
            OperationId = workflowRequest.OperationId,
            IdempotencyKey = idempotencyKey,
            Namespace = WorkflowNamespace.Normalize(enqueueRequest.Namespace),
            CreatedAt = metadata.CreatedAt,
            StartAt = workflowRequest.StartAt,
            BackoffUntil = workflowRequest.StartAt,
            Status = PersistentItemStatus.Enqueued,
            Labels = enqueueRequest.Labels,
            Context = enqueueRequest.Context,
            DistributedTraceContext = metadata.TraceContext,
            Metadata = workflowRequest.Metadata,
            InitialState = workflowRequest.State,
            Steps = workflowRequest
                .Steps.Select(
                    (s, i) =>
                        new Step
                        {
                            DatabaseId = Guid.CreateVersion7(),
                            OperationId = s.OperationId,
                            IdempotencyKey = $"{idempotencyKey}/{s.OperationId}",
                            Status = PersistentItemStatus.Enqueued,
                            CreatedAt = metadata.CreatedAt,
                            ProcessingOrder = i,
                            Command = s.Command,
                            RetryStrategy = s.RetryStrategy,
                            Metadata = s.Metadata,
                        }
                )
                .ToList(),
        };
    }
}
