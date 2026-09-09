namespace Altinn.App.Core.Features.Process;

/// <summary>
/// The whole-wait clock of a <see cref="ServiceTaskContext"/>: every check a deferring task makes,
/// bounded by <see cref="ProcessStepOptions.WaitBudget"/>. Distinct from
/// <see cref="ServiceTaskAttempt"/>, which bounds one execution.
/// </summary>
public sealed record ServiceTaskWait
{
    /// <summary>
    /// How many times this task has already deferred (<see cref="ServiceTaskResult.Defer"/>) while waiting
    /// for its outcome. <c>0</c> on the first run, so a task can tell an opening attempt from a re-check
    /// and, for instance, poll eagerly at first and then back off.
    /// </summary>
    public int DeferCount { get; init; }

    /// <summary>
    /// When this task first deferred — the instant its wait began — or <c>null</c> before the first
    /// deferral. Brackets the wait together with <see cref="Deadline"/>, so a polling task can pace
    /// itself progressively (check often early, sparsely late) without bookkeeping of its own.
    /// </summary>
    public DateTimeOffset? StartedAt { get; init; }

    /// <summary>
    /// The instant at which this task's wait allowance runs out and the engine will fail the step, or
    /// <c>null</c> before the first deferral — nothing is being waited on yet, so the whole allowance
    /// (<see cref="ProcessStepOptions.WaitBudget"/>, or the engine default) is still ahead.
    /// </summary>
    /// <remarks>
    /// A deadline rather than a remaining duration, which would already have aged by the time the task
    /// reads it.
    /// </remarks>
    public DateTimeOffset? Deadline { get; init; }

    /// <summary>
    /// How much of the wait allowance is left before <see cref="Deadline"/>, floored at zero — or
    /// <c>null</c> before the first deferral, when the whole allowance is still ahead.
    /// </summary>
    public TimeSpan? Remaining =>
        Deadline is { } deadline
            ? deadline - DateTimeOffset.UtcNow is { Ticks: > 0 } remaining
                ? remaining
                : TimeSpan.Zero
            : null;

    /// <summary>
    /// <c>true</c> when the wait allowance is spent: this run is the task's final check, and a further
    /// <see cref="ServiceTaskResult.Defer"/> will fail the step as expired. Use it to end the wait on
    /// your own terms — <see cref="ServiceTaskResult.FailedPermanent"/> with a message that names what
    /// never arrived reads better than a generic expiry.
    /// </summary>
    public bool IsFinalCheck => Deadline is { } deadline && DateTimeOffset.UtcNow >= deadline;
}
