namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the app options types removed in v9, when <c>IAppOptionsService</c> took over
/// reading the option lists an app ships as <c>options/{optionId}.json</c> from the in-memory app files.
/// The app-implementable <c>IAppOptionsFileHandler</c> and the <c>DefaultAppOptionsProvider</c> an app
/// could construct or derive from are gone (namespace <c>Altinn.App.Core.Features.Options</c>), as are
/// the internal factories. An option list that needs code behind it is an <c>IAppOptionsProvider</c>,
/// which is unchanged, so this only reports the usages a developer must port by hand.
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
    };

    private const string Summary =
        "Removed app options types (IAppOptionsFileHandler, AppOptionsFileHandler, DefaultAppOptionsProvider, "
        + "AppOptionsFactory, InstanceAppOptionsFactory) are used by this app and must be ported by hand. In v9 "
        + "IAppOptionsService reads the option lists in options/*.json from the app files loaded at startup, so a "
        + "custom file handler can no longer change where they come from: register an IAppOptionsProvider with the "
        + "option id instead, and inject IAppOptionsService where the factories were used. Remember to remove the "
        + "matching DI registrations. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedAppOptionsTypeDetector(CSharpSourceScanner scanner)
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
