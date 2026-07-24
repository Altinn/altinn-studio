namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The backoff shape a <see cref="ProcessStepRetryStrategy"/> uses to space out retries.
/// </summary>
public enum ProcessStepBackoffType
{
    /// <summary>
    /// The delay between retries stays the same regardless of the number of attempts.
    /// </summary>
    Constant = 0,

    /// <summary>
    /// The delay between retries grows linearly with each attempt.
    /// </summary>
    Linear = 1,

    /// <summary>
    /// The delay between retries grows exponentially with each attempt.
    /// </summary>
    Exponential = 2,
}
