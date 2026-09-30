using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

internal sealed class AppModelBuilder
{
    public string ApplicationId { get; set; } = "";
    public List<DataType> DataTypes { get; } = new();
    public List<ProcessTask> Tasks { get; } = new();
    public List<LayoutSetBuilder> LayoutSets { get; } = new();
    public List<TextResources> TextResources { get; } = new();

    public Dictionary<string, string> SchemaProperties { get; } = new();
    public Dictionary<string, Dictionary<string, string>> SchemaPropertiesByFile { get; } = new(StringComparer.Ordinal);
    public Dictionary<string, Dictionary<string, SourceSpan>> SchemaPropertyPositionsByFile { get; } =
        new(StringComparer.Ordinal);

    public Dictionary<string, bool> CSharpClasses { get; } = new();
    public Dictionary<string, ModelTypeInfo> CSharpModel { get; } = new();

    public Dictionary<string, bool> OptionsFiles { get; } = new();
    public Dictionary<string, OptionsProvider> OptionsProviders { get; } = new(StringComparer.OrdinalIgnoreCase);
    public List<OptionsProviderWithUnknownId> OptionsProvidersWithUnknownId { get; } = new();
    public HashSet<string> CustomTaskTypes { get; } = new(StringComparer.Ordinal);

    public HashSet<string> LayoutFiles { get; } = new(StringComparer.Ordinal);

    public HashSet<string> StringLiterals { get; } = new(StringComparer.Ordinal);

    public SemanticReferencesBuilder Refs { get; } = new();

    public List<string> TitleLanguages { get; } = new();
    public List<ParserNote> ParserNotes { get; } = new();
    public List<ParseError> ParseErrors { get; } = new();
    public List<DeprecatedConfig> Deprecations { get; } = new();
    public UnsupportedAppVersion? UnsupportedAppVersion { get; set; }
    public string? AltinnAppVersion { get; set; }

    public void RecordCoverageGap(string kind, string detail, SourceSpan position) =>
        ParserNotes.Add(new ParserNote(kind, detail, position));

    public void RecordDeprecation(string kind, string detail, SourceSpan position) =>
        Deprecations.Add(new DeprecatedConfig(kind, detail, position));
}
