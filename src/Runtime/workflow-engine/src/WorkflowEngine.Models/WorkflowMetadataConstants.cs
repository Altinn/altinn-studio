// CA1724: Type names should not match namespaces
#pragma warning disable CA1724

namespace WorkflowEngine.Models;

/// <summary>
/// Header and query parameter names for workflow metadata.
/// Used for both inbound extraction and outbound header injection.
/// </summary>
public static class WorkflowMetadataConstants
{
    public static class Headers
    {
        public const string Namespace = "Namespace";
        public const string IdempotencyKey = "Idempotency-Key";
        public const string CorrelationId = "Correlation-Id";
        public const string WorkflowId = "Workflow-Id";
        public const string OperationId = "Operation-Id";
    }

    public static class QueryParams
    {
        public const string IdempotencyKey = "idempotencyKey";
        public const string CorrelationId = "correlationId";
    }
}
