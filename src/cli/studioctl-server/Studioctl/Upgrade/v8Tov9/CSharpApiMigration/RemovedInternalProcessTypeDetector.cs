namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the internal in-process engine handler types removed in v9, when the
/// in-process process orchestration was replaced by the external workflow engine's command model.
/// These live under <c>Altinn.App.Core.Internal.Process.*</c> and are not part of the app-facing
/// extensibility surface, so app references are rare - but an app that did reach into them will no
/// longer compile, so we report (never rewrite) any references for manual rework. The types that locked
/// a task's data are reported with their own guidance: v9 does not lock it, so no handler replaces them.
/// </summary>
internal sealed class RemovedInternalProcessTypeDetector
{
    private static readonly IReadOnlySet<string> _handlerTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        // Removed handler interfaces
        "IProcessEventDispatcher",
        "IProcessEventHandlerDelegator",
        "IProcessTaskInitializer",
        "IProcessTaskFinalizer",
        "IStartTaskEventHandler",
        "IEndTaskEventHandler",
        "IAbandonTaskEventHandler",
        "IEndEventEventHandler",
        // Removed handler implementations
        "ProcessEventDispatcher",
        "ProcessEventHandlingDelegator",
        "ProcessTaskInitializer",
        "StartTaskEventHandler",
        "EndTaskEventHandler",
        "AbandonTaskEventHandler",
        "EndEventEventHandler",
    };

    private static readonly IReadOnlySet<string> _dataLockerTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IProcessTaskDataLocker",
        "ProcessTaskDataLocker",
    };

    private const string HandlerSummary =
        "This app references internal in-process engine handler types that were removed in v9 (the in-process "
        + "process orchestration was replaced by the external workflow engine's command pipeline). These were "
        + "never part of the supported app API and have no drop-in replacement; rework the logic against the "
        + "supported task lifecycle handlers in Altinn.App.Core.Features.Process. References found:";

    private const string DataLockerSummary =
        "This app references the types that locked a task's data when the task ended and unlocked it when the "
        + "task started. v9 does neither, and nothing replaces the types: the data type's taskIds in "
        + "applicationmetadata.json decide in which tasks its data can change. Remove the code that uses them. "
        + "References found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedInternalProcessTypeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect() =>
        WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(HandlerSummary, UsesOf(_handlerTypes)),
            WarnOnlyDetector.Report(DataLockerSummary, UsesOf(_dataLockerTypes))
        );

    private IEnumerable<CSharpApiMatch> UsesOf(IReadOnlySet<string> types) =>
        _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries.TypesImplementing(file, types).Concat(CSharpSyntaxQueries.TypeReferences(file, types))
        );
}
