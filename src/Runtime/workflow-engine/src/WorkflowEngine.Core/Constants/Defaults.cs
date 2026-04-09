using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Constants;

/// <summary>
/// Default settings for the Process Engine.
/// </summary>
internal static class Defaults
{
    public static readonly EngineSettings EngineSettings = new()
    {
        EnableTelemetry = true,
        MaxWorkflowsPerRequest = 100,
        MaxStepsPerWorkflow = 50,
        MaxLabels = 50,
        MetricsCollectionInterval = TimeSpan.FromSeconds(5),
        DefaultStepCommandTimeout = TimeSpan.FromSeconds(100),
        DefaultStepRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromSeconds(1),
            maxDelay: TimeSpan.FromMinutes(5),
            maxDuration: TimeSpan.FromDays(1)
        ),
        DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
        DatabaseRetryStrategy = RetryStrategy.Exponential(
            baseInterval: TimeSpan.FromMilliseconds(100),
            maxDelay: TimeSpan.FromMinutes(2)
        ),
        HeartbeatInterval = TimeSpan.FromSeconds(10),
        StaleWorkflowThreshold = TimeSpan.FromSeconds(30),
        MaxReclaimCount = 5,
        CancellationWatcherInterval = TimeSpan.FromSeconds(2),
        Concurrency = new ConcurrencySettings()
        {
            MaxWorkers = 400,
            MaxHttpCalls = 400,
            MaxDbOperations = 90,
            BackpressureThreshold = 500_000,
        },
        WriteBuffer = new BufferSettings
        {
            FlushConcurrency = 8,
            MaxBatchSize = 100,
            MaxQueueSize = 10_000,
        },
        UpdateBuffer = new BufferSettings
        {
            FlushConcurrency = 8,
            MaxBatchSize = 50,
            MaxQueueSize = 5_000,
        },
        Retention = new RetentionSettings
        {
            RetentionPeriod = TimeSpan.FromDays(60),
            BatchSize = 1000,
            Interval = TimeSpan.FromHours(2),
        },
    };
}
