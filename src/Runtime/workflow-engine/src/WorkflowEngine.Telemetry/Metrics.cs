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
    /// The name of the engine's <see cref="ActivitySource"/> and <see cref="Meter"/>, and the <c>service.name</c>
    /// resource attribute when the deployment sets neither <c>OTEL_SERVICE_NAME</c> nor <c>service.name</c> in
    /// <c>OTEL_RESOURCE_ATTRIBUTES</c>.
    /// </summary>
    public const string ServiceName = "WorkflowEngine";

    /// <summary>
    /// Service version reported on the engine's resource attributes.
    /// </summary>
    public static readonly string ServiceVersion = ResolveServiceVersion();

    /// <summary>
    /// The <c>service.instance.id</c> resource attribute when the deployment sets none in
    /// <c>OTEL_RESOURCE_ATTRIBUTES</c>: a UUID generated once per process, so a restart gets a new one even inside
    /// the same pod, and every trace, metric and log the process exports carries the same value.
    /// </summary>
    public static readonly string ServiceInstanceId = Guid.NewGuid().ToString();

    /// <summary>
    /// Activity source for engine-emitted spans (workflow lifecycle, step lifecycle, DB IO).
    /// </summary>
    public static readonly ActivitySource Source = new(ServiceName);

    /// <summary>
    /// Meter that owns every engine-emitted counter, histogram, and observable gauge.
    /// </summary>
    public static readonly Meter Meter = new(ServiceName);

    private static readonly double _processStartTime = ResolveProcessStartTime();

    /// <summary>
    /// Gauge of the time this process started, in seconds since the Unix epoch, reported at every collection
    /// whether or not the engine is doing anything. With <see cref="ServiceInstanceId"/> it gives a dashboard the
    /// processes reporting, a mark for each restart or scale-up, and, as the earliest start per
    /// <c>service.version</c>, a mark for each deploy.
    /// </summary>
    /// <remarks>
    /// The one engine metric outside <c>altinn.workflow_engine.</c>, on purpose: every Studio service reports its
    /// start time under this same name, as item 18 of the proposed observability standard
    /// (<see href="https://github.com/Altinn/altinn-studio/issues/21073">#21073</see>) decides.
    /// </remarks>
    public static readonly ObservableGauge<double> WorkloadStartTime = Meter.CreateObservableGauge(
        "altinn.workload.start_time",
        static () => _processStartTime,
        unit: "s",
        description: "Process start time in seconds since the Unix epoch."
    );

    /// <summary>
    /// Counter of generic engine-side errors that don't have a more specific instrument.
    /// </summary>
    public static readonly Counter<long> Errors = Meter.CreateCounter<long>(
        "altinn.workflow_engine.errors",
        unit: "{error}"
    );

    /// <summary>
    /// Counter incremented once per main-loop iteration. Useful for liveness alerts.
    /// </summary>
    public static readonly Counter<long> EngineMainLoopIterations = Meter.CreateCounter<long>(
        "altinn.workflow_engine.main_loop.iterations",
        unit: "{iteration}"
    );

    /// <summary>
    /// Histogram of seconds the main loop spent waiting for tasks to complete and/or new workflows to arrive.
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopQueueTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.main_loop.wait.duration",
        "s",
        "Amount of time the main loop spent waiting for tasks to complete and/or new workflows to arrive (seconds)."
    );

    /// <summary>
    /// Histogram of seconds the main loop spent actively executing workflows and/or database IO.
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopServiceTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.main_loop.processing.duration",
        "s",
        "Amount of time the main loop spent actively executing workflows and/or database IO (seconds)."
    );

    /// <summary>
    /// Histogram of seconds the main loop spent on a full execution (wait + processing).
    /// </summary>
    public static readonly Histogram<double> EngineMainLoopTotalTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.main_loop.duration",
        "s",
        "Amount of time the main loop spent on a full execution (seconds)."
    );

    /// <summary>
    /// Counter of inbound workflow query requests received (list/get endpoints).
    /// </summary>
    public static readonly Counter<long> WorkflowQueriesReceived = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.query.received",
        unit: "{request}"
    );

    /// <summary>
    /// Counter of inbound workflow enqueue requests received (before validation).
    /// </summary>
    public static readonly Counter<long> WorkflowRequestsReceived = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.request.received",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of workflow enqueue requests that passed validation and were accepted for processing.
    /// </summary>
    public static readonly Counter<long> WorkflowRequestsAccepted = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.request.accepted",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of workflows that completed successfully.
    /// </summary>
    public static readonly Counter<long> WorkflowsSucceeded = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.success",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of workflows requeued after a retryable failure.
    /// </summary>
    public static readonly Counter<long> WorkflowsRequeued = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.requeued",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of workflows parked in <c>Waiting</c> because a step deferred (not a failure signal).
    /// </summary>
    public static readonly Counter<long> WorkflowsDeferred = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.deferred",
        unit: "{workflow}",
        description: "Number of workflow attempts that ended in Waiting because a step deferred"
    );

    /// <summary>
    /// Counter of workflows that terminated in a <c>Failed</c> state. Tagged with
    /// <c>altinn.workflow_engine.reason</c> (<c>execution</c> / <c>dependency_failed</c> / <c>poisoned</c> /
    /// <c>wait_expired</c> / <c>manual</c>) and <c>altinn.workflow_engine.workflow.is_head</c> (<c>true</c> /
    /// <c>false</c> / <c>unset</c>). Alert on <c>altinn.workflow_engine.reason</c> in (<c>execution</c>,
    /// <c>poisoned</c>) across all <c>altinn.workflow_engine.workflow.is_head</c> values; the head attribute is a
    /// routing/severity dimension, not the filter - <c>"false"</c> marks auxiliary workflows,
    /// whose terminal failures gate nothing and surface nowhere else. Exclude
    /// <c>dependency_failed</c>: such an increment just mirrors a dependency's failure, which
    /// fires the alert in its own right, and is expected noise. Exclude <c>wait_expired</c> from
    /// the default alert: a step's wait budget running out means the awaited external outcome
    /// never arrived, not that the engine or command failed — route it to the owning team instead.
    /// Exclude <c>manual</c> as well: a caller failed a parked workflow on purpose through the fail
    /// endpoint (the dashboard's Fail button included).
    /// </summary>
    public static readonly Counter<long> WorkflowsFailed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.failed",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of workflows that terminated in a <c>Canceled</c> state.
    /// </summary>
    public static readonly Counter<long> WorkflowsCanceled = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.canceled",
        unit: "{workflow}"
    );

    /// <summary>
    /// Counter of terminal workflows resumed for re-processing.
    /// </summary>
    public static readonly Counter<long> WorkflowsResumed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.resumed",
        unit: "{workflow}",
        description: "Number of terminal workflows resumed for re-processing"
    );

    /// <summary>
    /// Counter of unsuccessful terminal workflows marked <c>Abandoned</c> (failure written off by a caller).
    /// </summary>
    public static readonly Counter<long> WorkflowsAbandoned = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.abandoned",
        unit: "{workflow}",
        description: "Number of unsuccessful terminal workflows whose failure was written off by a caller"
    );

    /// <summary>
    /// Counter of parked workflows (<c>Requeued</c> or <c>Waiting</c>) whose pending backoff was cleared
    /// by a caller asking for an immediate re-check. For a <c>Waiting</c> step this is the push signal
    /// that accelerates a poll; it is an optimization, never load-bearing for correctness.
    /// </summary>
    public static readonly Counter<long> WorkflowsNudged = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.nudged",
        unit: "{workflow}",
        description: "Number of parked workflows whose pending backoff was cleared for an immediate re-check"
    );

    /// <summary>
    /// Counter of stale workflows reclaimed from crashed workers.
    /// </summary>
    public static readonly Counter<long> WorkflowsReclaimed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.reclaimed",
        unit: "{workflow}",
        description: "Number of stale workflows reclaimed from crashed workers"
    );

    /// <summary>
    /// Counter of DependencyFailed workflows re-enqueued because their dependencies have since completed.
    /// </summary>
    public static readonly Counter<long> WorkflowsDependencyRecovered = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.dependency_recovered",
        unit: "{workflow}",
        description: "Number of DependencyFailed workflows re-enqueued because their dependencies have since completed"
    );

    /// <summary>
    /// Counter of in-flight workflows this host gave up processing because their lease was reclaimed by another host.
    /// </summary>
    public static readonly Counter<long> WorkflowsLeaseLost = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.execution.lease_lost",
        unit: "{workflow}",
        description: "Number of in-flight workflows this host gave up processing because their lease was reclaimed by another host"
    );

    /// <summary>
    /// Counter of fetched workflows skipped because they were already in-flight on this host (DbMaintenance reclaim race).
    /// </summary>
    public static readonly Counter<long> WorkflowFetchRaceDropped = Meter.CreateCounter<long>(
        "altinn.workflow_engine.workflow.fetch.race_dropped",
        unit: "{workflow}",
        description: "Number of fetched workflows skipped because they were already in-flight on this host (DbMaintenance reclaim race)"
    );

    /// <summary>
    /// Histogram of seconds a workflow waited in the queue before this attempt was picked up.
    /// </summary>
    public static readonly Histogram<double> WorkflowQueueTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.workflow.queue.duration",
        "s",
        "Time the workflow waited in the queue before this attempt was picked up by a worker (seconds). Recorded once per attempt."
    );

    /// <summary>
    /// Histogram of seconds spent actively processing a workflow attempt.
    /// </summary>
    public static readonly Histogram<double> WorkflowServiceTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.workflow.processing.duration",
        "s",
        "Time spent actively processing this workflow attempt (seconds). Includes step execution and database IO. Recorded once per attempt."
    );

    /// <summary>
    /// Histogram of total wall-clock seconds for a workflow attempt (queue + processing).
    /// </summary>
    public static readonly Histogram<double> WorkflowTotalTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.workflow.duration",
        "s",
        "Total wall-clock time of this workflow attempt — queue + processing (seconds). Recorded once per attempt."
    );

    /// <summary>
    /// Counter of step requests accepted for execution.
    /// </summary>
    public static readonly Counter<long> StepRequestsAccepted = Meter.CreateCounter<long>(
        "altinn.workflow_engine.step.request.accepted",
        unit: "{step}"
    );

    /// <summary>
    /// Counter of steps that completed successfully.
    /// </summary>
    public static readonly Counter<long> StepsSucceeded = Meter.CreateCounter<long>(
        "altinn.workflow_engine.step.execution.success",
        unit: "{step}"
    );

    /// <summary>
    /// Counter of steps requeued after a retryable failure.
    /// </summary>
    public static readonly Counter<long> StepsRequeued = Meter.CreateCounter<long>(
        "altinn.workflow_engine.step.execution.requeued",
        unit: "{step}"
    );

    /// <summary>
    /// Counter of step deferrals (successful executions whose awaited outcome was not available yet).
    /// Deliberately separate from <see cref="StepsRequeued"/>/<see cref="StepsFailed"/>: a deferral is not a failure.
    /// </summary>
    public static readonly Counter<long> StepsDeferred = Meter.CreateCounter<long>(
        "altinn.workflow_engine.step.execution.deferred",
        unit: "{step}"
    );

    /// <summary>
    /// Counter of steps that terminated in failure.
    /// </summary>
    public static readonly Counter<long> StepsFailed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.step.execution.failed",
        unit: "{step}"
    );

    /// <summary>
    /// Histogram of seconds between the prior step finishing and this step beginning execution.
    /// </summary>
    public static readonly Histogram<double> StepQueueTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.step.queue.duration",
        "s",
        "Time between the prior step finishing (or the workflow attempt starting, for the first step) and this step beginning execution (seconds). Mostly captures engine-internal database IO. Recorded once per step per attempt."
    );

    /// <summary>
    /// Histogram of seconds spent actively executing a step (command execution + DB IO).
    /// </summary>
    public static readonly Histogram<double> StepServiceTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.step.processing.duration",
        "s",
        "Time spent actively executing this step (seconds). Includes command execution and database IO. Recorded once per step per attempt."
    );

    /// <summary>
    /// Histogram of total seconds for a step within the workflow attempt (queue + processing).
    /// </summary>
    public static readonly Histogram<double> StepTotalTime = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.step.duration",
        "s",
        "Total time for this step within the workflow attempt — queue + processing (seconds). Recorded once per step per attempt."
    );

    /// <summary>
    /// Histogram of wait budget consumed by a deferring step, from its first deferral to the moment it
    /// resolved (completed, expired, or failed). The only signal that shows budgets being approached
    /// rather than blown — compare upper percentiles against the configured <c>command.waitBudget</c>.
    /// </summary>
    public static readonly Histogram<double> StepWaitDuration = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.step.wait.duration",
        "s",
        "Wait budget consumed by a deferring step, from first deferral to resolution (seconds). Recorded once per deferring step."
    );

    /// <summary>An idempotent replay creates nothing, so counting it would overstate how many exchanges are open.</summary>
    public static readonly Counter<long> MailboxesCreated = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.created",
        unit: "{mailbox}",
        description: "Number of mailboxes minted (idempotent replays excluded — they create nothing)"
    );

    /// <summary>Counts the close that actually happened, so an idempotent repeat does not count twice.</summary>
    public static readonly Counter<long> MailboxesClosed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.closed",
        unit: "{mailbox}",
        description: "Number of mailboxes closed for deliveries, tagged by reason (request or deadline)"
    );

    /// <summary>
    /// Every outcome, pre-lock refusals included. <c>closed</c> is the one to watch: a counterparty answered
    /// after the exchange gave up on it.
    /// </summary>
    public static readonly Counter<long> MailboxDeliveriesReceived = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.delivery.received",
        unit: "{delivery}",
        description: "Number of messages offered to the mailbox delivery endpoint, tagged with the outcome"
    );

    /// <summary>The deadline is the one closure with no caller to report the number to.</summary>
    public static readonly Counter<long> MailboxDeliveriesUnpaired = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.delivery.unpaired",
        unit: "{delivery}",
        description: "Number of accepted deliveries no receiver was ever enqueued for, counted when a mailbox closes at its deadline"
    );

    /// <summary>
    /// The birth state separates "the relay is running" from "the relay is parked". Counted after commit, so a
    /// rolled-back birth is not counted.
    /// </summary>
    public static readonly Counter<long> MailboxReceiversCreated = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.receiver.created",
        unit: "{receiver}",
        description: "Number of mailbox receive workflows created, tagged by the state they were born in"
    );

    /// <summary>
    /// <c>delivered</c> and <c>closed</c> are the only two causes, so the tags partition it. Counted once per
    /// receiver: both release paths skip stamped rows.
    /// </summary>
    public static readonly Counter<long> MailboxReceiversReleased = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.receiver.released",
        unit: "{receiver}",
        description: "Number of parked mailbox receivers released to run, tagged by cause (delivered or closed)"
    );

    /// <summary>
    /// The part <c>NOTIFY</c> accelerates and the fetch cycle bounds. A receiver born runnable is excluded via
    /// <c>held_at</c>. Clamped at zero: the two ends come from two pods' clocks.
    /// </summary>
    public static readonly Histogram<double> MailboxReceiverWakeLatency = Meter.CreateHistogram<double>(
        "altinn.workflow_engine.mailbox.receiver.wake.duration",
        "s",
        "Seconds between a mailbox receiver being released and a worker first claiming it. Recorded once per release."
    );

    /// <summary>
    /// Alert on any value above zero: both <c>unregistered</c> and <c>undecided</c> mean the engine is violating
    /// its own rendezvous invariant, which the ordinary execution-failed counter would not distinguish.
    /// </summary>
    public static readonly Counter<long> MailboxRendezvousViolations = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox.rendezvous.violations",
        unit: "{violation}",
        description: "Number of receive workflows the rendezvous could not answer for, tagged by the state that could not be answered"
    );

    /// <summary>
    /// Counter of redundant status updates eliminated by deduplication in the update buffer.
    /// </summary>
    public static readonly Counter<long> UpdateBufferDeduplicatedItems = Meter.CreateCounter<long>(
        "altinn.workflow_engine.update_buffer.deduplicated",
        unit: "{update}",
        description: "Number of redundant status updates eliminated by deduplication in the update buffer"
    );

    /// <summary>
    /// Counter of fire-and-forget status updates dropped because the update buffer channel was full.
    /// </summary>
    public static readonly Counter<long> UpdateBufferDroppedItems = Meter.CreateCounter<long>(
        "altinn.workflow_engine.update_buffer.dropped",
        unit: "{update}",
        description: "Number of fire-and-forget status updates dropped because the update buffer channel was full"
    );

    /// <summary>
    /// Counter of workflow status updates actually written to the database after deduplication.
    /// </summary>
    public static readonly Counter<long> UpdateBufferFlushedItems = Meter.CreateCounter<long>(
        "altinn.workflow_engine.update_buffer.flushed",
        unit: "{update}",
        description: "Number of workflow status updates actually written to the database after deduplication"
    );

    /// <summary>
    /// Counter of mailbox <b>requests</b> answered by a batch flush, tagged with
    /// <c>altinn.workflow_engine.mailbox.operation</c> (<c>mint</c>, <c>close</c> or <c>delivery</c>) — requests
    /// rather than flushes, counted once the batch's database work has returned without faulting. Divide by
    /// <see cref="MailboxBufferFlushedBatches"/> over the same window and operation for the mean batch size.
    /// </summary>
    public static readonly Counter<long> MailboxBufferFlushedItems = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox_buffer.flushed",
        unit: "{request}",
        description: "Number of mailbox requests answered by a batch flush — one per request, not per flush — tagged by operation (mint, close, delivery). Divide by altinn.workflow_engine.mailbox_buffer.batches for the mean batch size"
    );

    /// <summary>
    /// Counter of mailbox <b>batch flushes</b>, one per flush whatever its size, tagged with
    /// <c>altinn.workflow_engine.mailbox.operation</c> (<c>mint</c>, <c>close</c> or <c>delivery</c>). The
    /// denominator of <see cref="MailboxBufferFlushedItems"/> ÷ this, the mean batch size — the only thing the
    /// engine emits that says whether requests are actually being batched. Recorded at exactly the same point as
    /// the numerator, so a flush that faulted answers nobody and counts in neither.
    /// </summary>
    /// <remarks>
    /// Named <c>batches</c> rather than <c>flushes</c> on purpose: it counts what
    /// <see cref="MailboxBufferFlushedItems"/> counts the contents of, and a name one letter from <c>flushed</c>
    /// carrying different units is a ratio silently misread as 1.00.
    /// </remarks>
    public static readonly Counter<long> MailboxBufferFlushedBatches = Meter.CreateCounter<long>(
        "altinn.workflow_engine.mailbox_buffer.batches",
        unit: "{batch}",
        description: "Number of mailbox batch flushes — one per flush whatever its size, not per request — tagged by operation (mint, close, delivery). The denominator of altinn.workflow_engine.mailbox_buffer.flushed for the mean batch size"
    );

    /// <summary>
    /// Counter of database operations that succeeded.
    /// </summary>
    public static readonly Counter<long> DbOperationsSucceeded = Meter.CreateCounter<long>(
        "altinn.workflow_engine.db.operation.success",
        unit: "{operation}"
    );

    /// <summary>
    /// Counter of database operations that were requeued for retry.
    /// </summary>
    public static readonly Counter<long> DbOperationsRequeued = Meter.CreateCounter<long>(
        "altinn.workflow_engine.db.operation.requeued",
        unit: "{operation}"
    );

    /// <summary>
    /// Counter of database operations that failed terminally.
    /// </summary>
    public static readonly Counter<long> DbOperationsFailed = Meter.CreateCounter<long>(
        "altinn.workflow_engine.db.operation.failed",
        unit: "{operation}"
    );

    /// <summary>
    /// Counter of namespace circuit breaker trips, tagged with <c>altinn.workflow_engine.namespace</c> —
    /// including re-trips from a failed recovery. Namespace is a safe tag here: trips are rare events whose
    /// cardinality is bounded by incident count, not fleet size (a documented decision in the
    /// failure-throttling ADR).
    /// </summary>
    public static readonly Counter<long> ThrottleTripped = Meter.CreateCounter<long>(
        "altinn.workflow_engine.throttle.tripped",
        unit: "{trip}",
        description: "Number of namespace circuit breaker trips, including re-trips from failed recovery"
    );

    /// <summary>
    /// Counter of throttle window extensions (every canary failed its probe), tagged with
    /// <c>altinn.workflow_engine.namespace</c>.
    /// </summary>
    public static readonly Counter<long> ThrottleExtended = Meter.CreateCounter<long>(
        "altinn.workflow_engine.throttle.extended",
        unit: "{extension}",
        description: "Number of throttle window extensions after unanimous canary failure"
    );

    /// <summary>
    /// Counter of workflows released from throttling in recovery cohorts, tagged with
    /// <c>altinn.workflow_engine.namespace</c>.
    /// Incremented by the cohort size actually released, not by 1 per cohort.
    /// </summary>
    public static readonly Counter<long> ThrottleCohortReleased = Meter.CreateCounter<long>(
        "altinn.workflow_engine.throttle.released",
        unit: "{workflow}",
        description: "Number of workflows released from throttling in recovery cohorts"
    );

    /// <summary>
    /// Counter of namespace circuit breakers cleared after successful recovery, tagged with
    /// <c>altinn.workflow_engine.namespace</c>.
    /// </summary>
    public static readonly Counter<long> ThrottleCleared = Meter.CreateCounter<long>(
        "altinn.workflow_engine.throttle.cleared",
        unit: "{breaker}",
        description: "Number of namespace circuit breakers cleared after successful recovery"
    );

    /// <summary>
    /// Counter of workflows parked cooperatively by the workflow handler — a retryable failure in
    /// a namespace whose breaker was tripped in the handler's snapshot — tagged with
    /// <c>altinn.workflow_engine.namespace</c>.
    /// The sweep's own parking is not counted here.
    /// </summary>
    public static readonly Counter<long> ThrottleHandlerParked = Meter.CreateCounter<long>(
        "altinn.workflow_engine.throttle.handler_parked",
        unit: "{workflow}",
        description: "Number of workflows parked by the workflow handler on retryable failure in a tripped namespace"
    );

    private static long _trippedThrottleBreakersCount;

    /// <summary>
    /// Gauge of namespace circuit breakers currently in the Tripped state.
    /// </summary>
    public static readonly ObservableGauge<long> TrippedThrottleBreakers = Meter.CreateObservableGauge(
        "altinn.workflow_engine.throttle.breaker.tripped",
        static () => _trippedThrottleBreakersCount,
        unit: "{breaker}",
        description: "Number of namespace circuit breakers currently tripped"
    );

    private static long _maintenanceConsecutiveFailures;

    /// <summary>
    /// Gauge of consecutive database maintenance failures (0 = healthy).
    /// </summary>
    public static readonly ObservableGauge<long> MaintenanceConsecutiveFailures = Meter.CreateObservableGauge(
        "altinn.workflow_engine.maintenance.consecutive_failures",
        static () => _maintenanceConsecutiveFailures,
        unit: "{failure}",
        description: "Number of consecutive database maintenance failures (0 = healthy)"
    );

    private static long _healthStatus; // 0=healthy, 1=degraded, 2=unhealthy

    /// <summary>
    /// Gauge of overall engine health (0=healthy, 1=degraded, 2=unhealthy).
    /// </summary>
    public static readonly ObservableGauge<long> HealthStatus = Meter.CreateObservableGauge(
        "altinn.workflow_engine.health.status",
        static () => _healthStatus,
        description: "Engine health: 0=healthy, 1=degraded, 2=unhealthy"
    );

    private static long _activeWorkflowsCount;

    /// <summary>
    /// Gauge of currently active workflows (any non-terminal status).
    /// </summary>
    public static readonly ObservableGauge<long> ActiveWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.active",
        static () => _activeWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _scheduledWorkflowsCount;

    /// <summary>
    /// Gauge of workflows scheduled for future execution.
    /// </summary>
    public static readonly ObservableGauge<long> ScheduledWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.scheduled",
        static () => _scheduledWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _waitingWorkflowsCount;

    /// <summary>
    /// Gauge of workflows currently parked in <c>Waiting</c> (deferred steps awaiting an external outcome).
    /// </summary>
    public static readonly ObservableGauge<long> WaitingWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.waiting",
        static () => _waitingWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _failedWorkflowsCount;

    /// <summary>
    /// Gauge of terminal failed workflows currently retained.
    /// </summary>
    public static readonly ObservableGauge<long> FailedWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.failed",
        static () => _failedWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _successfulWorkflowsCount;

    /// <summary>
    /// Gauge of terminal successful workflows currently retained.
    /// </summary>
    public static readonly ObservableGauge<long> SuccessfulWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.successful",
        static () => _successfulWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _finishedWorkflowsCount;

    /// <summary>
    /// Gauge of all terminal workflows currently retained (success + failure + canceled + dependency-failed).
    /// </summary>
    public static readonly ObservableGauge<long> FinishedWorkflows = Meter.CreateObservableGauge(
        "altinn.workflow_engine.workflow.finished",
        static () => _finishedWorkflowsCount,
        unit: "{workflow}"
    );

    private static long _overdueOpenMailboxesCount;

    /// <summary>
    /// The cutoff is the deadline plus one <c>MailboxSweepInterval</c> — the grace the sweep's cadence entitles
    /// it to. Zero is the only healthy value; alert on it staying above zero.
    /// </summary>
    public static readonly ObservableGauge<long> OverdueOpenMailboxes = Meter.CreateObservableGauge(
        "altinn.workflow_engine.mailbox.open.overdue",
        static () => _overdueOpenMailboxesCount,
        unit: "{mailbox}",
        description: "Number of mailboxes still open more than one sweep cadence past their deadline (0 = healthy)"
    );

    private static long _mailboxMintBufferDepth;
    private static long _mailboxCloseBufferDepth;
    private static long _mailboxDeliveryBufferDepth;

    /// <summary>
    /// Gauge of mailbox requests waiting for a batch flush, tagged with
    /// <c>altinn.workflow_engine.mailbox.operation</c> (<c>mint</c>, <c>close</c> or <c>delivery</c>). Read it as
    /// latency rather than as capacity — the queues wait rather than refuse when full — and read only the
    /// sustained value: it is a coarse sample, written once per
    /// <c>MetricsCollectionInterval</c> over a queue that fills and drains between flushes, so a zero is no
    /// evidence the queue never filled and this cannot show whether requests are being batched at all.
    /// <see cref="MailboxBufferFlushedItems"/> ÷ <see cref="MailboxBufferFlushedBatches"/> is what shows that.
    /// </summary>
    public static readonly ObservableGauge<long> MailboxBufferDepth = Meter.CreateObservableGauge(
        "altinn.workflow_engine.mailbox_buffer.depth",
        static () =>
            new Measurement<long>[]
            {
                new(
                    _mailboxMintBufferDepth,
                    new KeyValuePair<string, object?>(TelemetryAttributes.MailboxOperation, "mint")
                ),
                new(
                    _mailboxCloseBufferDepth,
                    new KeyValuePair<string, object?>(TelemetryAttributes.MailboxOperation, "close")
                ),
                new(
                    _mailboxDeliveryBufferDepth,
                    new KeyValuePair<string, object?>(TelemetryAttributes.MailboxOperation, "delivery")
                ),
            },
        unit: "{request}",
        description: "Number of mailbox requests waiting for a batch flush, tagged by operation (mint, close, delivery)"
    );

    private static long _availableInboxSlotsCount;

    /// <summary>
    /// Gauge of remaining inbox capacity before the engine reports backpressure.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableInboxSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.inbox.available",
        static () => _availableInboxSlotsCount,
        unit: "{slot}"
    );

    private static long _usedInboxSlotsCount;

    /// <summary>
    /// Gauge of currently consumed inbox slots.
    /// </summary>
    public static readonly ObservableGauge<long> UsedInboxSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.inbox.used",
        static () => _usedInboxSlotsCount,
        unit: "{slot}"
    );

    private static long _availableDbSlotsCount;

    /// <summary>
    /// Gauge of available concurrency slots in the database semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableDbSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.db.available",
        static () => _availableDbSlotsCount,
        unit: "{slot}"
    );

    private static long _usedDbSlotsCount;

    /// <summary>
    /// Gauge of in-use concurrency slots in the database semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> UsedDbSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.db.used",
        static () => _usedDbSlotsCount,
        unit: "{slot}"
    );

    private static long _availableHttpSlotsCount;

    /// <summary>
    /// Gauge of available concurrency slots in the outbound-HTTP semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> AvailableHttpSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.http.available",
        static () => _availableHttpSlotsCount,
        unit: "{slot}"
    );

    private static long _usedHttpSlotsCount;

    /// <summary>
    /// Gauge of in-use concurrency slots in the outbound-HTTP semaphore pool.
    /// </summary>
    public static readonly ObservableGauge<long> UsedHttpSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.http.used",
        static () => _usedHttpSlotsCount,
        unit: "{slot}"
    );

    private static long _availableWorkerSlotsCount;

    /// <summary>
    /// Gauge of available worker slots (concurrent workflow processors).
    /// </summary>
    public static readonly ObservableGauge<long> AvailableWorkerSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.worker.available",
        static () => _availableWorkerSlotsCount,
        unit: "{slot}"
    );

    private static long _usedWorkerSlotsCount;

    /// <summary>
    /// Gauge of in-use worker slots.
    /// </summary>
    public static readonly ObservableGauge<long> UsedWorkerSlots = Meter.CreateObservableGauge(
        "altinn.workflow_engine.slot.worker.used",
        static () => _usedWorkerSlotsCount,
        unit: "{slot}"
    );

    /// <summary>
    /// Sets the value reported by <see cref="MaintenanceConsecutiveFailures"/>.
    /// </summary>
    public static void SetMaintenanceConsecutiveFailures(int count) => _maintenanceConsecutiveFailures = count;

    /// <summary>
    /// Sets the value reported by <see cref="TrippedThrottleBreakers"/>.
    /// </summary>
    public static void SetTrippedThrottleBreakersCount(long count) => _trippedThrottleBreakersCount = count;

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
    /// Sets the three values reported by <see cref="MailboxBufferDepth"/>.
    /// </summary>
    public static void SetMailboxBufferDepths(int mint, int close, int delivery)
    {
        _mailboxMintBufferDepth = mint;
        _mailboxCloseBufferDepth = close;
        _mailboxDeliveryBufferDepth = delivery;
    }

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
    /// Returns <c>null</c> when the input is null or does not parse, so a malformed value yields no link rather
    /// than a link to the all-zero trace.
    /// </summary>
    public static ActivityContext? ParseTraceContext(string? traceContext)
    {
        if (traceContext is null)
            return null;

        return ActivityContext.TryParse(traceContext, null, out var context) ? context : null;
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

    /// <summary>
    /// Returns the time this process started, in seconds since the Unix epoch, to the millisecond.
    /// </summary>
    private static double ResolveProcessStartTime()
    {
        using var process = Process.GetCurrentProcess();
        return new DateTimeOffset(process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() / 1000d;
    }
}
