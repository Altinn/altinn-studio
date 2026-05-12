using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Reflection;

// CA1724: Type names should not match namespaces
#pragma warning disable CA1724

namespace WorkflowEngine.Telemetry;

/// <summary>
/// OpenTelemetry instrumentation for the workflow engine.
/// Hosts all <see cref="ActivitySource"/> and <see cref="Meter"/> instruments and exposes
/// the gauge setters used by the metrics collection background service.
/// </summary>
public static class Metrics
{
    /// <summary>
    /// The OpenTelemetry service name used by the engine's <see cref="ActivitySource"/> and <see cref="Meter"/>.
    /// </summary>
    public const string ServiceName = "WorkflowEngine";

    /// <summary>
    /// Service version reported on the engine's resource attributes.
    /// </summary>
    public static readonly string ServiceVersion = ResolveServiceVersion();

    /// <summary>
    /// Activity source for engine-emitted spans (workflow lifecycle, step lifecycle, DB IO).
    /// </summary>
    public static readonly ActivitySource Source = new(ServiceName);

    /// <summary>
    /// Meter that owns every engine-emitted counter, histogram, and observable gauge.
    /// </summary>
    public static readonly Meter Meter = new(ServiceName);

    /// <summary>
    /// Counter of generic engine-side errors that don't have a more specific instrument.
    /// </summary>
    public static readonly Counter<long> Errors = Meter.CreateCounter<long>("engine.errors");

    /// <summary>
    /// Counter incremented once per main-loop iteration. Useful for liveness alerts.
    /// </summary>
    public static readonly Counter<long> EngineMainLoopIterations = Meter.CreateCounter<long>(
        "engine.mainloop.iterations"
    );

