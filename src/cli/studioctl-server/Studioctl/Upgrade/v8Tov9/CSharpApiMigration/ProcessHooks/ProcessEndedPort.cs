using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// The app's <c>IProcessEnd</c> implementations, which v9 removed in favor of <c>IOnProcessEndedHandler</c>.
/// v9 has no task filter for it, and starts with only one registered.
/// </summary>
internal static class ProcessEndedPort
{
    public static IEnumerable<HookCandidate> Find(
        IReadOnlyList<ScannedCSharpFile> files,
        IReadOnlyDictionary<IMethodSymbol, string> calls
    ) =>
        HookImplementation
            .Find(HookFamily.ProcessEnded, files)
            .Select(hook =>
                HookCandidate.BlockingReason(hook, calls) is { } reason
                    ? HookCandidate.Blocked(hook, reason)
                    : new HookCandidate(hook, null, TaskIds.Every)
            );
}
