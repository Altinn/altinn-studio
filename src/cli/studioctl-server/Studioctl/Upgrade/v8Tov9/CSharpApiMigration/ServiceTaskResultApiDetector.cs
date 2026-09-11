using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the reworked <c>ServiceTaskResult</c> API on custom <c>IServiceTask</c>
/// implementations. The <c>IServiceTask</c> namespace move itself is auto-migrated (see the
/// <c>UsingNamespaceMigration</c> step); what cannot be auto-migrated is the result construction: the
/// v8 <c>ServiceTaskErrorHandling</c> record and <c>ServiceTaskErrorStrategy</c> enum are removed, and
/// the <c>Failed(...)</c>/<c>FailedAbortProcessNext()</c>/<c>FailedContinueProcessNext(...)</c>
/// factories are replaced by <c>FailedRetryable</c>/<c>FailedPermanent</c>/<c>SuccessWithoutAutoAdvance</c>.
/// Mapping the old abort/continue strategy onto the new retryable/permanent + auto-advance model is a
/// judgment call, so this reports the call sites rather than transforming them.
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

    // `Failed` is too generic a name to match bare calls (unlike the distinctive factories above),
    // so the removed Failed(ServiceTaskErrorHandling) factory is only matched receiver-qualified.
    private static readonly IReadOnlySet<string> _removedQualifiedFactories = new HashSet<string>(
        StringComparer.Ordinal
    )
    {
        "Failed",
    };

    private const string ResultTypeName = "ServiceTaskResult";

    private const string Summary =
        "The ServiceTaskResult API changed in v9. The ServiceTaskErrorHandling record and "
        + "ServiceTaskErrorStrategy enum are removed, along with the Failed(...)/FailedAbortProcessNext()/"
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
            file.SemanticModel is { } semanticModel ? SemanticMatches(file, semanticModel) : SyntaxMatches(file)
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }

    /// <summary>
    /// With the v8 compilation the removed factories bind to their symbols, so even <c>Failed</c> — too
    /// generic to match bare in syntax — is matched exactly, in whatever spelling (receiver-qualified,
    /// aliased, <c>using static</c>).
    /// </summary>
    private static IEnumerable<CSharpApiMatch> SemanticMatches(ScannedCSharpFile file, SemanticModel semanticModel) =>
        CSharpSemanticQueries
            .AltinnTypeReferences(file, semanticModel, _removedTypes)
            .Concat(CSharpSemanticQueries.InvokedAltinnMethods(file, semanticModel, _removedFactories))
            .Concat(
                CSharpSemanticQueries.InvokedAltinnMethods(
                    file,
                    semanticModel,
                    _removedQualifiedFactories,
                    containingTypeName: ResultTypeName
                )
            );

    private static IEnumerable<CSharpApiMatch> SyntaxMatches(ScannedCSharpFile file) =>
        CSharpSyntaxQueries
            .TypeReferences(file, _removedTypes)
            .Concat(CSharpSyntaxQueries.InvokedMethods(file, _removedFactories))
            .Concat(CSharpSyntaxQueries.InvokedMethodsOn(file, ResultTypeName, _removedQualifiedFactories));
}
