using System.Diagnostics;
using System.Diagnostics.Metrics;

// CA1724: Type names should not match namespaces
#pragma warning disable CA1724

namespace WorkflowEngine.Telemetry;

public static class Metrics
{
    public const string ServiceName = "WorkflowEngine";
    public const string ServiceVersion = "1.0.0";
    public static readonly ActivitySource Source = new(ServiceName);
    public static readonly Meter Meter = new(ServiceName);

    public static readonly Counter<long> Errors = Meter.CreateCounter<long>("engine.errors");

    public static readonly Counter<long> EngineMainLoopIterations = Meter.CreateCounter<long>(
        "engine.mainloop.iterations"
    );
    public static readonly Histogram<double> EngineMainLoopQueueTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.queue",
        "s",
        "Amount of time the main loop spent waiting for tasks to complete and/or new workflows to arrive (seconds)."
    );
    public static readonly Histogram<double> EngineMainLoopServiceTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.service",
        "s",
        "Amount of time the main loop spent actively executing workflows and/or database IO (seconds)."
    );
    public static readonly Histogram<double> EngineMainLoopTotalTime = Meter.CreateHistogram<double>(
        "engine.mainloop.time.total",
        "s",
        "Amount of time the main loop spent on a full execution (seconds)."
    );

    public static readonly Counter<long> WorkflowQueriesReceived = Meter.CreateCounter<long>(
        "engine.workflows.query.received"
    );
    public static readonly Counter<long> WorkflowRequestsReceived = Meter.CreateCounter<long>(
        "engine.workflows.request.received"
    );
    public static readonly Counter<long> WorkflowRequestsAccepted = Meter.CreateCounter<long>(
        "engine.workflows.request.accepted"
    );
    public static readonly Counter<long> WorkflowsSucceeded = Meter.CreateCounter<long>(
        "engine.workflows.execution.success"
    );
    public static readonly Counter<long> WorkflowsRequeued = Meter.CreateCounter<long>(
        "engine.workflows.execution.requeued"
    );
    public static readonly Counter<long> WorkflowsFailed = Meter.CreateCounter<long>(
        "engine.workflows.execution.failed"
    );
    public static readonly Counter<long> WorkflowsCanceled = Meter.CreateCounter<long>(
        "engine.workflows.execution.canceled"
    );
    public static readonly Counter<long> WorkflowsResumed = Meter.CreateCounter<long>(
        "engine.workflows.execution.resumed",
        description: "Number of terminal workflows resumed for re-processing"
    );
    public static readonly Counter<long> WorkflowsReclaimed = Meter.CreateCounter<long>(
        "engine.workflows.execution.reclaimed",
        description: "Number of stale workflows reclaimed from crashed workers"
    );
    public static readonly Counter<long> WorkflowsLeaseLost = Meter.CreateCounter<long>(
        "engine.workflows.execution.lease_lost",
        description: "Number of in-flight workflows this host abandoned because their lease was reclaimed by another host"
    );
    public static readonly Counter<long> WorkflowFetchRaceDropped = Meter.CreateCounter<long>(
        "engine.workflows.fetch.race_dropped",
        description: "Number of fetched workflows skipped because they were already in-flight on this host (DbMaintenance reclaim race)"
    );
    public static readonly Histogram<double> WorkflowQueueTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.queue",
        "s",
        "Time the workflow waited in the queue before this attempt was picked up by a worker (seconds). Recorded once per attempt."
    );
    public static readonly Histogram<double> WorkflowServiceTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.service",
        "s",
        "Time spent actively processing this workflow attempt (seconds). Includes step execution and database IO. Recorded once per attempt."
    );
    public static readonly Histogram<double> WorkflowTotalTime = Meter.CreateHistogram<double>(
        "engine.workflows.time.total",
        "s",
        "Total wall-clock time of this workflow attempt — queue + service (seconds). Recorded once per attempt."
    );

    public static readonly Counter<long> StepRequestsAccepted = Meter.CreateCounter<long>(
        "engine.steps.request.accepted"
    );
    public static readonly Counter<long> StepsSucceeded = Meter.CreateCounter<long>("engine.steps.execution.success");
    public static readonly Counter<long> StepsRequeued = Meter.CreateCounter<long>("engine.steps.execution.requeued");
    public static readonly Counter<long> StepsFailed = Meter.CreateCounter<long>("engine.steps.execution.failed");

    public static readonly Histogram<double> StepQueueTime = Meter.CreateHistogram<double>(
        "engine.steps.time.queue",
        "s",
        "Time between the prior step finishing (or the workflow attempt starting, for the first step) and this step beginning execution (seconds). Mostly captures engine-internal database IO. Recorded once per step per attempt."
    );
    public static readonly Histogram<double> StepServiceTime = Meter.CreateHistogram<double>(
        "engine.steps.time.service",
        "s",
        "Time spent actively executing this step (seconds). Includes command execution and database IO. Recorded once per step per attempt."
    );
    public static readonly Histogram<double> StepTotalTime = Meter.CreateHistogram<double>(
        "engine.steps.time.total",
        "s",
        "Total time for this step within the workflow attempt — queue + service (seconds). Recorded once per step per attempt."
    );

    public static readonly Counter<long> UpdateBufferDeduplicatedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.deduplicated",
        description: "Number of redundant status updates eliminated by deduplication in the update buffer"
    );

    public static readonly Counter<long> UpdateBufferDroppedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.dropped",
        description: "Number of fire-and-forget status updates dropped because the update buffer channel was full"
    );

    public static readonly Counter<long> UpdateBufferFlushedItems = Meter.CreateCounter<long>(
        "engine.update_buffer.flushed",
        description: "Number of workflow status updates actually written to the database after deduplication"
    );

    public static readonly Counter<long> DbOperationsSucceeded = Meter.CreateCounter<long>(
        "engine.db.operations.success"
    );
    public static readonly Counter<long> DbOperationsRequeued = Meter.CreateCounter<long>(
        "engine.db.operations.requeued"
    );
    public static readonly Counter<long> DbOperationsFailed = Meter.CreateCounter<long>("engine.db.operations.failed");

    private static long _maintenanceConsecutiveFailures;
    public static readonly ObservableGauge<long> MaintenanceConsecutiveFailures = Meter.CreateObservableGauge(
        "engine.maintenance.consecutive_failures",
        static () => _maintenanceConsecutiveFailures,
        description: "Number of consecutive database maintenance failures (0 = healthy)"
    );

    private static long _healthStatus; // 0=healthy, 1=degraded, 2=unhealthy
    public static readonly ObservableGauge<long> HealthStatus = Meter.CreateObservableGauge(
        "engine.health.status",
        static () => _healthStatus,
        description: "Engine health: 0=healthy, 1=degraded, 2=unhealthy"
    );

    private static long _activeWorkflowsCount;
    public static readonly ObservableGauge<long> ActiveWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.active",
        static () => _activeWorkflowsCount
    );

    private static long _scheduledWorkflowsCount;
    public static readonly ObservableGauge<long> ScheduledWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.scheduled",
        static () => _scheduledWorkflowsCount
    );

    private static long _failedWorkflowsCount;
    public static readonly ObservableGauge<long> FailedWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.failed",
        static () => _failedWorkflowsCount
    );

    private static long _successfulWorkflowsCount;
    public static readonly ObservableGauge<long> SuccessfulWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.successful",
        static () => _successfulWorkflowsCount
    );

    private static long _finishedWorkflowsCount;
    public static readonly ObservableGauge<long> FinishedWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.finished",
        static () => _finishedWorkflowsCount
    );

    private static long _availableInboxSlotsCount;
    public static readonly ObservableGauge<long> AvailableInboxSlots = Meter.CreateObservableGauge(
        "engine.slots.inbox.available",
        static () => _availableInboxSlotsCount
    );

    private static long _usedInboxSlotsCount;
    public static readonly ObservableGauge<long> UsedInboxSlots = Meter.CreateObservableGauge(
        "engine.slots.inbox.used",
        static () => _usedInboxSlotsCount
    );

    private static long _availableDbSlotsCount;
    public static readonly ObservableGauge<long> AvailableDbSlots = Meter.CreateObservableGauge(
        "engine.slots.db.available",
        static () => _availableDbSlotsCount
    );

    private static long _usedDbSlotsCount;
    public static readonly ObservableGauge<long> UsedDbSlots = Meter.CreateObservableGauge(
        "engine.slots.db.used",
        static () => _usedDbSlotsCount
    );

    private static long _availableHttpSlotsCount;
    public static readonly ObservableGauge<long> AvailableHttpSlots = Meter.CreateObservableGauge(
        "engine.slots.http.available",
        static () => _availableHttpSlotsCount
    );

    private static long _usedHttpSlotsCount;
    public static readonly ObservableGauge<long> UsedHttpSlots = Meter.CreateObservableGauge(
        "engine.slots.http.used",
        static () => _usedHttpSlotsCount
    );

    private static long _availableWorkerSlotsCount;
    public static readonly ObservableGauge<long> AvailableWorkerSlots = Meter.CreateObservableGauge(
        "engine.slots.workers.available",
        static () => _availableWorkerSlotsCount
    );

    private static long _usedWorkerSlotsCount;
    public static readonly ObservableGauge<long> UsedWorkerSlots = Meter.CreateObservableGauge(
        "engine.slots.workers.used",
        static () => _usedWorkerSlotsCount
    );

    public static void SetMaintenanceConsecutiveFailures(int count) => _maintenanceConsecutiveFailures = count;

    public static void SetHealthStatus(long status) => _healthStatus = status;

    public static void SetActiveWorkflowsCount(long count) => _activeWorkflowsCount = count;

    public static void SetScheduledWorkflowsCount(long count) => _scheduledWorkflowsCount = count;

    public static void SetFailedWorkflowsCount(long count) => _failedWorkflowsCount = count;

    public static void SetSuccessfulWorkflowsCount(long count) => _successfulWorkflowsCount = count;

    public static void SetFinishedWorkflowsCount(long count) => _finishedWorkflowsCount = count;

    public static void SetAvailableInboxSlots(int count) => _availableInboxSlotsCount = count;

    public static void SetUsedInboxSlots(int count) => _usedInboxSlotsCount = count;

    public static void SetAvailableDbSlots(int count) => _availableDbSlotsCount = count;

    public static void SetUsedDbSlots(int count) => _usedDbSlotsCount = count;

    public static void SetAvailableHttpSlots(int count) => _availableHttpSlotsCount = count;

    public static void SetUsedHttpSlots(int count) => _usedHttpSlotsCount = count;

    public static void SetAvailableWorkerSlots(int count) => _availableWorkerSlotsCount = count;

    public static void SetUsedWorkerSlots(int count) => _usedWorkerSlotsCount = count;

    public static ActivityContext? ParseTraceContext(string? traceContext)
    {
        if (traceContext is null)
            return null;

        ActivityContext.TryParse(traceContext, null, out var context);
        return context;
    }

    public static IEnumerable<ActivityLink> ToActivityLinks(this ActivityContext? context) =>
        context is null ? [] : [new ActivityLink(context.Value)];

    public static IEnumerable<ActivityLink> ToActivityLinks(this IEnumerable<ActivityContext?> contexts) =>
        contexts.OfType<ActivityContext>().Select(x => new ActivityLink(x));
}
