using EngineBackoffType = Altinn.App.Core.Internal.WorkflowEngine.Models.Engine.BackoffType;
using EngineRetryStrategy = Altinn.App.Core.Internal.WorkflowEngine.Models.Engine.RetryStrategy;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// An app-facing description of how the workflow engine should retry the step that runs a process
/// handler (a service task or a task/process lifecycle hook). Returned from
/// <see cref="ProcessStepOptions.RetryStrategy"/> so an implementation can override the engine's
/// default retry behaviour for its own step. This is the app contract; the workflow engine has its
/// own internal wire model that this is mapped onto at enqueue time.
/// </summary>
/// <remarks>
/// Deliberately narrower than the engine's wire model: whether an individual failure is worth
/// retrying is expressed semantically by the handler itself (returning a permanent vs retryable
/// failure result, e.g. <see cref="HookResult.FailedPermanent"/> vs
/// <see cref="HookResult.FailedRetryable"/>), never by tuning transport-level details here.
/// </remarks>
public sealed record ProcessStepRetryStrategy
{
    /// <summary>
    /// The backoff shape used to space out retries.
    /// </summary>
    public ProcessStepBackoffType BackoffType { get; init; }

    /// <summary>
    /// The base interval between attempts. The actual delay grows or stays constant based on
    /// <see cref="BackoffType"/>. Must be positive unless <see cref="MaxRetries"/> is 0.
    /// </summary>
    public TimeSpan BaseInterval { get; init; }

    /// <summary>
    /// The maximum number of retries before the step is given up on. Null means unbounded (subject to
    /// <see cref="MaxDuration"/>).
    /// </summary>
    public int? MaxRetries { get; init; }

    /// <summary>
    /// The maximum delay between retries. Useful for capping linear and exponential backoff.
    /// </summary>
    public TimeSpan? MaxDelay { get; init; }

    /// <summary>
    /// The maximum wall-clock time to keep retrying, across all attempts.
    /// </summary>
    public TimeSpan? MaxDuration { get; init; }

    /// <summary>
    /// Creates an exponential backoff retry strategy.
    /// </summary>
    public static ProcessStepRetryStrategy Exponential(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Exponential,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
        };

    /// <summary>
    /// Creates a linear backoff retry strategy.
    /// </summary>
    public static ProcessStepRetryStrategy Linear(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Linear,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
        };

    /// <summary>
    /// Creates a constant backoff retry strategy (the delay is always <paramref name="interval"/>).
    /// </summary>
    public static ProcessStepRetryStrategy Constant(
        TimeSpan interval,
        int? maxRetries = null,
        TimeSpan? maxDuration = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Constant,
            BaseInterval = interval,
            MaxRetries = maxRetries,
            MaxDelay = interval,
            MaxDuration = maxDuration,
        };

    /// <summary>
    /// Creates a retry strategy that never retries — the step fails permanently on the first failure.
    /// </summary>
    public static ProcessStepRetryStrategy None() =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Constant,
            BaseInterval = TimeSpan.Zero,
            MaxRetries = 0,
            MaxDelay = TimeSpan.Zero,
        };

    /// <summary>
    /// Maps this app-facing strategy onto the engine's internal wire retry-strategy model. Internal so it
    /// stays off the public app surface while keeping the mapping next to the type it maps.
    /// Validates the strategy first, so a misconfigured handler fails fast at enqueue time with an
    /// actionable message instead of producing a degenerate retry loop in the engine.
    /// </summary>
    internal EngineRetryStrategy ToRetryStrategy()
    {
        Validate();

        return new EngineRetryStrategy
        {
            BackoffType = this.BackoffType switch
            {
                ProcessStepBackoffType.Constant => EngineBackoffType.Constant,
                ProcessStepBackoffType.Linear => EngineBackoffType.Linear,
                ProcessStepBackoffType.Exponential => EngineBackoffType.Exponential,
                _ => throw new InvalidOperationException(
                    $"Unknown {nameof(ProcessStepBackoffType)} value: {this.BackoffType}"
                ),
            },
            BaseInterval = BaseInterval,
            MaxRetries = MaxRetries,
            MaxDelay = MaxDelay,
            MaxDuration = MaxDuration,
        };
    }

    private void Validate()
    {
        if (BaseInterval < TimeSpan.Zero)
            throw new InvalidOperationException(
                $"{nameof(ProcessStepRetryStrategy)}.{nameof(BaseInterval)} cannot be negative (was {BaseInterval})."
            );

        if (MaxRetries is < 0)
            throw new InvalidOperationException(
                $"{nameof(ProcessStepRetryStrategy)}.{nameof(MaxRetries)} cannot be negative (was {MaxRetries})."
            );

        if (BaseInterval == TimeSpan.Zero && MaxRetries != 0)
            throw new InvalidOperationException(
                $"{nameof(ProcessStepRetryStrategy)}.{nameof(BaseInterval)} must be positive when retries are enabled — "
                    + "a zero interval would retry the step in a tight loop. Use "
                    + $"{nameof(ProcessStepRetryStrategy)}.{nameof(None)}() to disable retries."
            );

        if (MaxDelay is { } maxDelay && maxDelay < TimeSpan.Zero)
            throw new InvalidOperationException(
                $"{nameof(ProcessStepRetryStrategy)}.{nameof(MaxDelay)} cannot be negative (was {maxDelay})."
            );

        if (MaxDuration is { } maxDuration && maxDuration <= TimeSpan.Zero)
            throw new InvalidOperationException(
                $"{nameof(ProcessStepRetryStrategy)}.{nameof(MaxDuration)} must be positive (was {maxDuration})."
            );
    }
}
