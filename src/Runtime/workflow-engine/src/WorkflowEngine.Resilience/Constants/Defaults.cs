namespace WorkflowEngine.Resilience.Constants;

/// <summary>
/// Default settings for the resilience primitives.
/// </summary>
internal static class Defaults
{
    /// <summary>
    /// The maximum fraction by which a calculated retry delay is randomly adjusted up or down (uniform ±20%),
    /// so that workflows failing on the same cause don't retry in synchronized waves. Deliberately not
    /// configurable: jitter is a correctness property of the backoff calculation, not a tuning knob.
    /// </summary>
    public const double RetryDelayJitterFraction = 0.2;
}
