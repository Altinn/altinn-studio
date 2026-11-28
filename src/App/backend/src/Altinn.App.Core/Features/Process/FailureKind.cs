namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Whether a failed step runs again.
/// </summary>
public enum FailureKind
{
    /// <summary>
    /// The workflow engine runs the step again, with backoff.
    /// </summary>
    Retryable,

    /// <summary>
    /// The step fails without another attempt, until an operator resumes it.
    /// </summary>
    Permanent,
}
