namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the removed <c>IAppEvents</c> interface and its default implementation
/// <c>DefaultAppEvents</c>. v8 called <c>OnEndAppEvent</c> when a process ended and never called
/// <c>OnStartAppEvent</c>. v9 calls neither, so the code moves to <c>IOnProcessEndedHandler</c> in
/// <c>Altinn.App.Core.Features.Process</c>. The rewrite is not mechanical, for the same reasons as for
/// <c>IProcessEnd</c> (see <see cref="RemovedProcessEndInterfaceDetector"/>), so this only reports the usages
/// a developer must port by hand, including the DI registrations.
/// </summary>
internal sealed class RemovedAppEventsInterfaceDetector
{
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IAppEvents",
        "DefaultAppEvents",
    };

    private const string Summary =
        "The removed IAppEvents interface is used by this app and must be ported by hand. Version 9 never calls it. "
        + "Move what OnEndAppEvent does to an IOnProcessEndedHandler in Altinn.App.Core.Features.Process, which runs "
        + "after the ended process is saved, however the process ended. Put the logic in Execute(context); read and "
        + "write instance data via context.InstanceDataMutator instead of IDataClient/IInstanceClient (the Instance "
        + "object is no longer passed in, and there is no HttpContext); return a HandlerResult "
        + "(Success/FailedRetryable/FailedPermanent); register only one IOnProcessEndedHandler; "
        + "and make the handler idempotent, as the workflow engine may retry it. "
        + "Do not port the deletion of data types with autoDeleteOnProcessEnd from DefaultAppEvents: the app "
        + "libraries do that. Delete OnStartAppEvent, which version 8 never called either. "
        + "Remember to remove the IAppEvents DI registration. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedAppEventsInterfaceDetector(CSharpSourceScanner scanner)
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
