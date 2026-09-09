using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Models;

/// <summary>
/// Configuration settings for the workflow engine.
/// </summary>
public sealed record EngineSettings
{
    /// <summary>
    /// Whether to enable OpenTelemetry tracing, metrics, and log export.
    /// Defaults to <c>true</c>. Set to <c>false</c> to skip all OTEL registration
    /// (useful for local stress testing without a collector).
    /// </summary>
    [JsonPropertyName("enableTelemetry")]
    public bool EnableTelemetry { get; set; } = true;

    /// <summary>
    /// Trace sampling rate between 0.0 (drop all traces) and 1.0 (keep all traces).
    /// Defaults to <c>1.0</c>. Lower this during stress testing to reduce OTLP export volume
    /// while keeping metrics and logs at full fidelity.
    /// Only affects traces — metrics and logs are always exported at 100%.
    /// </summary>
    [JsonPropertyName("traceSamplingRate")]
    public double TraceSamplingRate { get; set; } = 1.0;

    /// <summary>
    /// Whether to enable database-level trace instrumentation (EF Core spans).
    /// Defaults to <c>false</c>. The engine's hot-path DB operations use raw Npgsql commands,
    /// so this primarily adds spans for lighter EF Core queries (dashboard reads, single lookups).
    /// Enable for debugging database-level issues. Implies <see cref="EnableDatabaseMetrics"/>.
    /// </summary>
    [JsonPropertyName("enableDatabaseInstrumentation")]
    public bool EnableDatabaseInstrumentation { get; set; }

    /// <summary>
    /// Whether to enable Npgsql connection pool and command metrics
    /// (<c>db_client_connection_count</c>, <c>db_client_connection_max</c>, etc.).
    /// Defaults to <c>true</c>. These are lightweight gauge/histogram metrics with negligible overhead.
    /// Automatically enabled when <see cref="EnableDatabaseInstrumentation"/> is <c>true</c>.
    /// </summary>
    [JsonPropertyName("enableDatabaseMetrics")]
    public bool EnableDatabaseMetrics { get; set; } = true;

    /// <summary>
    /// Maximum number of workflows allowed in a single enqueue request.
    /// </summary>
    [JsonPropertyName("maxWorkflowsPerRequest")]
    public required int MaxWorkflowsPerRequest { get; set; }

    /// <summary>
    /// Maximum number of steps allowed per workflow.
    /// </summary>
    [JsonPropertyName("maxStepsPerWorkflow")]
    public required int MaxStepsPerWorkflow { get; set; }

    /// <summary>
    /// Maximum number of label entries per request.
    /// </summary>
    [JsonPropertyName("maxLabels")]
    public required int MaxLabels { get; set; }

    /// <summary>
    /// Interval at which the engine collects metrics.
    /// </summary>
    [JsonPropertyName("metricsCollectionInterval")]
    public required TimeSpan MetricsCollectionInterval { get; set; }

    /// <summary>
    /// The default timeout for command execution. Max allowed time to wait for a command to complete.
    /// </summary>
    [JsonPropertyName("defaultStepCommandTimeout")]
    public required TimeSpan DefaultStepCommandTimeout { get; set; }

    /// <summary>
    /// The maximum per-step command timeout a client may request via a step's
    /// <c>command.maxExecutionTime</c>. Enqueue requests exceeding this cap are rejected, protecting the
    /// shared worker and HTTP pools from steps that would hold a slot for an unbounded amount of time.
    /// </summary>
    [JsonPropertyName("maxStepCommandTimeout")]
    public required TimeSpan MaxStepCommandTimeout { get; set; }

    /// <summary>
    /// The default wait budget for steps that defer (<see cref="ExecutionStatus.Deferred"/>): the
    /// maximum <em>cumulative</em> time a step may spend in <see cref="PersistentItemStatus.Waiting"/>
    /// across all its deferrals, applied when its command does not specify
    /// <see cref="CommandDefinition.WaitBudget"/>.
    /// </summary>
    /// <remarks>
    /// A total allowance, not a poll interval: a step deferring 5 minutes at a time under the 1-day
    /// default polls ~288 times before the budget runs out; it does not sit idle for a day between polls.
    /// </remarks>
    [JsonPropertyName("defaultStepWaitBudget")]
    public TimeSpan DefaultStepWaitBudget { get; set; } = TimeSpan.FromDays(1);

