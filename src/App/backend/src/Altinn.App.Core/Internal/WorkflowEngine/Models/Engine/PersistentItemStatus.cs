using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Represents the status of a persistent workflow item.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PersistentItemStatus
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
}
