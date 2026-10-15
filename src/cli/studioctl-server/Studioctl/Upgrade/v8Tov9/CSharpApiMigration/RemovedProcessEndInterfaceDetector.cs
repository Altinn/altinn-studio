namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed v8 <c>IProcessEnd</c> interface (namespace <c>Altinn.App.Core.Features</c>).
/// In v9 the process-end logic moves to <c>IOnProcessEndingHandler</c> or <c>IOnProcessEndedHandler</c> in
/// <c>Altinn.App.Core.Features.Process</c>. The rewrite is not mechanical - <c>End(Instance, events)</c> becomes an
/// <c>Execute</c> taking an <c>IInstanceDataMutator</c>, returning <c>HookResult</c>, and required to be idempotent -
/// so this only reports the usages a developer must port by hand, including the DI registrations.
/// </summary>
internal sealed class RemovedProcessEndInterfaceDetector
{
    private static readonly IReadOnlySet<string> _removedInterfaces = new HashSet<string>(StringComparer.Ordinal)
    {
        "IProcessEnd",
    };

    private const string Summary =
        "The removed IProcessEnd interface is used by this app and must be ported by hand. Replace it with "
        + "IOnProcessEndedHandler (runs after the ended process is saved) or IOnProcessEndingHandler (runs before it "
        + "is saved) in Altinn.App.Core.Features.Process. Move the logic into Execute(context); read and write instance "
        + "data via context.InstanceDataMutator instead of IDataClient/IInstanceClient (the Instance object and events "
        + "list are no longer passed in, and there is no HttpContext); return a HookResult "
        + "(Success/FailedRetryable/FailedPermanent); register at most one of each; and make the handler idempotent, as "
        + "the workflow engine may retry it. Remember to update the matching DI registration. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedProcessEndInterfaceDetector(CSharpSourceScanner scanner)
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
