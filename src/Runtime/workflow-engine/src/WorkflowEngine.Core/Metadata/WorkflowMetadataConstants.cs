namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Header and query parameter names for workflow metadata.
/// Used for both inbound extraction and outbound header injection.
/// </summary>
internal static class WorkflowMetadataConstants
{
    // --- Bidirectional (inbound + outbound) ---

    public static class Headers
    {
        public const string Namespace = "Workflow-Namespace";
        public const string IdempotencyKey = "Idempotency-Key";
        public const string CorrelationId = "Correlation-Id";
        public const string WorkflowId = "Workflow-Id";
        public const string StepOperationId = "Step-Operation-Id";
    }

    public static class QueryParams
    {
        public const string Namespace = "namespace";
        public const string IdempotencyKey = "idempotencyKey";
        public const string CorrelationId = "correlationId";
    }
}
