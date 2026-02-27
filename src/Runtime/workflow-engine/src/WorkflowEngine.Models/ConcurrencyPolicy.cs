namespace WorkflowEngine.Models;

/// <summary>
/// Determine a task's concurrency policy.
/// </summary>
public enum ConcurrencyPolicy
{
    /// <summary>
    /// The workflow can be executed concurrently without restriction.
    /// </summary>
    Unrestricted,

    /// <summary>
    /// The workflow can only be executed once at a time, within the same instace+task type scope.
    /// </summary>
    SingleActive,
}

[AttributeUsage(AttributeTargets.Field)]
public sealed class ConcurrencyPolicyAttribute(ConcurrencyPolicy policy) : Attribute
{
    public ConcurrencyPolicy Policy { get; } = policy;
}
