namespace WorkflowEngine.Telemetry;

/// <summary>
/// Keys of the attributes the engine sets on its own telemetry: one constant per concept, shared by
/// metrics, spans and logs, so a concept has a single spelling on the wire.
/// </summary>
/// <remarks>
/// <para>
/// The keys come in two groups. The engine's own concepts are <c>altinn.workflow_engine.</c> followed by the
/// concept's path, and each member is named after that path in PascalCase, so the members group by the entity
/// they describe: <c>Workflow…</c>, <c>Step…</c>, <c>Mailbox…</c>, <c>Batch…</c>, with the concepts that belong
/// to no single entity unprefixed. The few OpenTelemetry semantic-convention keys the engine sets itself are
/// spelled exactly as the conventions spell them and never carry another meaning. A new key joins the group it
/// belongs to and follows the same rule.
/// </para>
/// <para>
/// The engine treats a workflow's context as opaque, so the domain object a step works on is named by keys the
/// host defines itself: its command returns them from <c>ICommand.GetTelemetryAttributes</c>, and the engine puts
/// them on the step's span and the workflow's entry span. They do not belong here.
/// </para>
/// <para>
/// The keys are a contract with dashboards and alerts, so renaming one is a breaking change. A value the
/// engine chooses is lowercase <c>snake_case</c>, and a count on a span ends in <c>_count</c>. A metric takes
/// only attributes whose values are bounded across every app the engine serves — never an ID, nor anything an
/// app builds, such as an operation ID. Spans may carry those.
/// </para>
/// </remarks>
public static class TelemetryAttributes
{
    /// <summary>
    /// The namespace a workflow belongs to: <c>{org}/{app}</c> for the Altinn apps.
    /// </summary>
    /// <remarks>
    /// Unbounded across the fleet, so a metric carries it only where its values are rare events — the
    /// throttle counters, whose cardinality is bounded by incident count (a documented decision in the
    /// failure-throttling ADR), and the errors counter.
    /// </remarks>
    public const string Namespace = "altinn.workflow_engine.namespace";

    /// <summary>
    /// Why something ended the way it did — a workflow or step failing, a workflow being canceled or
    /// requeued, a mailbox closing. A small fixed set per instrument, such as <c>execution</c>,
    /// <c>poisoned</c>, <c>wait_expired</c>, <c>manual</c> or <c>deadline</c>.
    /// </summary>
    public const string Reason = "altinn.workflow_engine.reason";

    /// <summary>
    /// The engine-internal operation an error happened in, such as <c>fetch_and_lock</c>,
    /// <c>db_maintenance</c> or <c>workflow_handling</c>.
    /// </summary>
    public const string Operation = "altinn.workflow_engine.operation";

    /// <summary>
    /// The engine API endpoint a request arrived at, such as <c>enqueue</c>, <c>list</c> or
    /// <c>close_mailbox</c>. Named by the engine rather than by route, so it stays stable across API versions.
    /// </summary>
    public const string Endpoint = "altinn.workflow_engine.endpoint";

    /// <summary>
    /// The key of the collection a workflow belongs to, chosen by the caller. For the Altinn apps it is the
    /// instance GUID.
    /// </summary>
    public const string CollectionKey = "altinn.workflow_engine.collection.key";

    /// <summary>
    /// The number of workflows in one enqueue request.
    /// </summary>
    public const string RequestWorkflowCount = "altinn.workflow_engine.request.workflow_count";

    /// <summary>
    /// The engine's ID of a workflow: its database row ID.
    /// </summary>
    public const string WorkflowId = "altinn.workflow_engine.workflow.id";

    /// <summary>
    /// The engine's IDs of the workflows one enqueue request created or matched, as a string array in request
    /// order. Set on the producer side, so a trace of the request leads to the workflows it started.
    /// </summary>
    public const string WorkflowIds = "altinn.workflow_engine.workflow.ids";

    /// <summary>
    /// The idempotency key of the enqueue request a workflow came from, chosen by the caller.
    /// </summary>
    public const string WorkflowIdempotencyKey = "altinn.workflow_engine.workflow.idempotency_key";

    /// <summary>
    /// The operation ID a workflow was enqueued with. Built by the app, so it is a span attribute only.
    /// </summary>
    public const string WorkflowOperationId = "altinn.workflow_engine.workflow.operation_id";

    /// <summary>
    /// A workflow's lifecycle status, such as <c>Processing</c>, <c>Completed</c> or <c>Failed</c>: the status
    /// names of the engine API.
    /// </summary>
    public const string WorkflowStatus = "altinn.workflow_engine.workflow.status";

    /// <summary>
    /// The workflow's head directive: <c>true</c>, <c>false</c> or <c>unset</c>. <c>false</c> marks an auxiliary
    /// workflow, whose terminal failure gates nothing and surfaces nowhere else.
    /// </summary>
    public const string WorkflowIsHead = "altinn.workflow_engine.workflow.is_head";

