namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// Warn-only detector for the <c>AppSettings</c> members v9 removes: <c>AppBasePath</c>, the folder and file name
/// settings that described where the app files live, and the three file name constants. The app files are read
/// from the content root of the host in the layout Studio creates, so there is nothing to configure. Code that
/// built paths from these settings has to be rewritten against the fixed layout, which is a judgment call.
/// </summary>
/// <remarks>
/// With a semantic model the references are bound to <c>AppSettings</c>; without one the member names are
/// distinctive enough to match on their own, as <see cref="CSharpSyntaxQueries.MemberReferences"/> does.
/// </remarks>
internal sealed class RemovedAppSettingsMemberDetector
{
    internal static readonly IReadOnlySet<string> RemovedMemberNames = new HashSet<string>(StringComparer.Ordinal)
    {
        "AppBasePath",
        "ConfigurationFolder",
        "OptionsFolder",
        "UiFolder",
        "ModelsFolder",
        "TextFolder",
        "ProcessFolder",
        "AuthorizationFolder",
        "FormLayoutSettingsFileName",
        "FooterFileName",
        "JsonSchemaFileName",
        "ValidationConfigurationFileName",
        "CalculationConfigurationFileName",
        "ApplicationMetadataFileName",
        "ApplicationXACMLPolicyFileName",
        "ProcessFileName",
        "JSON_SCHEMA_FILENAME",
        "VALIDATION_CONFIG_FILENAME",
        "CALCULATION_CONFIG_FILENAME",
    };

    private const string Summary =
        "AppSettings.AppBasePath, the AppSettings folder and file name settings (ConfigurationFolder, OptionsFolder, "
        + "UiFolder, ModelsFolder, TextFolder, ProcessFolder, AuthorizationFolder and the *FileName settings) and "
        + "the JSON_SCHEMA_FILENAME, VALIDATION_CONFIG_FILENAME and CALCULATION_CONFIG_FILENAME constants are "
        + "removed in v9. The app files are read from the content root of the host in the folder layout Studio "
        + "creates, so code that built paths from these settings should read the files through IAppMetadata and "
        + "IAppResources instead, or use the fixed relative path (config/, models/, options/, ui/). Usages found:";

    private readonly CSharpSourceScanner _scanner;

    public RemovedAppSettingsMemberDetector(CSharpSourceScanner scanner)
    {
        _scanner = scanner;
    }

    public MigrationResult Detect()
    {
        var matches = _scanner.Files.SelectMany(file =>
            file.SemanticModel is { } semanticModel
                ? CSharpSemanticQueries.AltinnMemberReferences(file, semanticModel, RemovedMemberNames)
                : CSharpSyntaxQueries.MemberReferences(file, RemovedMemberNames)
        );

        return WarnOnlyDetector.Report(Summary, matches);
    }
}
