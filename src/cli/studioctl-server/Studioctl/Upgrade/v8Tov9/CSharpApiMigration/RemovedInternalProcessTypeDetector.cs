namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the internal in-process engine handler types removed in v9, when the
/// in-process process orchestration was replaced by the external workflow engine's command model.
/// These live under <c>Altinn.App.Core.Internal.Process.*</c> and are not part of the app-facing
/// extensibility surface, so app references are rare - but an app that did reach into them will no
/// longer compile, so we report (never rewrite) any references for manual rework.
/// </summary>
internal sealed class RemovedInternalProcessTypeDetector
{
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
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

    private const string Summary =
        "This app references internal in-process engine handler types that were removed in v9 (the in-process "
        + "process orchestration was replaced by the external workflow engine's command pipeline). These were "
        + "never part of the supported app API and have no drop-in replacement; rework the logic against the "
        + "supported task lifecycle handlers in Altinn.App.Core.Features.Process. References found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedInternalProcessTypeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
