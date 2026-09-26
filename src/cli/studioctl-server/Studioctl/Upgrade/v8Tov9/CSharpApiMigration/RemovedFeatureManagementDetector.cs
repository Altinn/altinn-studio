namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for app code that used the <c>Microsoft.FeatureManagement</c> package through the app
/// libraries. v9 reads the feature flags in the <c>FeatureManagement</c> configuration section itself, no longer
/// references the package and no longer registers <c>IFeatureManager</c>, so an app that injects it does not
/// compile until it either adds the package and <c>AddFeatureManagement()</c> in its own Program.cs, or reads the
/// flags through <c>IFrontendFeatures.IsEnabled(name)</c>. The flags themselves stay where they are.
/// </summary>
internal sealed class RemovedFeatureManagementDetector
{
    private const string PackageNamespace = "Microsoft.FeatureManagement";

    private static readonly IReadOnlySet<string> _typeNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "IFeatureManager",
        "IFeatureManagerSnapshot",
        "IVariantFeatureManager",
        "FeatureGateAttribute",
        "FeatureGate",
    };

    private static readonly IReadOnlySet<string> _registrationMethodNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "AddFeatureManagement",
    };

    private const string Summary =
        "The app libraries no longer reference Microsoft.FeatureManagement or register IFeatureManager in v9; the "
        + "flags in the FeatureManagement section of appsettings.json are read by the libraries themselves. Where "
        + "the app only checks a flag, inject IFrontendFeatures and call IsEnabled(name) - it is synchronous. Where "
        + "the app needs the package itself, add Microsoft.FeatureManagement.AspNetCore to the project and call "
        + "services.AddFeatureManagement() in Program.cs. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedFeatureManagementDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .UsingNamespaces(file, PackageNamespace)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _typeNames))
                .Concat(CSharpSyntaxQueries.InvokedMethods(file, _registrationMethodNames))
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
