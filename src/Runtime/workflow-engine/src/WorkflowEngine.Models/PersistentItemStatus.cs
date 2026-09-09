using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// Lifecycle status shared by <see cref="Workflow"/> and <see cref="Step"/>.
/// </summary>
[JsonConverter(typeof(FlexibleEnumConverter<PersistentItemStatus>))]
public enum PersistentItemStatus
{
    /// <summary>
    /// The item is waiting to be processed.
    /// </summary>
    Enqueued = 0,

    /// <summary>
    ///  The item is currently being processed.
    /// </summary>
    Processing = 1,

    /// <summary>
    /// The item has been requeued after a failure.
    /// </summary>
    Requeued = 2,

    /// <summary>
    /// The item has completed successfully.
    /// </summary>
    Completed = 3,

    /// <summary>
    /// The item has completed with a failure.
    /// </summary>
    Failed = 4,

    /// <summary>
    /// The item has been canceled.
    /// </summary>
    Canceled = 5,

    /// <summary>
    /// The item was marked failed without running because a workflow it depends on failed.
    /// </summary>
    DependencyFailed = 6,

    /// <summary>
    /// The item's work did not run and was not needed. A command returned <see cref="ExecutionStatus.Skipped"/>:
    /// the handler marks the step (with the reason in <see cref="Step.SkipReason"/>) and every later step Skipped
    /// and ends the workflow Skipped; earlier steps stay <see cref="Completed"/>. An operator can put a
    /// <see cref="Failed"/>, <see cref="Canceled"/> or <see cref="DependencyFailed"/> workflow into the same state
    /// through the skip endpoint, with an optional reason on the first step that did not complete — a null
    /// <see cref="Step.SkipReason"/> on a Skipped step means exactly that, since a command's skip always carries
    /// one. Terminal and not a failure: dependents evaluated against it run and it satisfies a dependency for the
    /// recovery sweep. Not <see cref="Completed"/>, because the work did not happen. A Skipped workflow is not
    /// resumable.
    /// </summary>
    Skipped = 7,

    /// <summary>
    /// The item executed successfully but the outcome it is waiting for is not available yet
    /// (<see cref="ExecutionStatus.Deferred"/>). Non-terminal and not a failure: the item is
    /// re-fetched once the workflow's <see cref="Workflow.BackoffUntil"/> elapses and the step is
    /// executed again. Unlike <see cref="Requeued"/>, waiting records no error history and does not
    /// count against the retry budget.
    /// </summary>
    Waiting = 8,

    /// <summary>
    /// Workflow-only. Born parked: the workflow exists, is durable and visible, and has not started — it is held
    /// until an external event releases it. Today the only such event is a mailbox rendezvous. Deliberately absent
    /// from the fetch gate's status list, so no worker ever picks it up: it holds no lease, no heartbeat and no
    /// backoff, and it has no timer of its own. Non-terminal, so dependents stay blocked and it counts as active.
    /// Never observed on a <see cref="Step"/>.
    /// </summary>
    Held = 9,
}
