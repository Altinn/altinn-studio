using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Represents the status of a persistent workflow item.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
internal enum PersistentItemStatus
{
    /// <summary>The item has been enqueued for processing.</summary>
    Enqueued = 0,

    /// <summary>The item is currently being processed.</summary>
    Processing = 1,

    /// <summary>The item has been requeued after a previous attempt.</summary>
    Requeued = 2,

    /// <summary>The item has completed successfully.</summary>
    Completed = 3,

    /// <summary>The item has failed.</summary>
    Failed = 4,

    /// <summary>The item has been canceled.</summary>
    Canceled = 5,

    /// <summary>The item failed because a dependency failed.</summary>
    DependencyFailed = 6,

    /// <summary>
    /// The item's work did not run and was not needed. A command skipped the rest of the workflow: on a
    /// step, the step that returned the skip (which carries the reason in
    /// <see cref="StepStatusResponse.SkipReason"/>) and every step after it; on a workflow, any step is
    /// skipped, and steps before the skipping one stay <see cref="Completed"/>. An operator can put a
    /// <see cref="Failed"/>, <see cref="Canceled"/> or <see cref="DependencyFailed"/> workflow into the same
    /// state through the engine's skip endpoint, with an optional reason on the first step that did not
    /// complete — a null <see cref="StepStatusResponse.SkipReason"/> on a skipped step means exactly that,
    /// since a command's skip always carries one. Terminal and not a failure: workflows depending on it run
    /// and it satisfies a dependency for the engine's recovery sweep. Not <see cref="Completed"/>, because
    /// the work did not happen. Not resumable.
    /// </summary>
    Skipped = 7,

    /// <summary>
    /// A step ran without error but the outcome it awaits is not available yet, so the engine parked
    /// it until its next poll. Non-terminal and not a failure — the work is still in flight, so this
    /// counts as active: a caller must never read a waiting workflow as settled.
    /// </summary>
    Waiting = 8,

    /// <summary>
    /// The workflow was created parked and has not started: it is held until an external event releases it. Today
    /// that event is a mailbox rendezvous. Non-terminal, so workflows depending on it stay blocked; no worker
    /// fetches it, and it has no timer of its own.
    /// </summary>
    Held = 9,
}
