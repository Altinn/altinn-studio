namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>What a parameter of a v8 hook method carries.</summary>
internal enum HookParameterRole
{
    TaskId,
    Instance,

    /// <summary>The instantiation prefill v8 passes to task start; v9's starting context has none.</summary>
    Prefill,

    /// <summary>The events of the process end; v9's ended context has none.</summary>
    Events,
}

/// <summary>
/// A v8 hook method and the v9 member that replaces it: the v8 interface and member with what each parameter
/// carries, the v9 interface and member, the context v9 passes, and where in that context the task id is.
/// </summary>
/// <param name="TaskIdInContext">The member path from the context to the task id.</param>
/// <param name="FiltersTasks">Whether the v9 interface has <c>ShouldRunForTask</c>.</param>
/// <param name="CompositeName">The class that runs several handlers of the family that v9 would refuse side by side.</param>
internal sealed record HookFamily(
    string V8Interface,
    string V8Member,
    IReadOnlyList<HookParameterRole> V8Parameters,
    string V9Interface,
    string V9Member,
    string Context,
    string TaskIdInContext,
    bool FiltersTasks,
    string? CompositeName
)
{
    public const string HandlerResult = "Altinn.App.Core.Features.Process.HandlerResult";
    public const string FailedHandlerResult = "Altinn.App.Core.Features.Process.FailedHandlerResult";

    public static readonly HookFamily TaskStarting = new(
        "Altinn.App.Core.Features.IProcessTaskStart",
        "Start",
        [HookParameterRole.TaskId, HookParameterRole.Instance, HookParameterRole.Prefill],
        "Altinn.App.Core.Features.Process.IOnTaskStartingHandler",
        "Execute",
        "Altinn.App.Core.Features.Process.OnTaskStartingContext",
        "TaskId",
        FiltersTasks: true,
        "TaskStartingHandlers"
    );

    public static readonly HookFamily TaskEnding = new(
        "Altinn.App.Core.Features.IProcessTaskEnd",
        "End",
        [HookParameterRole.TaskId, HookParameterRole.Instance],
        "Altinn.App.Core.Features.Process.IOnTaskEndingHandler",
        "Execute",
        "Altinn.App.Core.Features.Process.OnTaskEndingContext",
        "TaskId",
        FiltersTasks: true,
        "TaskEndingHandlers"
    );

    public static readonly HookFamily TaskAbandoning = new(
        "Altinn.App.Core.Features.IProcessTaskAbandon",
        "Abandon",
        [HookParameterRole.TaskId, HookParameterRole.Instance],
        "Altinn.App.Core.Features.Process.IOnTaskAbandoningHandler",
        "Execute",
        "Altinn.App.Core.Features.Process.OnTaskAbandoningContext",
        "TaskId",
        FiltersTasks: true,
        "TaskAbandoningHandlers"
    );

    public static readonly HookFamily ProcessEnded = new(
        "Altinn.App.Core.Features.IProcessEnd",
        "End",
        [HookParameterRole.Instance, HookParameterRole.Events],
        "Altinn.App.Core.Features.Process.IOnProcessEndedHandler",
        "Execute",
        "Altinn.App.Core.Features.Process.OnProcessEndedContext",
        TaskIdInContext: "",
        FiltersTasks: false,
        "ProcessEndedHandlers"
    );

    /// <summary>The hook interfaces v9 removed, in the order v8 runs them.</summary>
    public static readonly IReadOnlyList<HookFamily> RemovedHooks =
    [
        TaskStarting,
        TaskEnding,
        TaskAbandoning,
        ProcessEnded,
    ];

    public string V8InterfaceName => SimpleName(V8Interface);

    public string V9InterfaceName => SimpleName(V9Interface);

    private static string SimpleName(string fullName) => fullName[(fullName.LastIndexOf('.') + 1)..];
}
