namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed v8 process task event interfaces. In v9 the split
/// <c>IProcessTaskStart</c>/<c>IProcessTaskEnd</c>/<c>IProcessTaskAbandon</c> interfaces (namespace
/// <c>Altinn.App.Core.Features</c>) and the combined <c>ITaskEvents</c> are gone, replaced by the task
/// lifecycle handlers in <c>Altinn.App.Core.Features.Process</c>. The rewrite is not mechanical - the
/// method shape changes (a <c>ShouldRunForTask</c> gate plus an <c>Execute</c> taking an
/// <c>IInstanceDataMutator</c> instead of <c>Instance</c>/<c>prefill</c>, returning <c>HookResult</c>,
/// and required to be idempotent) - so this only reports the usages a developer must port by hand,
/// including the now-dangling DI registrations (<c>AddTransient&lt;IProcessTaskEnd, ...&gt;()</c>).
/// </summary>
internal sealed class RemovedTaskEventInterfaceDetector
{
    private static readonly IReadOnlySet<string> _removedInterfaces = new HashSet<string>(StringComparer.Ordinal)
    {
        "IProcessTaskStart",
        "IProcessTaskEnd",
        "IProcessTaskAbandon",
        "ITaskEvents",
    };

    private const string Summary =
        "Removed process task event interfaces (IProcessTaskStart/IProcessTaskEnd/IProcessTaskAbandon/ITaskEvents) "
        + "are used by this app and must be ported by hand. Replace them with the task lifecycle handlers in "
        + "Altinn.App.Core.Features.Process (IOnTaskStartingHandler/IOnTaskEndingHandler/IOnTaskAbandonHandler): "
        + "split the logic into ShouldRunForTask(taskId) and Execute(context); read and write instance data via "
        + "context.InstanceDataMutator (the Instance object and prefill dictionary are no longer passed in); return "
        + "a HookResult (Success/FailedRetryable/FailedPermanent); and make handlers idempotent, as the workflow "
        + "engine may retry them. Remember to update the matching DI registrations. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedTaskEventInterfaceDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedInterfaces)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedInterfaces))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
