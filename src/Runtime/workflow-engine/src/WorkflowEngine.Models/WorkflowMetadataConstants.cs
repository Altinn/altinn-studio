// CA1724: Type names should not match namespaces
#pragma warning disable CA1724

namespace WorkflowEngine.Models;

/// <summary>
/// Header and query parameter names for workflow metadata.
/// Used for both inbound extraction and outbound header injection.
/// </summary>
public static class WorkflowMetadataConstants
{
    /// <summary>
    /// HTTP header names carrying workflow metadata on inbound and outbound calls.
    /// </summary>
    public static class Headers
    {
        /// <summary>
        /// Header carrying the workflow namespace.
        /// </summary>
        public const string Namespace = "Namespace";

        /// <summary>
        /// Header carrying the idempotency key used to deduplicate enqueue requests.
        /// </summary>
        public const string IdempotencyKey = "Idempotency-Key";

        /// <summary>
        /// Header carrying the correlation ID shared by all workflows in a batch.
        /// </summary>
        public const string CorrelationId = "Correlation-Id";

        /// <summary>
        /// Header carrying the workflow database ID.
        /// </summary>
        public const string WorkflowId = "Workflow-Id";

        /// <summary>
        /// Header carrying the operation ID of a workflow or step.
        /// </summary>
        public const string OperationId = "Operation-Id";
    }

    /// <summary>
    /// Query parameter names accepted on engine endpoints.
    /// </summary>
    public static class QueryParams
    {
        /// <summary>
        /// Query parameter carrying the idempotency key (alternative to the header).
        /// </summary>
        public const string IdempotencyKey = "idempotencyKey";

        /// <summary>
        /// Query parameter carrying the correlation ID used for filtering.
        /// </summary>
        public const string CorrelationId = "correlationId";
    }
}