    /// <summary>
    /// The number of workflows in a batch write-back whose lease another host had reclaimed, so their updates
    /// were skipped. Set only when it is above zero.
    /// </summary>
    public const string WorkflowLeaseLostCount = "altinn.workflow_engine.workflow.lease_lost_count";

    /// <summary>
    /// The engine's ID of a step: its database row ID.
    /// </summary>
    public const string StepId = "altinn.workflow_engine.step.id";

    /// <summary>
    /// The operation ID a step was enqueued with. Built by the app, so it is a span attribute only.
    /// </summary>
    public const string StepOperationId = "altinn.workflow_engine.step.operation_id";

    /// <summary>
    /// The type of command a step runs, such as <c>app</c> or <c>webhook</c>. Bounded by the commands a host
    /// registers.
    /// </summary>
    public const string StepCommandType = "altinn.workflow_engine.step.command.type";

    /// <summary>
    /// Why a workflow's state was submitted for write-back: <c>step_started</c>, <c>step_completed</c>, or
    /// <c>workflow_</c> followed by the workflow's status in <c>snake_case</c>, such as
    /// <c>workflow_completed</c>.
    /// </summary>
    public const string UpdateReason = "altinn.workflow_engine.update.reason";

    /// <summary>
    /// The number of steps one write-back submission carries.
    /// </summary>
    public const string UpdateDirtyStepCount = "altinn.workflow_engine.update.dirty_step_count";

    /// <summary>
    /// The number of requests a buffer flushes in one batch.
    /// </summary>
    public const string BatchSize = "altinn.workflow_engine.batch.size";

    /// <summary>
    /// The number of workflows in one enqueue flush.
    /// </summary>
    public const string BatchWorkflowCount = "altinn.workflow_engine.batch.workflow_count";

    /// <summary>
    /// The number of steps in one enqueue flush.
    /// </summary>
    public const string BatchStepCount = "altinn.workflow_engine.batch.step_count";

    /// <summary>
    /// The number of distinct namespaces one flush writes to.
    /// </summary>
    public const string BatchNamespaceCount = "altinn.workflow_engine.batch.namespace_count";

    /// <summary>
    /// The number of write-back submissions a flush drained, before deduplication.
    /// </summary>
    public const string BatchReceivedCount = "altinn.workflow_engine.batch.received_count";

    /// <summary>
    /// The number of drained write-back submissions a flush dropped because a later one for the same workflow
    /// superseded them.
    /// </summary>
    public const string BatchDeduplicatedCount = "altinn.workflow_engine.batch.deduplicated_count";

    /// <summary>
    /// The number of write-back submissions a flush wrote.
    /// </summary>
    public const string BatchFlushedCount = "altinn.workflow_engine.batch.flushed_count";

    /// <summary>
    /// The number of steps a write-back flush wrote.
    /// </summary>
    public const string BatchDirtyStepCount = "altinn.workflow_engine.batch.dirty_step_count";

    /// <summary>
    /// The mailbox write a batch buffer serves: <c>mint</c>, <c>close</c> or <c>delivery</c>.
    /// </summary>
    public const string MailboxOperation = "altinn.workflow_engine.mailbox.operation";

    /// <summary>
    /// The number of open mailboxes past their deadline one sweep found to close.
    /// </summary>
    public const string MailboxOverdueCount = "altinn.workflow_engine.mailbox.overdue_count";

    /// <summary>
    /// The verdict on a message offered to a mailbox, such as <c>accepted</c>, <c>duplicate</c> or
    /// <c>closed</c>.
    /// </summary>
    public const string MailboxDeliveryOutcome = "altinn.workflow_engine.mailbox.delivery.outcome";

    /// <summary>
    /// The state a mailbox receive workflow was born in: <c>delivered</c>, <c>closed</c> or <c>held</c>.
    /// </summary>
    public const string MailboxReceiverBirth = "altinn.workflow_engine.mailbox.receiver.birth";

    /// <summary>
    /// What released a parked mailbox receive workflow: <c>delivered</c> or <c>closed</c>.
    /// </summary>
    public const string MailboxReceiverReleaseCause = "altinn.workflow_engine.mailbox.receiver.release_cause";

    /// <summary>
    /// The mailbox rendezvous state the executor could not answer for: <c>unregistered</c> or <c>undecided</c>.
    /// </summary>
    public const string MailboxRendezvousState = "altinn.workflow_engine.mailbox.rendezvous.state";

    // OpenTelemetry semantic-convention keys the engine sets itself, spelled as the conventions spell them.

    /// <summary>
    /// The class of error a failed span ended with: an exception's full type name, a low-cardinality reason the
    /// engine already names, or <c>_OTHER</c>. Never a value from a request.
    /// </summary>
    public const string ErrorType = "error.type";

    /// <summary>
    /// The prefix of the per-parameter keys on a database span, <c>db.query.parameter.&lt;name&gt;</c>. Set only
    /// in development, where parameter values may be read.
    /// </summary>
    public const string DbQueryParameterPrefix = "db.query.parameter.";
}
