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
    private static readonly IReadOnlySet<string> _removedTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "IEFormidlingService",
        "IEFormidlingLegacyConfigurationProvider",
    };

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

    public MigrationResult Detect()
    {
        var interfaceMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries
                .TypesImplementing(file, _removedTypes)
                .Concat(CSharpSyntaxQueries.TypeReferences(file, _removedTypes))
        );

        var settingMatches = _scanner.Files.SelectMany(file =>
            CSharpSyntaxQueries.MemberReferences(file, _removedMembers)
        );

        return WarnOnlyDetector.Combine(
            WarnOnlyDetector.Report(InterfaceSummary, interfaceMatches),
            WarnOnlyDetector.Report(SettingSummary, settingMatches)
        );
    }
}
