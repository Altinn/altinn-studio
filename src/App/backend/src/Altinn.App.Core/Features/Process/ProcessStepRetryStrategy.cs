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
public sealed record ProcessStepRetryStrategy
{
    /// <summary>
    /// The backoff shape used to space out retries.
    /// </summary>
    public ProcessStepBackoffType BackoffType { get; init; }

    /// <summary>
    /// The base interval between attempts. The actual delay grows or stays constant based on
    /// <see cref="BackoffType"/>.
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
    /// HTTP status codes that should never be retried. When a callback returns one of these, the step
    /// fails immediately instead of being requeued. Null falls back to the engine's defaults.
    /// </summary>
    public IReadOnlyList<int>? NonRetryableHttpStatusCodes { get; init; }

    /// <summary>
    /// Creates an exponential backoff retry strategy.
    /// </summary>
    public static ProcessStepRetryStrategy Exponential(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Exponential,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
        };

    /// <summary>
    /// Creates a linear backoff retry strategy.
    /// </summary>
    public static ProcessStepRetryStrategy Linear(
        TimeSpan baseInterval,
        int? maxRetries = null,
        TimeSpan? maxDelay = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Linear,
            BaseInterval = baseInterval,
            MaxRetries = maxRetries,
            MaxDelay = maxDelay,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
        };

    /// <summary>
    /// Creates a constant backoff retry strategy (the delay is always <paramref name="interval"/>).
    /// </summary>
    public static ProcessStepRetryStrategy Constant(
        TimeSpan interval,
        int? maxRetries = null,
        TimeSpan? maxDuration = null,
        IReadOnlyList<int>? nonRetryableHttpStatusCodes = null
    ) =>
        new()
        {
            BackoffType = ProcessStepBackoffType.Constant,
            BaseInterval = interval,
            MaxRetries = maxRetries,
            MaxDelay = interval,
            MaxDuration = maxDuration,
            NonRetryableHttpStatusCodes = nonRetryableHttpStatusCodes,
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
    /// </summary>
    internal EngineRetryStrategy ToRetryStrategy() =>
        new()
        {
            BackoffType = this.BackoffType switch
            {
                ProcessStepBackoffType.Constant => EngineBackoffType.Constant,
                ProcessStepBackoffType.Linear => EngineBackoffType.Linear,
                ProcessStepBackoffType.Exponential => EngineBackoffType.Exponential,
                _ => EngineBackoffType.Constant,
            },
            BaseInterval = BaseInterval,
            MaxRetries = MaxRetries,
            MaxDelay = MaxDelay,
            MaxDuration = MaxDuration,
            NonRetryableHttpStatusCodes = NonRetryableHttpStatusCodes,
        };
}
