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
    public Dictionary<string, SourceSpan> SchemaPropertyPositions { get; } = new(StringComparer.Ordinal);

    public Dictionary<string, bool> CSharpClasses { get; } = new();
    public Dictionary<string, ModelTypeInfo> CSharpModel { get; } = new();

    public Dictionary<string, bool> OptionsFiles { get; } = new();
    public HashSet<string> OptionsProviders { get; } = new(StringComparer.Ordinal);

    public HashSet<string> LayoutFiles { get; } = new(StringComparer.Ordinal);

    public SemanticReferencesBuilder Refs { get; } = new();

    public List<string> TitleLanguages { get; } = new();
    public List<ParserNote> ParserNotes { get; } = new();
    public List<ParseError> ParseErrors { get; } = new();
    public UnsupportedAppVersion? UnsupportedAppVersion { get; set; }
    public string? AltinnAppVersion { get; set; }

    public void RecordCoverageGap(string kind, string detail, SourceSpan position) =>
        ParserNotes.Add(new ParserNote(kind, detail, position));
}
