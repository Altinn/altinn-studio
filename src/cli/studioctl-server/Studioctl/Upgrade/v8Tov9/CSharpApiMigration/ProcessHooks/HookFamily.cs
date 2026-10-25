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
/// <param name="ReturnsHandlerResult">
/// Whether the v9 member returns <c>Task&lt;HandlerResult&gt;</c>; otherwise it is a custom process task's stage,
/// which returns <c>Task&lt;StageResult&gt;</c> and runs from a <c>Define</c> member, such as <c>DefineStart</c> for
/// <c>Start</c>.
/// </param>
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
    bool ReturnsHandlerResult,
    bool FiltersTasks,
    string? CompositeName
)
{
    public const string HandlerResult = "Altinn.App.Core.Features.Process.HandlerResult";
    public const string FailedHandlerResult = "Altinn.App.Core.Features.Process.FailedHandlerResult";

    private const string ProcessTask = "Altinn.App.Core.Internal.Process.ProcessTasks.IProcessTask";
    private const string StageContext = "Altinn.App.Core.Features.Process.StageContext";
    private const string CurrentTaskId = "InstanceDataMutator.Instance.Process.CurrentTask.ElementId";

    public static readonly HookFamily TaskStarting = new(
        "Altinn.App.Core.Features.IProcessTaskStart",
        "Start",
        [HookParameterRole.TaskId, HookParameterRole.Instance, HookParameterRole.Prefill],
        "Altinn.App.Core.Features.Process.IOnTaskStartingHandler",
        "Execute",
        "Altinn.App.Core.Features.Process.OnTaskStartingContext",
        "TaskId",
        ReturnsHandlerResult: true,
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
        ReturnsHandlerResult: true,
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
        ReturnsHandlerResult: true,
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
        ReturnsHandlerResult: true,
        FiltersTasks: false,
        "ProcessEndedHandlers"
    );

    /// <summary>
    /// The members of a custom process task. v9 keeps the interface but composes what a task does as it starts, ends or
    /// is abandoned as stages in <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c>, so a v8 implementation
    /// still compiles but is never called.
    /// </summary>
    public static readonly IReadOnlyList<HookFamily> ProcessTaskMembers =
    [
        .. new[] { "Start", "End", "Abandon" }.Select(static member => new HookFamily(
            ProcessTask,
            member,
            [HookParameterRole.TaskId, HookParameterRole.Instance],
            ProcessTask,
            member,
            StageContext,
            CurrentTaskId,
            ReturnsHandlerResult: false,
            FiltersTasks: false,
            CompositeName: null
        )),
    ];

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
