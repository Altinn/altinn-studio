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
    /// The largest timeout a caller may request when minting a mailbox. The engine stamps the mailbox's
    /// absolute deadline as <c>now + timeout</c> at mint, so this is the longest a single exchange can
    /// stay open, and mint requests above it are rejected.
    /// </summary>
    /// <remarks>
    /// Load-bearing for the same cross-component invariant as <see cref="MaxStepWaitBudget"/>, but
    /// anchored differently, and that difference is the whole reason this number can be as large as it
    /// is. AppCommand callback tokens are minted once at <em>enqueue</em> and never refresh, valid until
    /// their signing app-code expires. A receive workflow is enqueued as its own workflow, so it parks on
    /// a token minted at <em>its own</em> enqueue — not on an ancestor's inherited one. The lifetime the
    /// token must cover is therefore the receiver's, measured from the receiver's enqueue:
    /// <list type="bullet">
    ///   <item>the park: at most the mailbox's whole remaining lifetime, which is at most this cap for a
    ///         receiver enqueued at mint — 21d</item>
    ///   <item>the closure sweep's coarseness, since the mailbox closes at its deadline plus at most one
    ///         cadence — <see cref="MaintenanceInterval"/>, 1min. <strong>This term must track whatever
    ///         cadence the mailbox closure sweep actually runs on.</strong> No such sweep exists yet, so
    ///         it is charged against the maintenance interval; a sweep introduced on its own, coarser
    ///         setting has to replace this term here and in the tripwire test, or the bound silently
    ///         stops covering the wait it is meant to bound</item>
    ///   <item>the released receiver's own wait, its steps being ordinary steps that may defer —
    ///         <see cref="MaxStepWaitBudget"/>, 14d</item>
    ///   <item>a failure, then a resume at the terminal-retention edge replaying the original token —
    ///         <see cref="RetentionSettings.RetentionPeriod"/>, 60d</item>
    ///   <item>the resumed run's own full wait — <see cref="MaxStepWaitBudget"/> again, 14d</item>
    ///   <item>the final retry ladder — <see cref="RetryStrategy.MaxDuration"/> of
    ///         <see cref="DefaultStepRetryStrategy"/>, 24h</item>
    /// </list>
    /// which totals 110d and a minute against a floor of ≥114d of remaining validity at enqueue
    /// (operator app-code rotation policy in
    /// <c>src/Runtime/operator/internal/controller/appcodesync/controller.go</c>: 186d acceptance, 72d
    /// rotation). <c>CallbackTokenLifetimeInvariantTests</c> pins that arithmetic, so raising this cap —
    /// or the wait budget, or retention — fails loudly instead of silently minting exchanges whose
    /// receivers cannot authenticate weeks later.
    /// <para>
    /// Two terms an inherited-token design has to carry are absent here, and they are what buys the
    /// headroom: no wait spent by an ancestor before the receiver existed, and no second exchange, since
    /// a relay's next hop is a <em>new</em> receiver with a <em>new</em> token. The receiver's own wait
    /// clock, by the same token, is inside this arithmetic rather than an uncounted term beside it.
    /// The one looseness that remains predates mailboxes entirely: the wait budget is per step, so a
    /// receiver with several deferring steps spends more than the one budget counted above.
    /// </para>
    /// </remarks>
    [JsonPropertyName("maxMailboxTimeout")]
    public TimeSpan MaxMailboxTimeout { get; set; } = TimeSpan.FromDays(21);

    /// <summary>
    /// The number of simultaneously open mailboxes a single workflow collection should hold, as a
    /// <strong>best-effort</strong> resource guard. A mint that would exceed it is rejected with
    /// <c>429 Too Many Requests</c>.
    /// </summary>
    /// <remarks>
    /// An aggregate bound on what one instance's exchanges can cost the engine: every open mailbox can
    /// accumulate deliveries and park receivers that hold admission budget while unfetchable, and nothing
    /// else limits how many an app mints. Reaching it is a <c>429</c> rather than a silent close, because
    /// the engine cannot know which of the open exchanges the app considers finished.
    /// <para>
    /// <strong>It is not an exact bound, by design.</strong> The count is evaluated against the snapshot
    /// the mint statement runs on, so mints in flight at the same instant can each see room and the
    /// collection can settle slightly above this number — by at most one per concurrently in-flight mint,
    /// never unboundedly, and the very next sequential mint is refused. Making it exact would mean
    /// serializing every mint behind a lock, which costs more than a resource guard is worth. Treat this
    /// as "roughly this many, and never runaway", not as an invariant to assert on.
    /// </para>
    /// <para>
    /// The cap is scoped to a collection, so it does not apply to a mailbox minted without a
    /// <c>collectionKey</c> — there is no collection to bound. The app library always supplies one.
    /// </para>
    /// <para>
    /// The default of 100 is generous for the shape this exists for: a task that awaits a reply mints one
    /// mailbox, and an instance runs a handful of such tasks. An app needing hundreds of concurrent
    /// mailboxes under one instance wants a different decomposition, not a larger cap.
    /// </para>
    /// </remarks>
    [JsonPropertyName("maxOpenMailboxesPerCollection")]
    public int MaxOpenMailboxesPerCollection { get; set; } = 100;

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
