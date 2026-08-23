using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// A service task the transition enters, together with the pipeline its <c>Define</c> composed — read at
/// enqueue time, which is the moment the pipeline's shape is fixed for the workflow's lifetime.
/// </summary>
/// <remarks>
/// One type rather than two nullable fields because neither half means anything without the other: the type
/// is what the steps dispatch back to, and the pipeline is what decides which steps there are.
/// </remarks>
/// <param name="Type">The service task type identifier, as the BPMN task declares it.</param>
/// <param name="Pipeline">The task's composed pipeline.</param>
internal sealed record ResolvedServiceTask(string Type, ServiceTaskPipeline Pipeline);

/// <summary>
/// Context for building the task start command sequence.
/// Created by the factory from app configuration and request context.
/// </summary>
internal sealed record TaskStartContext
{
    /// <summary>
    /// If this is a service task, the task and its pipeline. Otherwise null.
    /// </summary>
    public required ResolvedServiceTask? ServiceTask { get; init; }

    /// <summary>
    /// True if this is the first task start (process is starting), false for subsequent task transitions.
    /// </summary>
    public required bool IsInitialTaskStart { get; init; }

    /// <summary>
    /// True when this task start is part of instance creation and should emit instantiation side effects.
    /// </summary>
    public bool IsInstantiation { get; init; }

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
