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
        WorkflowEnqueueRequest enqueueRequest,
        Dictionary<string, Guid> replyIdsByStepRef
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
            InitialState = workflowRequest.State,
            Steps = CreateSteps(workflowRequest.Steps, idempotencyKey, metadata, replyIdsByStepRef),
        };
    }

    private static Dictionary<string, Guid> CreateReplyIds(IReadOnlyList<StepRequest> stepRequests)
    {
        return stepRequests
            .Select(x => x.WaitForReplyFrom)
            .OfType<string>()
            .ToDictionary(name => name, _ => Guid.CreateVersion7());
    }

    private static List<Step> CreateSteps(
        IEnumerable<StepRequest> stepRequests,
        string idempotencyKey,
        WorkflowRequestMetadata metadata,
        Dictionary<string, Guid> replyIdsByStepRef
    )
    {
        var steps = new List<Step>();
        var processingOrder = 0;
        foreach (var stepRequest in stepRequests)
        {
            var stepId = Guid.CreateVersion7();
            var isConsumer = stepRequest.WaitForReplyFrom is not null;
            var isProducer = stepRequest.Ref is not null && replyIdsByStepRef.ContainsKey(stepRequest.Ref);

            // Both producer and consumer share the same ReplyId (correlation token).
            // Producer uses stepRequest.Ref, consumer uses stepRequest.WaitForReplyFrom.
            var replyStepRef = isConsumer ? stepRequest.WaitForReplyFrom : stepRequest.Ref;
            Guid? replyId =
                replyStepRef is not null && replyIdsByStepRef.TryGetValue(replyStepRef, out var value) ? value : null;

            // The ReceivedReply record lives on the consumer step. Its Id equals the shared ReplyId
            // so the reply ingestion endpoint can look it up directly by PK.
            var receivedReply =
                isConsumer && replyId is not null ? new Reply { DatabaseId = replyId.Value, StepId = stepId } : null;

            var step = new Step
            {
                DatabaseId = stepId,
                OperationId = stepRequest.OperationId,
                IdempotencyKey = $"{idempotencyKey}/{stepRequest.OperationId}",
                Status = isConsumer ? PersistentItemStatus.Suspended : PersistentItemStatus.Enqueued,
                ReplyId = replyId,
                ReceivedReply = receivedReply,
                CreatedAt = metadata.CreatedAt,
                ProcessingOrder = processingOrder++,
                Command = stepRequest.Command,
                RetryStrategy = stepRequest.RetryStrategy,
                Labels = stepRequest.Labels,
            };

            steps.Add(step);
        }

        return steps;
    }
}