    /// <summary>
    /// The largest wait budget a client may request via a step's <c>command.waitBudget</c>.
    /// Enqueue requests exceeding this cap are rejected, bounding how long a waiting step can keep its
    /// workflow (and any dependents) pending. This caps <see cref="DefaultStepWaitBudget"/>-style
    /// allowances; it is not itself an allowance any step receives by default.
    /// </summary>
    /// <remarks>
    /// Deliberately small — a step that has not resolved in two weeks should fail loudly rather than
    /// keep its instance pinned. Raising it also erodes a cross-component invariant: AppCommand
    /// callback tokens are minted once at enqueue and never refresh, valid until their signing
    /// app-code expires. Under the operator's rotation policy (<c>appcodesync</c>: 186d acceptance,
    /// 72d rotation) a token has ≥114d of validity left at enqueue, and the worst-case workflow
    /// lifetime — a full wait, a resume at the retention edge (60d), and a second full wait, each
    /// resume replaying the original token — must stay below that floor.
    /// </remarks>
    [JsonPropertyName("maxStepWaitBudget")]
    public TimeSpan MaxStepWaitBudget { get; set; } = TimeSpan.FromDays(14);

    /// <summary>
    /// The shortest delay a deferral can schedule. A command asking for less is clamped up to it, so a
    /// deferral cannot become a tight re-execution loop. A non-positive delay still fails the step.
    /// </summary>
    [JsonPropertyName("minStepDeferDelay")]
    public TimeSpan MinStepDeferDelay { get; set; } = TimeSpan.FromSeconds(1);

    /// <summary>The largest timeout a mint may request.</summary>
    /// <remarks>
    /// A term in the callback-token lifetime bound: the token minted at a receiver's enqueue must outlive the
    /// park, the sweep's coarseness, the wait budgets, retention and the retry ladder.
    /// <c>CallbackTokenLifetimeInvariantTests</c> pins that arithmetic, so raising this fails loudly.
    /// </remarks>
    [JsonPropertyName("maxMailboxTimeout")]
    public TimeSpan MaxMailboxTimeout { get; set; } = TimeSpan.FromDays(21);

    /// <summary>
    /// Best-effort cap on simultaneously open mailboxes per collection; an exceeding mint is refused with
    /// <c>429</c> rather than something being closed.
    /// </summary>
    /// <remarks>
    /// Not exact: the count reads the mint statement's own snapshot, so concurrent mints can overshoot by at
    /// most one each. A mailbox minted without a <c>collectionKey</c> is not capped.
    /// </remarks>
    [JsonPropertyName("maxOpenMailboxesPerCollection")]
    public int MaxOpenMailboxesPerCollection { get; set; } = 100;

    /// <summary>
    /// The largest delivery payload in UTF-8 bytes; larger is refused with <c>413</c> and nothing is stored.
    /// </summary>
    /// <remarks>
    /// Large content belongs in storage with the delivery carrying a reference: the payload is read back on
    /// every attempt and kept until retention.
    /// </remarks>
    [JsonPropertyName("maxMailboxPayloadSize")]
    public int MaxMailboxPayloadSize { get; set; } = 256 * 1024;

    /// <summary>The most positions a mailbox's logs may hold; a delivery past it is refused with <c>429</c>.</summary>
    /// <remarks>
    /// The only bound on one mailbox's cost — deliveries skip the ordinary admission check, so without it one
    /// counterparty could fill a mailbox without limit. Applied to both logs: they are two views of one
    /// exchange.
    /// </remarks>
    [JsonPropertyName("maxMailboxLogLength")]
    public int MaxMailboxLogLength { get; set; } = 100;

    /// <summary>
    /// The default retry strategy for steps.
    /// </summary>
    [JsonPropertyName("defaultStepRetryStrategy")]
    public required RetryStrategy DefaultStepRetryStrategy { get; set; }

    /// <summary>
    /// The timeout for database operations. Max allowed time to wait for a database command to complete.
    /// </summary>
    [JsonPropertyName("databaseCommandTimeout")]
    public required TimeSpan DatabaseCommandTimeout { get; set; }

