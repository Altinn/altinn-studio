using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the eFormidling C# breaks that cannot be transformed safely: the removed
/// single-argument <c>IEFormidlingService.SendEFormidlingShipment(Instance)</c>, the deleted
/// <c>IEFormidlingLegacyConfigurationProvider</c>, and code references to the removed
/// <c>AppSettings.EnableEFormidling</c> property (the config key itself is stripped by the eFormidling
/// service-task migration; this covers C# that read the property). The related
/// <c>IEFormidlingReceivers</c> signature change is handled by its own auto-migration and is not
/// reported here.
/// </summary>
internal sealed class LegacyEFormidlingCodeDetector
{
    // IEFormidlingService itself still exists in v9 - only the single-argument
    // SendEFormidlingShipment(Instance) overload was removed, so type references to the service
    // are fine and only the legacy call/implementation shape is detected (see Detect()).
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IEFormidlingLegacyConfigurationProvider",
    };

    private const string LegacyShipmentMethod = "SendEFormidlingShipment";
    private const int LegacyShipmentArity = 1;

    private static readonly IReadOnlySet<string> _removedMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "EnableEFormidling",
    };

    private const string InterfaceSummary =
        "eFormidling interfaces changed in v9. IEFormidlingLegacyConfigurationProvider is removed, and "
        + "IEFormidlingService.SendEFormidlingShipment no longer accepts just an Instance - the supported "
        + "overload is SendEFormidlingShipment(Instance, ValidAltinnEFormidlingConfiguration), driven by the "
        + "eFormidling BPMN service task. Update or remove these implementations by hand. Usages found:";

    private const string SettingSummary =
        "AppSettings.EnableEFormidling is removed in v9; the on/off gate now lives on the eFormidling BPMN "
        + "service task as <altinn:disabled>. Remove these code references. Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public LegacyEFormidlingCodeDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    private static readonly IReadOnlySet<string> _legacyShipmentMethodName = new HashSet<string>(StringComparer.Ordinal)
    {
        LegacyShipmentMethod,
    };

    public MigrationResult Detect()
    {
        var interfaceMatches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? SemanticInterfaceMatches(file, semanticModel)
                : SyntaxInterfaceMatches(file)
        );

        var settingMatches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? CSharpSemanticQueries.AltinnMemberReferences(file, semanticModel, _removedMembers)
                : CSharpSyntaxQueries.MemberReferences(file, _removedMembers)
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(InterfaceSummary, interfaceMatches),
            WarnOnlyDetector.Report(SettingSummary, settingMatches)
        );
    }

    /// <summary>
    /// With the v8 compilation the removed overload binds to its symbol, so overload resolution — not
    /// argument counting — separates the removed <c>SendEFormidlingShipment(Instance)</c> from the
    /// surviving two-argument sibling. Declarations keep the arity match: an app's implementation is
    /// declared in the app, not the SDK, and its shape is what the syntax query captures.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> SemanticInterfaceMatches(
        ScannedCSharpFile file,
        SemanticModel semanticModel
    ) =>
        CSharpSemanticQueries
            .AltinnTypeReferences(file, semanticModel, _removedTypes)
            .Concat(
                CSharpSemanticQueries.InvokedAltinnMethods(
                    file,
                    semanticModel,
                    _legacyShipmentMethodName,
                    predicate: static method => method.Parameters.Length == LegacyShipmentArity
                )
            )
            .Concat(CSharpSyntaxQueries.MethodDeclarations(file, LegacyShipmentMethod, LegacyShipmentArity));

    private static IEnumerable<CSharpApiMatch> SyntaxInterfaceMatches(ScannedCSharpFile file) =>
        CSharpSyntaxQueries
            .TypesImplementing(file, _removedTypes)
            .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
            .Concat(CSharpSyntaxQueries.InvokedMethodsWithArity(file, LegacyShipmentMethod, LegacyShipmentArity))
            .Concat(CSharpSyntaxQueries.MethodDeclarations(file, LegacyShipmentMethod, LegacyShipmentArity));
}
