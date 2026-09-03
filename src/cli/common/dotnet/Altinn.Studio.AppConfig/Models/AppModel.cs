using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

public sealed class AppModel
{
    public required string Root { get; init; }

    public required string ApplicationId { get; init; }
    public required IReadOnlyList<DataType> DataTypes { get; init; }
    public required IReadOnlyList<ProcessTask> Tasks { get; init; }
    public required IReadOnlyList<LayoutSet> LayoutSets { get; init; }
    public required IReadOnlyList<TextResources> TextResources { get; init; }

    public required IReadOnlyDictionary<string, string> SchemaProperties { get; init; }

    public required IReadOnlyDictionary<
        string,
        IReadOnlyDictionary<string, string>
    > SchemaPropertiesByFile { get; init; }

    public required IReadOnlyDictionary<string, SourceSpan> SchemaPropertyPositions { get; init; }

    public required IReadOnlyDictionary<string, bool> CSharpClasses { get; init; }

    public required IReadOnlyDictionary<string, ModelTypeInfo> CSharpModel { get; init; }

    public required IReadOnlyDictionary<string, bool> OptionsFiles { get; init; }

    public required IReadOnlySet<string> OptionsProviders { get; init; }

    public required IReadOnlySet<string> LayoutFiles { get; init; }

    public required SemanticReferences Refs { get; init; }

    public required IReadOnlyList<string> TitleLanguages { get; init; }
    public required IReadOnlyList<ParserNote> ParserNotes { get; init; }

    public required IReadOnlyList<ParseError> ParseErrors { get; init; }

    public required UnsupportedAppVersion? UnsupportedAppVersion { get; init; }

    public required string? AltinnAppVersion { get; init; }

    public const string CustomReceiptFolder = "CustomReceipt";

    private SymbolTable? _symbols;

    internal SymbolTable SymbolTable => _symbols ??= SymbolResolver.Build(this);

    public LayoutSet? LayoutSetForTask(string taskId) =>
        LayoutSets.FirstOrDefault(s => string.Equals(s.Id, taskId, StringComparison.Ordinal));

    public LayoutFolderRole FolderRole(LayoutSet set)
    {
        if (Tasks.Any(t => string.Equals(t.Id, set.Id, StringComparison.Ordinal)))
            return LayoutFolderRole.Task;
        if (Refs.LayoutSets.Any(r => string.Equals(r.Value, set.Id, StringComparison.Ordinal)))
            return LayoutFolderRole.Referenced;
        if (string.Equals(set.Id, CustomReceiptFolder, StringComparison.Ordinal))
            return LayoutFolderRole.Receipt;
        return LayoutFolderRole.Unused;
    }

    public IEnumerable<string> DeclaredLanguages()
    {
        var seen = new HashSet<string>();
        foreach (var lang in TitleLanguages)
        {
            if (string.IsNullOrEmpty(lang))
                continue;
            if (seen.Add(lang))
                yield return lang;
        }
    }

    public IEnumerable<(LayoutSet Set, LayoutComponent Component)> AllComponentsWithSet()
    {
        foreach (var set in LayoutSets)
        {
            foreach (var comp in set.AllComponents)
                yield return (set, comp);
        }
    }

    public IEnumerable<(LayoutSet Set, LayoutComponent Component)> ComponentsOfType(params string[] types)
    {
        foreach (var pair in AllComponentsWithSet())
            if (types.Contains(pair.Component.Type))
                yield return pair;
    }
}