    /// <summary>
    /// The retry strategy for database operations.
    /// </summary>
    [JsonPropertyName("databaseRetryStrategy")]
    public required RetryStrategy DatabaseRetryStrategy { get; set; }

    /// <summary>
    /// Interval at which the engine sends heartbeats for in-flight workflows.
    /// Workers update HeartbeatAt at this cadence to prove liveness.
    /// </summary>
    [JsonPropertyName("heartbeatInterval")]
    public required TimeSpan HeartbeatInterval { get; set; }

    /// <summary>
    /// How long a workflow can remain in Processing without a heartbeat before being
    /// considered stale and reclaimed by another worker. Must be greater than <see cref="HeartbeatInterval"/>.
    /// </summary>
    [JsonPropertyName("staleWorkflowThreshold")]
    public required TimeSpan StaleWorkflowThreshold { get; set; }

    /// <summary>
    /// Maximum number of times a workflow can be reclaimed before being marked as Failed.
    /// Protects against poisoned workflows that crash workers repeatedly.
    /// </summary>
    [JsonPropertyName("maxReclaimCount")]
    public required int MaxReclaimCount { get; set; }

    /// <summary>
    /// Interval at which the cancellation watcher polls for cross-pod cancellation signals.
    /// </summary>
    [JsonPropertyName("cancellationWatcherInterval")]
    public TimeSpan CancellationWatcherInterval { get; set; }

    /// <summary>
    /// Interval at which the database maintenance sweeps run (stale reclaim, poisoned finalization,
    /// and dependency-recovery of workflows whose dependencies have since completed).
    /// </summary>
    [JsonPropertyName("maintenanceInterval")]
    public TimeSpan MaintenanceInterval { get; set; }

    /// <summary>
    /// Interval of the mailbox closure sweep, deliberately coarser than <see cref="MaintenanceInterval"/>:
    /// a deadline is a day-scale promise, and a quiet tick is one indexed scan.
    /// </summary>
    /// <remarks>
    /// A term in the token-lifetime bound (a receiver parks until deadline plus at most one interval), pinned
    /// by <c>CallbackTokenLifetimeInvariantTests</c>. Deliberately no initializer: the default lives in
    /// <c>Defaults.EngineSettings</c> alone, and an initializer here would win over it and leave the tripwire
    /// guarding a number nothing uses.
    /// </remarks>
    [JsonPropertyName("mailboxSweepInterval")]
    public TimeSpan MailboxSweepInterval { get; set; }

    /// <summary>
    /// Concurrency settings.
    /// </summary>
    [JsonPropertyName("concurrency")]
    public ConcurrencySettings Concurrency { get; set; } = new();

    /// <summary>
    /// Write buffer settings.
    /// </summary>
    [JsonPropertyName("writeBuffer")]
    public WriteBufferSettings WriteBuffer { get; set; } = new();

    /// <summary>
    /// Update buffer settings.
    /// </summary>
    [JsonPropertyName("updateBuffer")]
    public UpdateBufferSettings UpdateBuffer { get; set; } = new();

    /// <summary>
    /// Buffer settings for the three mailbox hot paths.
    /// </summary>
    [JsonPropertyName("mailboxBuffers")]
    public MailboxBufferSettings MailboxBuffers { get; set; } = new();

    /// <summary>
    /// Data retention settings.
    /// </summary>
    [JsonPropertyName("retention")]
    public RetentionSettings Retention { get; set; } = new();

    /// <summary>
    /// Pagination settings for list endpoints.
    /// </summary>
    [JsonPropertyName("pagination")]
    public PaginationSettings Pagination { get; set; } = new();

    /// <summary>
    /// Failure-storm throttling settings (per-namespace circuit breaker). Disabled by default.
    /// </summary>
    [JsonPropertyName("throttling")]
    public ThrottlingSettings Throttling { get; set; } = new();
}

/// <summary>
/// Settings for the workflow enqueue write buffer (channel-based batched insert pipeline).
/// </summary>
public sealed record WriteBufferSettings
{
    /// <summary>
    /// Maximum number of status updates per batch flush.
    /// </summary>
    [JsonPropertyName("maxBatchSize")]
    public int MaxBatchSize { get; set; }

