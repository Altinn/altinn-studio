namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the reworked <c>ServiceTaskResult</c> API on custom <c>IServiceTask</c>
/// implementations. The <c>IServiceTask</c> namespace move itself is auto-migrated (see the
/// <c>UsingNamespaceMigration</c> step); what cannot be auto-migrated is the result construction: the
/// v8 <c>ServiceTaskErrorHandling</c> record and <c>ServiceTaskErrorStrategy</c> enum are removed, and
/// the <c>Failed(...)</c>/<c>FailedAbortProcessNext()</c>/<c>FailedContinueProcessNext(...)</c>
/// factories are replaced by <c>FailedRetryable</c>/<c>FailedPermanent</c>/<c>SuccessWithoutAutoAdvance</c>.
/// Mapping the old abort/continue strategy onto the new retryable/permanent + auto-advance model is a
/// judgement call, so this reports the call sites rather than transforming them.
/// </summary>
internal sealed class ServiceTaskResultApiDetector
{
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "ServiceTaskErrorHandling",
        "ServiceTaskErrorStrategy",
    };

    private static readonly IReadOnlySet<string> _removedFactories = new HashSet<string>(StringComparer.Ordinal)
    {
        "FailedAbortProcessNext",
        "FailedContinueProcessNext",
    };

    private const string Summary =
        "The ServiceTaskResult API changed in v9. The ServiceTaskErrorHandling record and "
        + "ServiceTaskErrorStrategy enum are removed, along with the FailedAbortProcessNext()/"
        + "FailedContinueProcessNext(...) factories. Rebuild the result using "
        + "ServiceTaskResult.FailedRetryable(message) (transient failure the engine should retry), "
        + "FailedPermanent(message) (give up), Success(action) or SuccessWithoutAutoAdvance() (succeed but "
        + "park the task instead of auto-advancing). Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public ServiceTaskResultApiDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypeReferences(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedFactories))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
