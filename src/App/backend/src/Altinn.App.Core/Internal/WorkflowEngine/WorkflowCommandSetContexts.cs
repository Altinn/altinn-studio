using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Context for building the task start command sequence.
/// Created by the factory from app configuration and request context.
/// </summary>
internal sealed record TaskStartContext
{
    /// <summary>
    /// If this is a service task, the task type identifier. Otherwise null.
    /// </summary>
    public required string? ServiceTaskType { get; init; }

    /// <summary>
    /// True if this is the first task start (process is starting), false for subsequent task transitions.
    /// </summary>
    public required bool IsInitialTaskStart { get; init; }

    /// <summary>
    /// Prefill data for initial task start. Only relevant when <see cref="IsInitialTaskStart"/> is true.
    /// </summary>
    public Dictionary<string, string>? Prefill { get; init; }

    /// <summary>
    /// Notification to send to instance owner on instantiation. Only relevant when <see cref="IsInitialTaskStart"/> is true.
    /// </summary>
    public InstantiationNotification? Notification { get; init; }

    /// <summary>
    /// Whether to register events with the events component.
    /// </summary>
    public bool RegisterEvents { get; init; }
}

/// <summary>
/// Context for building the process end command sequence.
/// Created by the factory from app configuration.
/// </summary>
internal sealed record ProcessEndContext
{
    /// <summary>
    /// Whether to register events with the events component.
    /// </summary>
    public bool RegisterEvents { get; init; }

    /// <summary>
    /// Whether any data types have AutoDeleteOnProcessEnd enabled.
    /// </summary>
    public bool HasAutoDeleteDataTypes { get; init; }

    /// <summary>
    /// Whether the application is configured to auto-delete the instance on process end.
    /// </summary>
    public bool AutoDeleteInstanceOnProcessEnd { get; init; }
}
