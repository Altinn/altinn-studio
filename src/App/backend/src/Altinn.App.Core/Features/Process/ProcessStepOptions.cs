namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Optional per-step execution preferences a process handler can declare for the workflow engine.
/// Every field is nullable and independently resolved: a <c>null</c> field falls back to the next tier
/// (the command's own default, then the engine's global default), so an implementation can override
/// just the timeout, just the retry strategy, or both.
/// </summary>
/// <seealso cref="IProcessStepConfigurable"/>
public sealed record ProcessStepOptions
{
    /// <summary>
    /// The maximum wall-clock time a single execution attempt of the step may take before the engine
    /// cancels it and treats the attempt as a retryable failure. Null falls back to the command/engine
    /// default. Use this for handlers that legitimately run long (e.g. a service task calling a slow
    /// external system).
    /// </summary>
    public TimeSpan? MaxExecutionTime { get; init; }

    /// <summary>
    /// The retry strategy for the step. Null falls back to the command/engine default.
    /// </summary>
    public ProcessStepRetryStrategy? RetryStrategy { get; init; }

    /// <summary>
    /// Validates the declared options, throwing <see cref="InvalidOperationException"/> with an
    /// actionable message when a field is degenerate (a non-positive timeout, or a retry strategy that
    /// would requeue in a tight loop). Called once per handler at startup and again per-step at enqueue
    /// time, so a misconfiguration fails fast instead of breaking every transition of the affected task.
    /// </summary>
    internal void Validate()
    {
        if (MaxExecutionTime is { } maxExecutionTime && maxExecutionTime <= TimeSpan.Zero)
        {
            throw new InvalidOperationException(
                $"{nameof(ProcessStepOptions)}.{nameof(MaxExecutionTime)} must be positive when set (was {maxExecutionTime})."
            );
        }

        RetryStrategy?.Validate();
    }
}
