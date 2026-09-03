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
        MaxStepCommandTimeout = TimeSpan.FromHours(2),
        DefaultStepWaitBudget = TimeSpan.FromDays(1),
        MaxStepWaitBudget = TimeSpan.FromDays(14),
        MinStepDeferDelay = TimeSpan.FromSeconds(1),
        MaxMailboxTimeout = TimeSpan.FromDays(21),
        MaxOpenMailboxesPerCollection = 100,
        MaxMailboxPayloadSize = 256 * 1024,
        MaxMailboxLogLength = 100,
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
        MaintenanceInterval = TimeSpan.FromMinutes(1),
        MailboxSweepInterval = TimeSpan.FromMinutes(5),
        Concurrency = new ConcurrencySettings()
        {
            MaxWorkers = 400,
            MaxHttpCalls = 400,
            MaxDbOperations = 90,
            BackpressureThreshold = 500_000,
        },
        WriteBuffer = new WriteBufferSettings
        {
            FlushConcurrency = 10,
            MaxBatchSize = 100,
            MaxQueueSize = 10_000,
        },
        UpdateBuffer = new UpdateBufferSettings { MaxBatchSize = 1000, MaxQueueSize = 5_000 },
        MailboxBuffers = new MailboxBufferSettings
        {
            Mint = new BatchBufferSettings
            {
                MaxBatchSize = 100,
                MaxQueueSize = 5_000,
                FlushConcurrency = 1,
            },
            Close = new BatchBufferSettings
            {
                MaxBatchSize = 100,
                MaxQueueSize = 5_000,
                FlushConcurrency = 1,
            },
            Delivery = new BatchBufferSettings
            {
                MaxBatchSize = 100,
                MaxQueueSize = 10_000,
                FlushConcurrency = 2,
            },
        },
        Retention = new RetentionSettings
        {
            RetentionPeriod = TimeSpan.FromDays(60),
            BatchSize = 1000,
            Interval = TimeSpan.FromHours(2),
        },
        Throttling = new ThrottlingSettings
        {
            Enabled = false,
            MinRequeuedWorkflows = 50,
            MinRequeuedRatio = 0.5,
            SweepInterval = TimeSpan.FromSeconds(30),
            CanaryCount = 3,
            InitialWindow = TimeSpan.FromMinutes(10),
            MaxWindow = TimeSpan.FromHours(1),
        },
    };
}
