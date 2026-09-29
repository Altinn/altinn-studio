namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the app options types and members removed in v9, when <c>IAppOptionsService</c>
/// took over reading the option lists an app ships as <c>options/{optionId}.json</c> from the in-memory app
/// files and expanding joined lists itself. The app-implementable <c>IAppOptionsFileHandler</c> and the
/// <c>DefaultAppOptionsProvider</c> an app could construct or derive from are gone (namespace
/// <c>Altinn.App.Core.Features.Options</c>), as are the internal factories and the <c>JoinedAppOptionsProvider</c>
/// class behind <c>AddJoinedAppOptions</c>. The <c>IsInstanceAppOptionsProviderRegistered</c> member left
/// <c>IAppOptionsService</c>. An option list that needs code behind it is an <c>IAppOptionsProvider</c>, which is
/// unchanged, so this only reports the usages a developer must port by hand.
/// </summary>
internal sealed class RemovedAppOptionsTypeDetector
{
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IAppOptionsFileHandler",
        "AppOptionsFileHandler",
        "DefaultAppOptionsProvider",
        "AppOptionsFactory",
        "InstanceAppOptionsFactory",
        "JoinedAppOptionsProvider",
    };

    private static readonly IReadOnlySet<string> _removedMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "IsInstanceAppOptionsProviderRegistered",
    };

    private const string AppOptionsServiceTypeName = "IAppOptionsService";

    private const string TypesSummary =
        "Removed app options types (IAppOptionsFileHandler, AppOptionsFileHandler, DefaultAppOptionsProvider, "
        + "AppOptionsFactory, InstanceAppOptionsFactory, JoinedAppOptionsProvider) are used by this app and must be "
        + "ported by hand. In v9 IAppOptionsService reads the option lists in options/*.json from the app files "
        + "loaded at startup, so a custom file handler can no longer change where they come from: register an "
        + "IAppOptionsProvider with the option id instead, and inject IAppOptionsService where the factories were "
        + "used. A joined list is registered with services.AddJoinedAppOptions(id, subListIds) and served by "
        + "IAppOptionsService itself. Remember to remove the matching DI registrations. Usages found:";

    private const string MembersSummary =
        "IAppOptionsService.IsInstanceAppOptionsProviderRegistered(optionId) is removed in v9. Load the list with "
        + "IAppOptionsService.GetOptionsAsync(lookups, language, dataAccessor, cancellationToken) and check whether "
        + "the result's Source is AppOptionsSource.InstanceProvider, or inspect GetRegistrations() for an "
        + "InstanceProviderOptionsRegistration with the id. Call sites found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedAppOptionsTypeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var typeMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
        );

        // The member name is unique to IAppOptionsService, so the syntax fallback cannot misfire
        var memberMatches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? CSharpSemanticQueries.InvokedAltinnMethods(
                    file,
                    semanticModel,
                    _removedMembers,
                    containingTypeName: AppOptionsServiceTypeName
                )
                : CSharpSyntaxQueries.InvokedMethods(file, _removedMembers)
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(TypesSummary, typeMatches),
            WarnOnlyDetector.Report(MembersSummary, memberMatches)
        );
    }
}
