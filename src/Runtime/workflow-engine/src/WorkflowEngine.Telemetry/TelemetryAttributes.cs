namespace WorkflowEngine.Telemetry;

/// <summary>
/// Keys of the attributes the engine sets on its own telemetry: one constant per concept, shared by
/// metrics, spans and logs, so a concept has a single spelling on the wire.
/// </summary>
/// <remarks>
/// <para>
/// Every key is <c>altinn.workflow_engine.</c> followed by the concept's path, and every member is named after
/// that path in PascalCase, so the members group by the entity they describe: <c>Workflow…</c>, <c>Step…</c>,
/// <c>Mailbox…</c>, with the concepts that belong to no single entity unprefixed. A new key follows the same
/// rule.
/// </para>
/// <para>
/// The keys are a contract with dashboards and alerts, so renaming one is a breaking change. A value the
/// engine chooses is lowercase <c>snake_case</c>. A metric takes only attributes whose values are bounded
/// across every app the engine serves — never an ID, nor anything an app builds, such as an operation ID.
/// Spans may carry those.
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
    /// <c>db_maintenance</c> or <c>workflow_processing</c>.
    /// </summary>
    public const string Operation = "altinn.workflow_engine.operation";

    /// <summary>
    /// The engine API endpoint a request arrived at, such as <c>enqueue</c>, <c>list</c> or
    /// <c>close_mailbox</c>. Named by the engine rather than by route, so it stays stable across API versions.
    /// </summary>
    public const string Endpoint = "altinn.workflow_engine.endpoint";

    /// <summary>
    /// The workflow's head directive: <c>true</c>, <c>false</c> or <c>unset</c>. <c>false</c> marks an auxiliary
    /// workflow, whose terminal failure gates nothing and surfaces nowhere else.
    /// </summary>
    public const string WorkflowIsHead = "altinn.workflow_engine.workflow.is_head";

    /// <summary>
    /// The type of command a step runs, such as <c>app</c> or <c>webhook</c>. Bounded by the commands a host
    /// registers.
    /// </summary>
    public const string StepCommandType = "altinn.workflow_engine.step.command.type";

    /// <summary>
    /// The mailbox write a batch buffer serves: <c>mint</c>, <c>close</c> or <c>delivery</c>.
    /// </summary>
    public const string MailboxOperation = "altinn.workflow_engine.mailbox.operation";

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
}
