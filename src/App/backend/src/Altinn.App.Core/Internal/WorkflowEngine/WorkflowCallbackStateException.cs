namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Thrown when a workflow callback state blob cannot be restored: it is malformed, or it targets a different
/// instance than the callback route. These are deterministic engine/app invariant failures, not transient
/// errors, so callers should treat them as non-retryable.
/// </summary>
internal sealed class WorkflowCallbackStateException : Exception
{
    public WorkflowCallbackStateException(string message)
        : base(message) { }

    public WorkflowCallbackStateException(string message, Exception innerException)
        : base(message, innerException) { }
}
