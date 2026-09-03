using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

internal sealed record DataModelFacts(string? EffectiveDataType, bool SchemaPresent);

internal sealed record UnresolvedReference(
    SymbolKind Kind,
    string Value,
    string Scope,
    SourceSpan Position,
    string OwningComponentId = "",
    string BindingName = "",
    bool ScopeExists = true,
    DataModelFacts? DataModel = null
);

internal sealed record ResolvedBinding(
    DataModelReference Reference,
    string? EffectiveDataType,
    IReadOnlyDictionary<string, string>? Props
);

internal sealed class SymbolTable
{
    public required IReadOnlyDictionary<Symbol, IReadOnlyList<SourceSpan>> Declarations { get; init; }

    public required IReadOnlyDictionary<Symbol, IReadOnlyList<SourceSpan>> Uses { get; init; }

    public required IReadOnlyDictionary<(string File, string Pointer), Symbol> Site { get; init; }

    public required IReadOnlyList<UnresolvedReference> Unresolved { get; init; }

    public required IReadOnlyList<ResolvedBinding> Bindings { get; init; }

    public IReadOnlyList<SourceSpan> DeclarationsOf(Symbol id) =>
        Declarations.TryGetValue(id, out var spans) ? spans : Array.Empty<SourceSpan>();

    public IReadOnlyList<SourceSpan> UsesOf(Symbol id) =>
        Uses.TryGetValue(id, out var spans) ? spans : Array.Empty<SourceSpan>();

    public Symbol? At(string file, string pointer) => Site.TryGetValue((file, pointer), out var id) ? id : null;

    public IEnumerable<UnresolvedReference> UnresolvedOf(SymbolKind kind)
    {
        foreach (var u in Unresolved)
            if (u.Kind == kind)
                yield return u;
    }

    public IEnumerable<(Symbol Id, IReadOnlyList<SourceSpan> Spans)> DuplicatesOf(SymbolKind kind)
    {
        foreach (var (id, spans) in Declarations)
            if (id.Kind == kind && spans.Count > 1)
                yield return (id, spans);
    }
}
