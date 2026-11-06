namespace Altinn.App.Analyzers.Process;

/// <summary>
/// The build-time front of the hook checks in <c>ProcessTaskConfigurationValidationService</c> in Altinn.App.Core:
/// at most one <c>IOnProcessEndedHandler</c>, and at most one task hook of each kind that runs for each task in
/// <c>config/process/process.bpmn</c>. See <c>ProcessHookAnalyzer</c> for which hooks it can see.
/// </summary>
internal static class ProcessHookUtils
{
    private const string ShouldRunForTask = "ShouldRunForTask";

    /// <summary>Appends the diagnostics for <paramref name="registrations"/>.</summary>
    /// <param name="additionalFiles">The analysis's additional files, which hold the process.</param>
    /// <param name="registrations">The hook registrations the app makes, in source order.</param>
    /// <param name="removals">The hooks that code in the app may remove or replace.</param>
    /// <param name="processEndedHook">The <c>IOnProcessEndedHandler</c> interface.</param>
    /// <param name="taskHooks">The task hook interfaces, which each have a <c>ShouldRunForTask</c>.</param>
    /// <param name="conditionOf">
    /// What the <c>ShouldRunForTask</c> a registration runs returns, given the interface's method, or null when it is
    /// not known.
    /// </param>
    /// <param name="token">Cancels reading the process.</param>
    /// <param name="diagnostics">Receives the diagnostics.</param>
    internal static void CollectDiagnostics(
        ImmutableArray<AdditionalText> additionalFiles,
        IReadOnlyList<HookRegistration> registrations,
        HookRemovals removals,
        INamedTypeSymbol processEndedHook,
        ImmutableArray<INamedTypeSymbol> taskHooks,
        Func<HookRegistration, IMethodSymbol, TaskIdCondition?> conditionOf,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        if (!removals.MayRemove(processEndedHook))
        {
            var processEndedHooks = registrations.Where(registration =>
                SymbolEqualityComparer.Default.Equals(registration.Hook, processEndedHook)
            );
            foreach (var together in RunningTogether(processEndedHooks))
            {
                if (together.Count > 1)
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.SeveralProcessEndedHooks,
                            together[1].Location,
                            OtherLocations(together, 1),
                            Names(together)
                        )
                    );
                }
            }
        }

        var processFile = ProcessFile.FindSingle(additionalFiles);
        if (
            processFile is null
            || ProcessFile.TryParse(processFile, token) is not { } parsed
            || ProcessFile.SingleProcess(parsed.Document) is not { } process
        )
        {
            return;
        }

        var taskIds = ProcessFile.TaskIds(process).Distinct(StringComparer.Ordinal).ToList();
        var reportedComparisons = new HashSet<Location>();
        foreach (var hook in taskHooks)
        {
            if (hook.GetMembers(ShouldRunForTask).OfType<IMethodSymbol>().FirstOrDefault() is not { } interfaceMethod)
            {
                continue;
            }

            var known = new List<(HookRegistration Registration, TaskIdCondition Condition)>();
            foreach (var registration in registrations)
            {
                if (
                    SymbolEqualityComparer.Default.Equals(registration.Hook, hook)
                    && conditionOf(registration, interfaceMethod) is { } condition
                )
                {
                    known.Add((registration, condition));
                }
            }

            foreach (var taskId in removals.MayRemove(hook) ? [] : taskIds)
            {
                var running = known
                    .Where(hookRun => hookRun.Condition.Holds(taskId))
                    .Select(hookRun => hookRun.Registration);
                foreach (var together in RunningTogether(running))
                {
                    if (together.Count > 1)
                    {
                        diagnostics.Add(
                            Diagnostic.Create(
                                Diagnostics.Process.TaskHooksOverlap,
                                together[1].Location,
                                OtherLocations(together, 1),
                                taskId,
                                hook.Name,
                                Names(together)
                            )
                        );
                    }
                }
            }

            foreach (var (registration, condition) in known)
            {
                foreach (var comparison in condition.Comparisons())
                {
                    if (
                        taskIds.Contains(comparison.TaskId, StringComparer.Ordinal)
                        || !reportedComparisons.Add(comparison.Location)
                    )
                    {
                        continue;
                    }

                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.TaskHookUnknownTask,
                            comparison.Location,
                            registration.Name,
                            comparison.TaskId,
                            ProcessFile.WhyNotATask(process, comparison.TaskId)
                        )
                    );
                }
            }
        }
    }

    /// <summary>
    /// Groups the registrations that run together, in source order: those in one method, on one service collection.
    /// </summary>
    private static IEnumerable<List<HookRegistration>> RunningTogether(IEnumerable<HookRegistration> registrations) =>
        registrations
            .GroupBy(registration => registration.Method, SymbolEqualityComparer.Default)
            .SelectMany(inMethod => inMethod.GroupBy(registration => registration.Collection, StringComparer.Ordinal))
            .Select(onCollection => onCollection.ToList());

    private static IEnumerable<Location> OtherLocations(List<HookRegistration> registrations, int primary) =>
        registrations.Where((_, index) => index != primary).Select(registration => registration.Location);

    private static string Names(IEnumerable<HookRegistration> registrations) =>
        string.Join(", ", registrations.Select(registration => registration.Name));
}