    /// <summary>
    /// Histogram of seconds the main loop spent waiting for tasks to complete and/or new workflows to arrive.
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopQueueTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.queue",
        "s",
        "Amount of time the main loop spent waiting for tasks to complete and/or new workflows to arrive (seconds)."
    );

    /// <summary>
    /// Histogram of seconds the main loop spent actively executing workflows and/or database IO.
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopServiceTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.service",
        "s",
        "Amount of time the main loop spent actively executing workflows and/or database IO (seconds)."
    );

    /// <summary>
    /// Histogram of seconds the main loop spent on a full execution (queue + service).
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopTotalTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.total",
        "s",
        "Amount of time the main loop spent on a full execution (seconds)."
    );

    /// <summary>
    /// Counter of inbound workflow query requests received (list/get endpoints).
    /// </summary>
    public static readonly Counter<long> WorkflowQueriesReceived = Meter.CreateCounter<long>(
        "engine.workflows.query.received"
    );

    /// <summary>
    /// Counter of inbound workflow enqueue requests received (before validation).
    /// </summary>
    public static readonly Counter<long> WorkflowRequestsReceived = Meter.CreateCounter<long>(
        "engine.workflows.request.received"
    );

    /// <summary>
    /// Counter of workflow enqueue requests that passed validation and were accepted for processing.
    /// </summary>
    public static readonly Counter<long> WorkflowRequestsAccepted = Meter.CreateCounter<long>(
        "engine.workflows.request.accepted"
    );

    /// <summary>
    /// Counter of workflows that completed successfully.
    /// </summary>
    public static readonly Counter<long> WorkflowsSucceeded = Meter.CreateCounter<long>(
        "engine.workflows.execution.success"
    );

    /// <summary>
    /// Counter of workflows requeued after a retryable failure.
    /// </summary>
    public static readonly Counter<long> WorkflowsRequeued = Meter.CreateCounter<long>(
        "engine.workflows.execution.requeued"
    );

    /// <summary>
    /// Counter of workflows that terminated in a <c>Failed</c> state.
    /// </summary>
    public static readonly Counter<long> WorkflowsFailed = Meter.CreateCounter<long>(
        "engine.workflows.execution.failed"
    );

    /// <summary>
    /// Counter of workflows that terminated in a <c>Canceled</c> state.
    /// </summary>
    public static readonly Counter<long> WorkflowsCanceled = Meter.CreateCounter<long>(
        "engine.workflows.execution.canceled"
    );

    /// <summary>
    /// Counter of terminal workflows resumed for re-processing.
    /// </summary>
    public static readonly Counter<long> WorkflowsResumed = Meter.CreateCounter<long>(
        "engine.workflows.execution.resumed",
        description: "Number of terminal workflows resumed for re-processing"
    );

    /// <summary>
    /// Counter of stale workflows reclaimed from crashed workers.
    /// </summary>
    public static readonly Counter<long> WorkflowsReclaimed = Meter.CreateCounter<long>(
        "engine.workflows.execution.reclaimed",
        description: "Number of stale workflows reclaimed from crashed workers"
    );

    /// <summary>
    /// Counter of in-flight workflows this host abandoned because their lease was reclaimed by another host.
    /// </summary>
    public static readonly Counter<long> WorkflowsLeaseLost = Meter.CreateCounter<long>(
        "engine.workflows.execution.lease_lost",
        description: "Number of in-flight workflows this host abandoned because their lease was reclaimed by another host"
    );

    /// <summary>
    /// Counter of fetched workflows skipped because they were already in-flight on this host (DbMaintenance reclaim race).
    /// </summary>
    public static readonly Counter<long> WorkflowFetchRaceDropped = Meter.CreateCounter<long>(
        "engine.workflows.fetch.race_dropped",
        description: "Number of fetched workflows skipped because they were already in-flight on this host (DbMaintenance reclaim race)"
    );

    /// <summary>
    /// Histogram of seconds a workflow waited in the queue before this attempt was picked up.
    /// </summary>
    public static readonly Histogram<double> WorkflowQueueTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.queue",
        "s",
        "Time the workflow waited in the queue before this attempt was picked up by a worker (seconds). Recorded once per attempt."
    );

    /// <summary>
    /// Histogram of seconds spent actively processing a workflow attempt.
    /// </summary>
    public static readonly Histogram<double> WorkflowServiceTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.service",
        "s",
        "Time spent actively processing this workflow attempt (seconds). Includes step execution and database IO. Recorded once per attempt."
    );

    /// <summary>
    /// Histogram of total wall-clock seconds for a workflow attempt (queue + service).
    /// </summary>
    public static readonly Histogram<double> WorkflowTotalTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.total",
        "s",
        "Total wall-clock time of this workflow attempt — queue + service (seconds). Recorded once per attempt."
    );

    /// <summary>
    /// Counter of step requests accepted for execution.
    /// </summary>
    public static readonly Counter<long> StepRequestsAccepted = Meter.CreateCounter<long>(
        "engine.steps.request.accepted"
    );

    /// <summary>
    /// Counter of steps that completed successfully.
    /// </summary>
    public static readonly Counter<long> StepsSucceeded = Meter.CreateCounter<long>("engine.steps.execution.success");

    /// <summary>
    /// Counter of steps requeued after a retryable failure.
    /// </summary>
    public static readonly Counter<long> StepsRequeued = Meter.CreateCounter<long>("engine.steps.execution.requeued");

    /// <summary>
    /// Counter of steps that terminated in failure.
    /// </summary>
    public static readonly Counter<long> StepsFailed = Meter.CreateCounter<long>("engine.steps.execution.failed");

    /// <summary>
    /// Histogram of seconds between the prior step finishing and this step beginning execution.
    /// </summary>
    public static readonly Histogram<double> StepQueueTime = Meter.CreateHistogram<double>(
        "engine.steps.time.queue",
        "s",
        "Time between the prior step finishing (or the workflow attempt starting, for the first step) and this step beginning execution (seconds). Mostly captures engine-internal database IO. Recorded once per step per attempt."
    );

    /// <summary>
    /// Histogram of seconds spent actively executing a step (command execution + DB IO).
    /// </summary>
    public static readonly Histogram<double> StepServiceTime = Meter.CreateHistogram<double>(
        "engine.steps.time.service",
        "s",
        "Time spent actively executing this step (seconds). Includes command execution and database IO. Recorded once per step per attempt."
    );

    /// <summary>
    /// Histogram of total seconds for a step within the workflow attempt (queue + service).
    /// </summary>
    public static readonly Histogram<double> StepTotalTime = Meter.CreateHistogram<double>(
        "engine.steps.time.total",
        "s",
        "Total time for this step within the workflow attempt — queue + service (seconds). Recorded once per step per attempt."
    );

    /// <summary>
    /// Counter of redundant status updates eliminated by deduplication in the update buffer.
    /// </summary>
    public static readonly Counter<long> UpdateBufferDeduplicatedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.deduplicated",
        description: "Number of redundant status updates eliminated by deduplication in the update buffer"
    );

    /// <summary>
    /// Counter of fire-and-forget status updates dropped because the update buffer channel was full.
    /// </summary>
    public static readonly Counter<long> UpdateBufferDroppedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.dropped",
        description: "Number of fire-and-forget status updates dropped because the update buffer channel was full"
    );

    /// <summary>
    /// Counter of workflow status updates actually written to the database after deduplication.
    /// </summary>
    public static readonly Counter<long> UpdateBufferFlushedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.flushed",
        description: "Number of workflow status updates actually written to the database after deduplication"
    );

    /// <summary>
    /// Counter of database operations that succeeded.
    /// </summary>
    public static readonly Counter<long> DbOperationsSucceeded = Meter.CreateCounter<long>(
        "engine.db.operations.success"
    );

    /// <summary>
    /// Counter of database operations that were requeued for retry.
    /// </summary>
    public static readonly Counter<long> DbOperationsRequeued = Meter.CreateCounter<long>(
        "engine.db.operations.requeued"
    );

    /// <summary>
    /// Counter of database operations that failed terminally.
    /// </summary>
    public static readonly Counter<long> DbOperationsFailed = Meter.CreateCounter<long>("engine.db.operations.failed");

    private static long _maintenanceConsecutiveFailures;

    /// <summary>
    /// Gauge of consecutive database maintenance failures (0 = healthy).
    /// </summary>
    public static readonly ObservableGauge<long> MaintenanceConsecutiveFailures = Meter.CreateObservableGauge(
        "engine.maintenance.consecutive_failures",
        static () => _maintenanceConsecutiveFailures,
        description: "Number of consecutive database maintenance failures (0 = healthy)"
    );

    private static long _healthStatus; // 0=healthy, 1=degraded, 2=unhealthy

    /// <summary>
    /// Gauge of overall engine health (0=healthy, 1=degraded, 2=unhealthy).
    /// </summary>
    public static readonly ObservableGauge<long> HealthStatus = Meter.CreateObservableGauge(
        "engine.health.status",
        static () => _healthStatus,
        description: "Engine health: 0=healthy, 1=degraded, 2=unhealthy"
    );

    private static long _activeWorkflowsCount;

    /// <summary>
    /// Gauge of currently active workflows (any non-terminal status).
    /// </summary>
    public static readonly ObservableGauge<long> ActiveWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.active",
        static () => _activeWorkflowsCount
    );

    private static long _scheduledWorkflowsCount;

    /// <summary>
    /// Gauge of workflows scheduled for future execution.
    /// </summary>
    public static readonly ObservableGauge<long> ScheduledWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.scheduled",
        static () => _scheduledWorkflowsCount
    );

    private static long _failedWorkflowsCount;

    /// <summary>
    /// Gauge of terminal failed workflows currently retained.
    /// </summary>
    public static readonly ObservableGauge<long> FailedWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.failed",
        static () => _failedWorkflowsCount
    );

    private static long _successfulWorkflowsCount;

    /// <summary>
    /// Gauge of terminal successful workflows currently retained.
    /// </summary>
    public static readonly ObservableGauge<long> SuccessfulWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.successful",
        static () => _successfulWorkflowsCount
    );

    private static long _finishedWorkflowsCount;

    /// <summary>
    /// Gauge of all terminal workflows currently retained (success + failure + canceled + dependency-failed).
    /// </summary>
    public static readonly ObservableGauge<long> FinishedWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.finished",
        static () => _finishedWorkflowsCount
    );

    private static long _availableInboxSlotsCount;

    /// <summary>
    /// Gauge of remaining inbox capacity before the engine reports backpressure.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableInboxSlots = Meter.CreateObservableGauge(
        "engine.slots.inbox.available",
        static () => _availableInboxSlotsCount
    );

    private static long _usedInboxSlotsCount;

    /// <summary>
    /// Gauge of currently consumed inbox slots.
    /// </summary>
    public static readonly ObservableGauge<long> UsedInboxSlots = Meter.CreateObservableGauge(
        "engine.slots.inbox.used",
        static () => _usedInboxSlotsCount
    );

    private static long _availableDbSlotsCount;

    /// <summary>
    /// Gauge of available concurrency slots in the database semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableDbSlots = Meter.CreateObservableGauge(
        "engine.slots.db.available",
        static () => _availableDbSlotsCount
    );

    private static long _usedDbSlotsCount;

    /// <summary>
    /// Gauge of in-use concurrency slots in the database semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> UsedDbSlots = Meter.CreateObservableGauge(
        "engine.slots.db.used",
        static () => _usedDbSlotsCount
    );

    private static long _availableHttpSlotsCount;

    /// <summary>
    /// Gauge of available concurrency slots in the outbound-HTTP semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableHttpSlots = Meter.CreateObservableGauge(
        "engine.slots.http.available",
        static () => _availableHttpSlotsCount
    );

    private static long _usedHttpSlotsCount;

    /// <summary>
    /// Gauge of in-use concurrency slots in the outbound-HTTP semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> UsedHttpSlots = Meter.CreateObservableGauge(
        "engine.slots.http.used",
        static () => _usedHttpSlotsCount
    );

    private static long _availableWorkerSlotsCount;

    /// <summary>
    /// Gauge of available worker slots (concurrent workflow processors).
    /// </summary>
    public static readonly ObservableGauge<long> AvailableWorkerSlots = Meter.CreateObservableGauge(
        "engine.slots.workers.available",
        static () => _availableWorkerSlotsCount
    );

    private static long _usedWorkerSlotsCount;

    /// <summary>
    /// Gauge of in-use worker slots.
    /// </summary>
    public static readonly ObservableGauge<long> UsedWorkerSlots = Meter.CreateObservableGauge(
        "engine.slots.workers.used",
        static () => _usedWorkerSlotsCount
    );

    /// <summary>
    /// Sets the value reported by <see cref="MaintenanceConsecutiveFailures"/>.
    /// </summary>
    public static void SetMaintenanceConsecutiveFailures(int count) => _maintenanceConsecutiveFailures = count;

    /// <summary>
    /// Sets the value reported by <see cref="HealthStatus"/>.
    /// </summary>
    public static void SetHealthStatus(long status) => _healthStatus = status;

    /// <summary>
    /// Sets the value reported by <see cref="ActiveWorkflows"/>.
    /// </summary>
    public static void SetActiveWorkflowsCount(long count) => _activeWorkflowsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="ScheduledWorkflows"/>.
    /// </summary>
    public static void SetScheduledWorkflowsCount(long count) => _scheduledWorkflowsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="FailedWorkflows"/>.
    /// </summary>
    public static void SetFailedWorkflowsCount(long count) => _failedWorkflowsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="SuccessfulWorkflows"/>.
    /// </summary>
    public static void SetSuccessfulWorkflowsCount(long count) => _successfulWorkflowsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="FinishedWorkflows"/>.
    /// </summary>
    public static void SetFinishedWorkflowsCount(long count) => _finishedWorkflowsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="AvailableInboxSlots"/>.
    /// </summary>
    public static void SetAvailableInboxSlots(int count) => _availableInboxSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="UsedInboxSlots"/>.
    /// </summary>
    public static void SetUsedInboxSlots(int count) => _usedInboxSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="AvailableDbSlots"/>.
    /// </summary>
    public static void SetAvailableDbSlots(int count) => _availableDbSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="UsedDbSlots"/>.
    /// </summary>
    public static void SetUsedDbSlots(int count) => _usedDbSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="AvailableHttpSlots"/>.
    /// </summary>
    public static void SetAvailableHttpSlots(int count) => _availableHttpSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="UsedHttpSlots"/>.
    /// </summary>
    public static void SetUsedHttpSlots(int count) => _usedHttpSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="AvailableWorkerSlots"/>.
    /// </summary>
    public static void SetAvailableWorkerSlots(int count) => _availableWorkerSlotsCount = count;

    /// <summary>
    /// Sets the value reported by <see cref="UsedWorkerSlots"/>.
    /// </summary>
    public static void SetUsedWorkerSlots(int count) => _usedWorkerSlotsCount = count;

    /// <summary>
    /// Parses a W3C traceparent string into an <see cref="ActivityContext"/>.
    /// Returns <c>null</c> when the input is null; returns the default context when parsing fails.
    /// </summary>
    public static ActivityContext? ParseTraceContext(string? traceContext)
    {
        if (traceContext is null)
            return null;

        ActivityContext.TryParse(traceContext, null, out var context);
        return context;
    }

    /// <summary>
    /// Projects a single optional <see cref="ActivityContext"/> to an enumerable of <see cref="ActivityLink"/>,
    /// suitable for passing as <c>links</c> when starting a new activity.
    /// </summary>
    public static IEnumerable<ActivityLink> ToActivityLinks(this ActivityContext? context) =>
        context is null ? [] : [new ActivityLink(context.Value)];

    /// <summary>
    /// Projects a sequence of optional <see cref="ActivityContext"/> values to <see cref="ActivityLink"/>,
    /// dropping null entries.
    /// </summary>
    public static IEnumerable<ActivityLink> ToActivityLinks(this IEnumerable<ActivityContext?> contexts) =>
        contexts.OfType<ActivityContext>().Select(x => new ActivityLink(x));

    /// <summary>
    /// Returns the current service version from the entry assembly's
    /// <see cref="AssemblyInformationalVersionAttribute"/> (CI sets this via
    /// <c>-p:InformationalVersion=&lt;short-sha&gt;</c> at publish time), falling back to <c>"dev"</c>
    /// — matching the csproj default — when no entry assembly is resolvable (e.g. some test hosts).
    /// </summary>
    private static string ResolveServiceVersion()
    {
        var fromAssembly = Assembly
            .GetEntryAssembly()
            ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion;
        if (!string.IsNullOrWhiteSpace(fromAssembly))
            return fromAssembly;

        return "dev";
    }
}
