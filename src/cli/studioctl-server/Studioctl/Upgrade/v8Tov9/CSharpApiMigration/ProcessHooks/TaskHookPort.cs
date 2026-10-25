using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// The app's <c>IProcessTaskStart</c>, <c>IProcessTaskEnd</c> and
/// <c>IProcessTaskAbandon</c> implementations, which v9 removed in favor of <c>IOnTaskStartingHandler</c>,
/// <c>IOnTaskEndingHandler</c> and <c>IOnTaskAbandoningHandler</c>, with the tasks each does anything for.
/// </summary>
internal static class TaskHookPort
{
    private static readonly IReadOnlyList<HookFamily> _families =
    [
        HookFamily.TaskStarting,
        HookFamily.TaskEnding,
        HookFamily.TaskAbandoning,
    ];

    public static IEnumerable<HookCandidate> Find(
        IReadOnlyList<ScannedCSharpFile> files,
        StorageCallReach reach,
        IReadOnlyDictionary<IMethodSymbol, string> calls
    ) =>
        _families
            .SelectMany(family => HookImplementation.Find(family, files))
            .Select(hook => Candidate(hook, reach, calls));

    private static HookCandidate Candidate(
        HookImplementation hook,
        StorageCallReach reach,
        IReadOnlyDictionary<IMethodSymbol, string> calls
    )
    {
        if (HookCandidate.BlockingReason(hook, calls) is { } reason)
        {
            return HookCandidate.Blocked(hook, reason);
        }

        var method =
            hook.Declaration ?? throw new InvalidOperationException("A hook without a declaration is blocked.");
        var taskId = hook.Method.Parameters[hook.Family.V8Parameters.ToList().IndexOf(HookParameterRole.TaskId)];
        return new HookCandidate(hook, null, reach.Reaches(hook.Method), TaskFilter.Of(method, taskId, hook.Model));
    }
}
