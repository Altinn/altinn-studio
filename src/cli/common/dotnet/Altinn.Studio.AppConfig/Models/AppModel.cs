using Altinn.Studio.AppConfig.Documents;
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

    public required IReadOnlyDictionary<
        string,
        IReadOnlyDictionary<string, SourceSpan>
    > SchemaPropertyPositionsByFile { get; init; }

    public required IReadOnlyDictionary<string, bool> CSharpClasses { get; init; }

    public required IReadOnlyDictionary<string, ModelTypeInfo> CSharpModel { get; init; }

    public required IReadOnlyDictionary<string, bool> OptionsFiles { get; init; }

    public required IReadOnlySet<string> OptionsProviders { get; init; }

    public required IReadOnlySet<string> LayoutFiles { get; init; }

    public required SemanticReferences Refs { get; init; }

    public required IReadOnlyList<string> TitleLanguages { get; init; }
    public required IReadOnlyList<ParserNote> ParserNotes { get; init; }

    public required IReadOnlyList<ParseError> ParseErrors { get; init; }

    public required IReadOnlyList<DeprecatedConfig> Deprecations { get; init; }

    public required UnsupportedAppVersion? UnsupportedAppVersion { get; init; }

    public required string? AltinnAppVersion { get; init; }

    public const string CustomReceiptFolder = "CustomReceipt";

    private SymbolTable? _symbols;

    internal SymbolTable SymbolTable => _symbols ??= SymbolResolver.Build(this);

    public LayoutSet? LayoutSetForTask(string taskId) =>
        LayoutSets.FirstOrDefault(s => string.Equals(s.Id, taskId, StringComparison.Ordinal));

    public LayoutFolderRole FolderRole(LayoutSet set)
    {
        ArgumentNullException.ThrowIfNull(set);
        if (Tasks.Any(t => string.Equals(t.Id, set.Id, StringComparison.Ordinal)))
            return LayoutFolderRole.Task;
        if (Refs.LayoutSets.Any(r => string.Equals(r.Value, set.Id, StringComparison.Ordinal)))
            return LayoutFolderRole.Referenced;
        if (string.Equals(set.Id, CustomReceiptFolder, StringComparison.Ordinal))
            return LayoutFolderRole.Receipt;
        return LayoutFolderRole.Unused;
    }

    public IEnumerable<LayoutSet> SubformFolders() =>
        LayoutSets.Where(set => Refs.SubformFolders.Any(r => string.Equals(r.Value, set.Id, StringComparison.Ordinal)));

    public IReadOnlySet<string> SubformDataTypes()
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var set in SubformFolders())
            if (set.DefaultDataReq is { } dataType)
                ids.Add(dataType.Value);
        return ids;
    }

    internal IReadOnlyList<string> ScopesOf(ComponentIdReference reference)
    {
        var scope = AppPaths.ScopeOf(reference.InTaskId, reference.Position.File);
        var scopes = new List<string> { scope };
        if (!reference.IsSummaryOverride)
            return scopes;
        foreach (var subform in Refs.SubformFolders)
            if (
                string.Equals(AppPaths.SetIdOf(subform.Position.File), scope, StringComparison.Ordinal)
                && !scopes.Contains(subform.Value)
            )
                scopes.Add(subform.Value);
        return scopes;
    }

    public IEnumerable<TextResources> LanguageTextResources() => TextResources.Where(IsServedLanguage);

    private static bool IsServedLanguage(TextResources texts) =>
        texts.Language is [>= 'a' and <= 'z', >= 'a' and <= 'z']
        && string.Equals(
            Path.GetFileName(texts.Position.File),
            $"resource.{texts.Language}.json",
            StringComparison.Ordinal
        );

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
