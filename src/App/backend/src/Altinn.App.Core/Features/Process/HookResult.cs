namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Base type for task hook execution results.
/// </summary>
public abstract record HookResult { }

/// <summary>
/// Classifies how a failed hook or service task result should be handled by the workflow engine.
/// </summary>
internal enum FailureKind
{
    /// <summary>
    /// The failure is transient. The workflow engine will retry the step with backoff.
    /// </summary>
    Retryable,

    /// <summary>
    /// The failure is permanent. The workflow engine will stop retrying and mark the step as failed.
    /// </summary>
    Permanent,
}
