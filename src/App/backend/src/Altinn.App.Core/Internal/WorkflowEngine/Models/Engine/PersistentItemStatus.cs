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
    /// The workflow ended unsuccessfully and a caller explicitly wrote it off. Terminal, but not a
    /// failure for dependency evaluation: workflows enqueued afterwards may depend on it and run.
    /// </summary>
    Abandoned = 7,

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
