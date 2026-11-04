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
        INamedTypeSymbol processEndedHook,
        ImmutableArray<INamedTypeSymbol> taskHooks,
        Func<HookRegistration, IMethodSymbol, TaskIdCondition?> conditionOf,
        CancellationToken token,
        List<Diagnostic> diagnostics
    )
    {
        var processEndedHooks = registrations
            .Where(registration => SymbolEqualityComparer.Default.Equals(registration.Hook, processEndedHook))
            .ToList();
        if (processEndedHooks.Count > 1)
        {
            diagnostics.Add(
                Diagnostic.Create(
                    Diagnostics.Process.SeveralProcessEndedHooks,
                    processEndedHooks[1].Location,
                    OtherLocations(processEndedHooks, 1),
                    Names(processEndedHooks)
                )
            );
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

            foreach (var taskId in taskIds)
            {
                var running = known
                    .Where(hookRun => hookRun.Condition.Holds(taskId))
                    .Select(hookRun => hookRun.Registration)
                    .ToList();
                if (running.Count > 1)
                {
                    diagnostics.Add(
                        Diagnostic.Create(
                            Diagnostics.Process.TaskHooksOverlap,
                            running[1].Location,
                            OtherLocations(running, 1),
                            taskId,
                            hook.Name,
                            Names(running)
                        )
                    );
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

    private static IEnumerable<Location> OtherLocations(List<HookRegistration> registrations, int primary) =>
        registrations.Where((_, index) => index != primary).Select(registration => registration.Location);

    private static string Names(IEnumerable<HookRegistration> registrations) =>
        string.Join(", ", registrations.Select(registration => registration.Name));
}