    /// <summary>
    /// Maximum number of pending status updates before backpressure is applied.
    /// </summary>
    [JsonPropertyName("maxQueueSize")]
    public int MaxQueueSize { get; set; }

    /// <summary>
    /// Number of concurrent flush operations for the update buffer.
    /// </summary>
    [JsonPropertyName("flushConcurrency")]
    public int FlushConcurrency { get; set; }
}

/// <summary>
/// Settings for the in-flight status update buffer used by the processor write-back path.
/// </summary>
public sealed record UpdateBufferSettings
{
    /// <summary>
    /// Maximum number of status updates per batch flush.
    /// </summary>
    [JsonPropertyName("maxBatchSize")]
    public int MaxBatchSize { get; set; }

    /// <summary>
    /// Maximum number of pending status updates before backpressure is applied.
    /// </summary>
    [JsonPropertyName("maxQueueSize")]
    public int MaxQueueSize { get; set; }
}

/// <summary>
/// Settings for one channel-based batch buffer: the requests one flush may carry, the requests that may wait
/// for a flush, and the flushes that may run at once.
/// </summary>
public sealed record BatchBufferSettings
{
    /// <summary>
    /// Maximum number of requests per batch flush.
    /// </summary>
    [JsonPropertyName("maxBatchSize")]
    public int MaxBatchSize { get; set; }

    /// <summary>
    /// Maximum number of requests waiting for a flush. The channel is bounded and <em>waits</em> when full, so a
    /// caller arriving at a full queue is delayed rather than refused.
    /// </summary>
    [JsonPropertyName("maxQueueSize")]
    public int MaxQueueSize { get; set; }

    /// <summary>
    /// Number of concurrent flushes, and with that the database connections the buffer can hold at once — one
    /// per in-flight flush.
    /// </summary>
    [JsonPropertyName("flushConcurrency")]
    public int FlushConcurrency { get; set; }
}

/// <summary>
/// Settings for the mailbox hot-path buffers, one per operation: minting, closing, and delivering are separate
/// batch statements against separate rows, so they queue and flush independently.
/// </summary>
public sealed record MailboxBufferSettings
{
    /// <summary>Buffer for minting mailboxes.</summary>
    [JsonPropertyName("mint")]
    public BatchBufferSettings Mint { get; set; } = new();

    /// <summary>Buffer for closing mailboxes.</summary>
    [JsonPropertyName("close")]
    public BatchBufferSettings Close { get; set; } = new();

    /// <summary>Buffer for delivering messages into mailboxes.</summary>
    [JsonPropertyName("delivery")]
    public BatchBufferSettings Delivery { get; set; } = new();
}

/// <summary>
/// Settings for the background data retention job that purges terminal workflows.
/// </summary>
public sealed record RetentionSettings
{
    /// <summary>
    /// How long terminal workflows are kept before being deleted.
    /// </summary>
    [JsonPropertyName("retentionPeriod")]
    public TimeSpan RetentionPeriod { get; set; }

    /// <summary>
    /// Maximum number of workflows to delete per retention cycle.
    /// </summary>
    [JsonPropertyName("batchSize")]
    public int BatchSize { get; set; }

    /// <summary>
    /// How often the retention cleanup runs.
    /// </summary>
    [JsonPropertyName("interval")]
    public TimeSpan Interval { get; set; }
}

/// <summary>
/// Settings for the per-namespace failure-storm circuit breaker (see the failure-throttling ADR).
/// The feature ships dark: with <see cref="Enabled"/> left <c>false</c> the sweep does not run and
/// the fetch query variant without the <c>throttled_until</c> predicate is selected at startup,
/// making the schema fully inert. Configuration is restart-only.
/// </summary>
public sealed record ThrottlingSettings
{
    /// <summary>
    /// Multiplier applied to a namespace's throttle window on every extension (window doubling).
    /// Deliberately not configuration: it interacts multiplicatively with
    /// <see cref="InitialWindow"/>, <see cref="MaxWindow"/>, and <see cref="ReleaseCohortGrowthFactor"/>,
    /// and no operator can predict an altered combination's emergent behavior without reading the code.
    /// </summary>
    public const double WindowGrowthFactor = 2.0;

