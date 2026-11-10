using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the eFormidling C# breaks that cannot be transformed safely: the removed
/// <c>IEFormidlingService.SendEFormidlingShipment</c> overloads that take an <c>Instance</c> (alone, or with
/// the <c>ValidAltinnEFormidlingConfiguration</c>), the deleted
/// <c>IEFormidlingLegacyConfigurationProvider</c>, and code references to the removed
/// <c>AppSettings.EnableEFormidling</c> property (the config key itself is stripped by the eFormidling
/// service-task migration; this covers C# that read the property). The related
/// <c>IEFormidlingMetadata</c> and <c>IEFormidlingReceivers</c> signature changes are handled by
/// <see cref="EFormidlingHookSignatureMigration"/> and are not reported here.
/// </summary>
internal sealed class LegacyEFormidlingCodeDetector
{
    // IEFormidlingService itself still exists in v9 - only the SendEFormidlingShipment overloads that
    // take an Instance were removed, so type references to the service are fine and only the legacy
    // call/implementation shapes are detected (see Detect()).
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IEFormidlingLegacyConfigurationProvider",
    };

    private const string LegacyShipmentMethod = "SendEFormidlingShipment";
    private const int LegacyShipmentArity = 1;
    private const string InstanceTypeName = "Instance";

    private static readonly IReadOnlySet<string> _removedMembers = new HashSet<string>(StringComparer.Ordinal)
    {
        "EnableEFormidling",
    };

    private const string InterfaceSummary =
        "eFormidling interfaces changed in v9. IEFormidlingLegacyConfigurationProvider is removed, and "
        + "IEFormidlingService.SendEFormidlingShipment no longer accepts just an Instance - the v9 method is "
        + "SendEFormidlingShipment(IInstanceDataAccessor, ValidAltinnEFormidlingConfiguration, CancellationToken), "
        + "driven by the eFormidling BPMN service task, and an implementation of the service also needs "
        + "GetEFormidlingShipmentStatus. Update or remove these implementations by hand. Usages found:";

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
    /// With the v8 compilation a call binds to the overload it uses, so the first parameter's type - not
    /// argument counting - identifies the removed overloads, whichever of the two the call uses. Declarations
    /// are matched by their shape: an app's implementation is declared in the app, not the SDK.
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
                    predicate: static method =>
                        method.Parameters.Length > 0 && method.Parameters[0].Type.Name == InstanceTypeName
                )
            )
            .Concat(LegacyShipmentDeclarations(file));

    /// <summary>
    /// Without a compilation only one-argument calls are reported: a two-argument call looks the same whether it
    /// passes an instance or the v9 data accessor.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> SyntaxInterfaceMatches(ScannedCSharpFile file) =>
        CSharpSyntaxQueries
            .TypesImplementing(file, _removedTypes)
            .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
            .Concat(CSharpSyntaxQueries.InvokedMethodsWithArity(file, LegacyShipmentMethod, LegacyShipmentArity))
            .Concat(LegacyShipmentDeclarations(file));

    /// <summary>
    /// Declarations of the removed overloads: one parameter, or two with an <c>Instance</c> first. The v9 method
    /// takes the data accessor first, so the type tells a two-parameter declaration apart from migrated code.
    /// </summary>
    private static IEnumerable<CSharpApiMatch> LegacyShipmentDeclarations(ScannedCSharpFile file) =>
        CSharpSyntaxQueries
            .MethodDeclarations(file, LegacyShipmentMethod, LegacyShipmentArity)
            .Concat(
                file.Root.DescendantNodes()
                    .OfType<MethodDeclarationSyntax>()
                    .Where(static method =>
                        method.Identifier.Text == LegacyShipmentMethod
                        && method.ParameterList.Parameters.Count == 2
                        && method.ParameterList.Parameters[0].Type
                            is IdentifierNameSyntax { Identifier.Text: InstanceTypeName }
                                or QualifiedNameSyntax { Right.Identifier.Text: InstanceTypeName }
                    )
                    .Select(method => new CSharpApiMatch(
                        file.RelativePath,
                        file.GetLine(method),
                        $"{LegacyShipmentMethod}(2 param)"
                    ))
            );
}
