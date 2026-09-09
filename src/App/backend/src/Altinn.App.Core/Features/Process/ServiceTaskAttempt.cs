namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The per-attempt clock of a <see cref="ServiceTaskContext"/>: one execution, bounded by
/// <see cref="ProcessStepOptions.MaxExecutionTime"/>. Distinct from <see cref="ServiceTaskWait"/>,
/// which bounds the whole wait across attempts.
/// </summary>
public sealed record ServiceTaskAttempt
{
    /// <summary>
    /// How many times this task has been retried after a retryable failure
    /// (<see cref="ServiceTaskResult.FailedRetryable"/>, or an unhandled exception). <c>0</c> on the
    /// first run.
    /// </summary>
    /// <remarks>
    /// Counts consecutive failures <em>since the last deferral</em>, not attempts across the task's whole
    /// life — deferring resets it, so a long wait does not arrive with its retry allowance spent. A task
    /// that has polled for hours without genuinely failing reads <c>0</c> here and a high
    /// <see cref="ServiceTaskWait.DeferCount"/>.
    /// </remarks>
    public int RetryCount { get; init; }

    /// <summary>
    /// The instant the engine stops waiting for <em>this attempt</em> and treats it as a retryable
    /// failure — derived from <see cref="ProcessStepOptions.MaxExecutionTime"/>, or the engine default.
    /// </summary>
    /// <remarks>
    /// <see cref="ServiceTaskContext.CancellationToken"/> enforces this but only reports being cut off.
    /// The deadline lets the task decide beforehand: with 10 seconds left and a 30-second call to make,
    /// <see cref="ServiceTaskResult.Defer"/> earns a fresh full budget instead of a recorded failure.
    /// Distinct from <see cref="ServiceTaskWait.Deadline"/>, which bounds the whole wait rather than
    /// one attempt.
    /// </remarks>
    public DateTimeOffset? Deadline { get; init; }
}