    /// <summary>
    /// Multiplier applied to the release cohort size on every sweep during recovery
    /// (cohorts start at canary scale and double). Deliberately not configuration — see
    /// <see cref="WindowGrowthFactor"/>.
    /// </summary>
    public const double ReleaseCohortGrowthFactor = 2.0;

    /// <summary>
    /// Fractional jitter (±20%) applied to every <c>throttled_until</c> stamp so parked
    /// workflows do not wake in synchronized waves. Deliberately not configuration — see
    /// <see cref="WindowGrowthFactor"/>.
    /// </summary>
    public const double JitterFraction = 0.2;

    /// <summary>
    /// Whether the namespace circuit breaker is enabled. Defaults to <c>false</c> (the feature
    /// ships dark). When disabled the throttle sweep does not run and the workflow fetch query
    /// ignores <c>throttled_until</c> entirely.
    /// </summary>
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    /// <summary>
    /// Absolute floor: a namespace must have at least this many workflows in <c>Requeued</c>
    /// before it can trip the breaker. Keeps small-but-broken apps from tripping.
    /// </summary>
    [JsonPropertyName("minRequeuedWorkflows")]
    public int MinRequeuedWorkflows { get; set; }

    /// <summary>
    /// Relative floor: the <c>Requeued</c> population must also exceed this fraction of the
    /// namespace's active workflows before the breaker trips. Keeps large-but-noisy apps from
    /// tripping. Must be greater than 0 and less than or equal to 1.
    /// </summary>
    [JsonPropertyName("minRequeuedRatio")]
    public double MinRequeuedRatio { get; set; }

    /// <summary>
    /// Interval at which the throttle sweep runs (detect → throttle → probe → release).
    /// </summary>
    [JsonPropertyName("sweepInterval")]
    public TimeSpan SweepInterval { get; set; }

    /// <summary>
    /// Number of canary workflows kept on the normal retry schedule while a namespace is
    /// throttled, probing for recovery. Must be at least 1.
    /// </summary>
    [JsonPropertyName("canaryCount")]
    public int CanaryCount { get; set; }

    /// <summary>
    /// The throttle window applied when a breaker first trips. Grows by
    /// <see cref="WindowGrowthFactor"/> on every extension, capped at <see cref="MaxWindow"/>.
    /// </summary>
    [JsonPropertyName("initialWindow")]
    public TimeSpan InitialWindow { get; set; }

    /// <summary>
    /// The largest throttle window a namespace can reach. Must be greater than or equal to
    /// <see cref="InitialWindow"/>.
    /// </summary>
    [JsonPropertyName("maxWindow")]
    public TimeSpan MaxWindow { get; set; }
}

/// <summary>
/// Settings for paginated list endpoints.
/// </summary>
public sealed record PaginationSettings
{
    /// <summary>
    /// Default number of items per page when not specified by the caller.
    /// </summary>
    [JsonPropertyName("defaultPageSize")]
    public int DefaultPageSize { get; set; } = 25;

    /// <summary>
    /// Maximum allowed page size. Requests above this value are clamped.
    /// </summary>
    [JsonPropertyName("maxPageSize")]
    public int MaxPageSize { get; set; } = 100;
}

/// <summary>
/// Settings for the engine's concurrency limits across workers, database operations, and outbound HTTP calls.
/// </summary>
public sealed record ConcurrencySettings
{
    /// <summary>
    /// Maximum number of concurrent workflow processing workers.
    /// </summary>
    [JsonPropertyName("maxWorkers")]
    public int MaxWorkers { get; set; }

    /// <summary>
    /// Maximum number of concurrent database operations.
    /// Also used to size the Npgsql connection pool (<c>MaxPoolSize</c>).
    /// </summary>
    [JsonPropertyName("maxDbOperations")]
    public int MaxDbOperations { get; set; }

    /// <summary>
    /// Maximum number of concurrent outbound HTTP calls for step execution.
    /// </summary>
    [JsonPropertyName("maxHttpCalls")]
    public int MaxHttpCalls { get; set; }

    /// <summary>
    /// The maximum number of active workflows allowed in the database before the engine reports backpressure
    /// and refuses new jobs (http-429).
    /// </summary>
    [JsonPropertyName("backpressureThreshold")]
    public int BackpressureThreshold { get; set; }
}
