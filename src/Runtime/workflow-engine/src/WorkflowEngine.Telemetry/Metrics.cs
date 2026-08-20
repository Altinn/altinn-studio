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
    /// Counter of workflows parked in <c>Waiting</c> because a step deferred (not a failure signal).
    /// </summary>
    public static readonly Counter<long> WorkflowsDeferred = Meter.CreateCounter<long>(
        "engine.workflows.execution.deferred",
        description: "Number of workflow attempts that ended in Waiting because a step deferred"
    );

    /// <summary>
    /// Counter of workflows that terminated in a <c>Failed</c> state. Tagged with <c>reason</c>
    /// (<c>execution</c> / <c>dependency_failed</c> / <c>poisoned</c> / <c>wait_expired</c>) and
    /// <c>is_head</c> (<c>true</c> / <c>false</c> / <c>unset</c>). Alert on <c>reason</c> in
    /// (<c>execution</c>, <c>poisoned</c>) across all <c>is_head</c> values; <c>is_head</c> is a
    /// routing/severity dimension, not the filter - <c>"false"</c> marks deliberately invisible
    /// workflows (non-blocking side chains) whose terminal failures surface nowhere else. Exclude
    /// <c>dependency_failed</c>: such an increment just mirrors a dependency's failure, which
    /// fires the alert in its own right, and is expected noise. Exclude <c>wait_expired</c> from
    /// the default alert: a step's wait budget running out means the awaited external outcome
    /// never arrived, not that the engine or command failed — route it to the owning team instead.
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
    /// Counter of unsuccessful terminal workflows marked <c>Abandoned</c> (failure written off by a caller).
    /// </summary>
    public static readonly Counter<long> WorkflowsAbandoned = Meter.CreateCounter<long>(
        "engine.workflows.execution.abandoned",
        description: "Number of unsuccessful terminal workflows whose failure was written off by a caller"
    );

    /// <summary>
    /// Counter of parked workflows (<c>Requeued</c> or <c>Waiting</c>) whose pending backoff was cleared
    /// by a caller asking for an immediate re-check. For a <c>Waiting</c> step this is the push signal
    /// that accelerates a poll; it is an optimization, never load-bearing for correctness.
    /// </summary>
    public static readonly Counter<long> WorkflowsNudged = Meter.CreateCounter<long>(
        "engine.workflows.execution.nudged",
        description: "Number of parked workflows whose pending backoff was cleared for an immediate re-check"
    );

    /// <summary>
    /// Counter of stale workflows reclaimed from crashed workers.
    /// </summary>
    public static readonly Counter<long> WorkflowsReclaimed = Meter.CreateCounter<long>(
        "engine.workflows.execution.reclaimed",
        description: "Number of stale workflows reclaimed from crashed workers"
    );

    /// <summary>
    /// Counter of DependencyFailed workflows re-enqueued because their dependencies have since completed.
    /// </summary>
    public static readonly Counter<long> WorkflowsDependencyRecovered = Meter.CreateCounter<long>(
        "engine.workflows.execution.dependency_recovered",
        description: "Number of DependencyFailed workflows re-enqueued because their dependencies have since completed"
    );

    /// <summary>
    /// Counter of in-flight workflows this host gave up processing because their lease was reclaimed by another host.
    /// </summary>
    public static readonly Counter<long> WorkflowsLeaseLost = Meter.CreateCounter<long>(
        "engine.workflows.execution.lease_lost",
        description: "Number of in-flight workflows this host gave up processing because their lease was reclaimed by another host"
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
    /// Counter of step deferrals (successful executions whose awaited outcome was not available yet).
    /// Deliberately separate from <see cref="StepsRequeued"/>/<see cref="StepsFailed"/>: a deferral is not a failure.
    /// </summary>
    public static readonly Counter<long> StepsDeferred = Meter.CreateCounter<long>("engine.steps.execution.deferred");

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
    /// Histogram of wait budget consumed by a deferring step, from its first deferral to the moment it
    /// resolved (completed, expired, or failed). The only signal that shows budgets being approached
    /// rather than blown — compare upper percentiles against the configured <c>command.waitBudget</c>.
    /// </summary>
    public static readonly Histogram<double> StepWaitDuration = Meter.CreateHistogram<double>(
        "engine.steps.wait.duration",
        "s",
        "Wait budget consumed by a deferring step, from first deferral to resolution (seconds). Recorded once per deferring step."
    );

    /// <summary>
    /// Counter of mailboxes minted. Counts creations only: an idempotent replay returns a mailbox that
    /// already exists and creates nothing, so counting it would overstate how many exchanges are open.
    /// </summary>
    public static readonly Counter<long> MailboxesCreated = Meter.CreateCounter<long>(
        "engine.mailboxes.created",
        description: "Number of mailboxes minted (idempotent replays excluded — they create nothing)"
    );

    /// <summary>
    /// Counter of mailboxes closed for deliveries, tagged <c>reason</c> (<c>request</c> when a caller
    /// closed it, <c>deadline</c> when the engine did). Counts the close that actually happened, so an
    /// idempotent repeat does not count twice; the two tag values together with
    /// <see cref="MailboxesCreated"/> are what show whether exchanges conclude on their own or age out.
    /// </summary>
    public static readonly Counter<long> MailboxesClosed = Meter.CreateCounter<long>(
        "engine.mailboxes.closed",
        description: "Number of mailboxes closed for deliveries, tagged by reason (request or deadline)"
    );

    /// <summary>
    /// Counter of messages offered to the delivery endpoint, tagged with <c>outcome</c>: <c>accepted</c>,
    /// <c>duplicate</c>, <c>not_found</c>, <c>closed</c> (too late), <c>log_full</c>, <c>too_large</c>,
    /// <c>invalid</c>. Counted for every outcome, including the ones refused before the mailbox row is locked, so
    /// a storm of oversized or malformed forwards is visible here and not only in HTTP metrics. <c>closed</c> is
    /// the one to watch: a counterparty answered after the exchange had given up on it.
    /// </summary>
    public static readonly Counter<long> MailboxDeliveriesReceived = Meter.CreateCounter<long>(
        "engine.mailboxes.deliveries.received",
        description: "Number of messages offered to the mailbox delivery endpoint, tagged with the outcome"
    );

    /// <summary>
    /// Counter of accepted deliveries that no receiver was ever enqueued for, counted when the mailbox closes at
    /// its deadline. Counted by the deadline sweep rather than by every closure, because a <c>DELETE</c> reports
    /// the same number to a caller who can act on it while a mailbox that aged out has none.
    /// </summary>
    public static readonly Counter<long> MailboxDeliveriesUnconsumed = Meter.CreateCounter<long>(
        "engine.mailboxes.deliveries.unconsumed",
        description: "Number of accepted deliveries no receiver was ever enqueued for, counted when a mailbox closes at its deadline"
    );

    /// <summary>
    /// Counter of receive workflows created, tagged with the state they were born in: <c>delivered</c> (a message
    /// already sat at their position), <c>closed</c> (the mailbox was already closed), or <c>held</c> (parked).
    /// The split is the one number that separates "the relay is running" from "the relay is parked". Counted
    /// after the enqueue transaction commits, so a birth that rolled back is not counted.
    /// </summary>
    public static readonly Counter<long> MailboxReceiversCreated = Meter.CreateCounter<long>(
        "engine.mailboxes.receivers.created",
        description: "Number of mailbox receive workflows created, tagged by the state they were born in"
    );

    /// <summary>
    /// Counter of parked receivers released to run, tagged with <c>cause</c>: <c>delivered</c> when a delivery
    /// landed at the receiver's position, <c>closed</c> when the mailbox closed. Those are the only two things
    /// that release a receiver, so the tag values partition the counter exactly. Counted once per receiver — both
    /// release paths skip a registry row that already carries a release stamp.
    /// </summary>
    public static readonly Counter<long> MailboxReceiversReleased = Meter.CreateCounter<long>(
        "engine.mailboxes.receivers.released",
        description: "Number of parked mailbox receivers released to run, tagged by cause (delivered or closed)"
    );

    /// <summary>
    /// Histogram of wake-to-claim latency: from the instant a receiver was released to the instant a worker first
    /// claimed it — the part <c>NOTIFY</c> accelerates and the fetch cycle bounds.
    /// </summary>
    /// <remarks>
    /// Recorded once per release, by the first claim, so a receiver that fails and retries reports its wake
    /// latency once rather than its whole retry ladder. A receiver born runnable was never woken and is excluded
    /// explicitly, by the registry's <c>held_at</c>. Clamped at zero: the release and the claim are timed on two
    /// pods' clocks.
    /// </remarks>
    public static readonly Histogram<double> MailboxReceiverWakeLatency = Meter.CreateHistogram<double>(
        "engine.mailboxes.receivers.wake_latency",
        "s",
        "Seconds between a mailbox receiver being released and a worker first claiming it. Recorded once per release."
    );

    /// <summary>
    /// Counter of receive workflows the rendezvous could not answer for, tagged with <c>state</c>:
    /// <c>unregistered</c> (the receiver holds no position in its mailbox) or <c>undecided</c> (it became runnable
    /// at a position of an <em>open</em> mailbox with no message standing there).
    /// </summary>
    /// <remarks>
    /// Alert on any value above zero: neither state is a caller's or a counterparty's mistake, so both mean the
    /// engine is violating an invariant of its own rendezvous. Kept apart from the ordinary execution-failed
    /// counter because the two need different people woken up. The affected step fails critically, so the receive
    /// workflow is also visible as <c>Failed</c> on the dashboard.
    /// </remarks>
    public static readonly Counter<long> MailboxRendezvousViolations = Meter.CreateCounter<long>(
        "engine.mailboxes.rendezvous.violations",
        description: "Number of receive workflows the rendezvous could not answer for, tagged by the state that could not be answered"
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

    private static long _waitingWorkflowsCount;

    /// <summary>
    /// Gauge of workflows currently parked in <c>Waiting</c> (deferred steps awaiting an external outcome).
    /// </summary>
    public static readonly ObservableGauge<long> WaitingWorkflows = Meter.CreateObservableGauge(
        "engine.workflows.waiting",
        static () => _waitingWorkflowsCount
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

    private static long _overdueOpenMailboxesCount;

    /// <summary>
    /// Gauge of mailboxes still open past the point the deadline sweep should have closed them — <c>deadline</c>
    /// plus one <c>MailboxSweepInterval</c>, the grace the sweep's own cadence entitles it to.
    /// </summary>
    /// <remarks>
    /// Zero is the only healthy value, and any other is an invariant violation rather than a backlog: behind it
    /// are receivers parked on exchanges nobody will ever conclude. A mass timeout can make it briefly non-zero
    /// while one tick drains, so alert on it staying above zero rather than on it touching it.
    /// </remarks>
    public static readonly ObservableGauge<long> OverdueOpenMailboxes = Meter.CreateObservableGauge(
        "engine.mailboxes.open.overdue",
        static () => _overdueOpenMailboxesCount,
        description: "Number of mailboxes still open more than one sweep cadence past their deadline (0 = healthy)"
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
    /// Sets the value reported by <see cref="WaitingWorkflows"/>.
    /// </summary>
    public static void SetWaitingWorkflowsCount(long count) => _waitingWorkflowsCount = count;

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

    /// <summary>Sets the value reported by <see cref="OverdueOpenMailboxes"/>.</summary>
    public static void SetOverdueOpenMailboxesCount(long count) => _overdueOpenMailboxesCount = count;

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
