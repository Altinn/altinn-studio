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

    /// <summary>
    /// The largest timeout a caller may request when minting a mailbox. The engine stamps the mailbox's absolute
    /// deadline as <c>now + timeout</c> at mint, so this is the longest a single exchange can stay open.
    /// </summary>
    /// <remarks>
    /// It is a term in the callback-token lifetime bound: a receive workflow parks on a token minted at its own
    /// enqueue, so that token must outlive the park (this cap), the closure sweep's coarseness
    /// (<see cref="MailboxSweepInterval"/>), the released receiver's own wait
    /// (<see cref="MaxStepWaitBudget"/>), a resume at the terminal-retention edge
    /// (<see cref="RetentionSettings.RetentionPeriod"/>) with its own full wait, and the final retry ladder.
    /// <c>CallbackTokenLifetimeInvariantTests</c> pins that arithmetic against the operator's app-code rotation
    /// policy, so raising this cap — or the wait budget, or retention — fails loudly.
    /// </remarks>
    [JsonPropertyName("maxMailboxTimeout")]
    public TimeSpan MaxMailboxTimeout { get; set; } = TimeSpan.FromDays(21);

    /// <summary>
    /// The number of simultaneously open mailboxes a single workflow collection should hold, as a best-effort
    /// resource guard. A mint that would exceed it is rejected with <c>429 Too Many Requests</c> rather than
    /// closing something, because the engine cannot know which exchange the app considers finished.
    /// </summary>
    /// <remarks>
    /// Not an exact bound: the count is evaluated against the mint statement's own snapshot, so concurrent mints
    /// can each see room and the collection can settle by at most one per in-flight mint above this number. Making
    /// it exact would mean serializing every mint behind a lock. The cap is scoped to a collection, so it does not
    /// apply to a mailbox minted without a <c>collectionKey</c>.
    /// </remarks>
    [JsonPropertyName("maxOpenMailboxesPerCollection")]
    public int MaxOpenMailboxesPerCollection { get; set; } = 100;

    /// <summary>
    /// The largest delivery payload, in bytes, a mailbox accepts. A delivery above this is refused with
    /// <c>413 Content Too Large</c> and nothing is stored.
    /// </summary>
    /// <remarks>
    /// Measured on the UTF-8 bytes the caller sent, so the number in the error message is actionable. Large
    /// content belongs in storage with the delivery carrying a reference: the payload is read back on every
    /// attempt of the receiving workflow and kept until retention purges its mailbox.
    /// </remarks>
    [JsonPropertyName("maxMailboxPayloadSize")]
    public int MaxMailboxPayloadSize { get; set; } = 256 * 1024;

    /// <summary>
    /// The most positions a mailbox's logs may hold. A delivery past it is refused with
    /// <c>429 Too Many Requests</c>, leaving the exchange to conclude on the messages it already has.
    /// </summary>
    /// <remarks>
    /// The only bound on how much a single mailbox can cost. Deliveries deliberately skip the admission check an
    /// ordinary enqueue must pass, so without a cap one misbehaving counterparty could fill a mailbox without
    /// limit. It bounds both logs, which are two views of the same exchange: delivery ingestion applies it to the
    /// deliveries log, and the receiver-enqueue path applies the same number to the receivers log.
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
    /// Interval at which the mailbox closure sweep looks for open mailboxes whose deadline has passed and closes
    /// them. Deliberately coarser than <see cref="MaintenanceInterval"/>: a mailbox deadline is a day-scale
    /// promise, and every tick with nothing overdue is one indexed scan.
    /// </summary>
    /// <remarks>
    /// It is a term in the callback-token lifetime bound — a receiver parks until the mailbox actually closes,
    /// which is its deadline plus at most one of these intervals — so it is charged in the derivation on
    /// <see cref="MaxMailboxTimeout"/> and pinned by <c>CallbackTokenLifetimeInvariantTests</c>. The default lives
    /// in <c>Defaults.EngineSettings</c> only, and this property deliberately carries no initializer: the
    /// normalizer reaches for <c>Defaults</c> only when the value is non-positive, so an initializer here would
    /// leave the tripwire guarding a number the engine had stopped using.
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
    /// Data retention settings.
    /// </summary>
    [JsonPropertyName("retention")]
    public RetentionSettings Retention { get; set; } = new();

    /// <summary>
    /// Pagination settings for list endpoints.
    /// </summary>
    [JsonPropertyName("pagination")]
    public PaginationSettings Pagination { get; set; } = new();
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
