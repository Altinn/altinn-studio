using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Constants;

/// <summary>
/// Default settings for the Process Engine.
/// </summary>
internal static class Defaults
{
    /// <summary>
    /// The session API key used by endpoints and for app command callbacks.
    /// </summary>
    public static readonly string ApiKey = Guid.NewGuid().ToString();

    /// <summary>
    /// The total number of concurrent tasks that can be processed.
    /// </summary>
    public const int QueueCapacity = 10000;

    /// <summary>
    /// The default timeout for task execution.
    /// </summary>
    public static readonly TimeSpan DefaultTaskExecutionTimeout = TimeSpan.FromSeconds(100);

    /// <summary>
    /// The default retry strategy for tasks.
    /// </summary>
    public static readonly ProcessEngineRetryStrategy DefaultTaskRetryStrategy = ProcessEngineRetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxRetries: 1000,
        maxDelay: TimeSpan.FromSeconds(60)
    );

    /// <summary>
    /// The default retry strategy for database operations.
    /// </summary>
    public static readonly ProcessEngineRetryStrategy DefaultDatabaseRetryStrategy =
        ProcessEngineRetryStrategy.Exponential(
            baseInterval: TimeSpan.FromMilliseconds(100),
            maxRetries: 50,
            maxDelay: TimeSpan.FromSeconds(10)
        );
}
