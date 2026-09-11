namespace WorkflowEngine.Data;

/// <summary>
/// Per-namespace workflow population counts used by the throttle sweep's trip evaluation:
/// the <c>Requeued</c> population against the total active (incomplete) population.
/// </summary>
internal sealed record NamespaceWorkflowCounts(string Namespace, int Requeued, int Active);
