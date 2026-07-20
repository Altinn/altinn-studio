using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

internal sealed record SymbolIndex(
    IReadOnlyDictionary<Symbol, IReadOnlyList<SourceSpan>> Declarations,
    IReadOnlyDictionary<Symbol, IReadOnlyList<SourceSpan>> Uses,
    IReadOnlyDictionary<(string File, string Pointer), Symbol> Site
);

internal static class SymbolIndexer
{
    public static SymbolIndex Build(AppModel model)
    {
        var declarations = new Dictionary<Symbol, List<SourceSpan>>();
        var uses = new Dictionary<Symbol, List<SourceSpan>>();
        var site = new Dictionary<(string File, string Pointer), Symbol>();

        void Use(Symbol id, SourceSpan at)
        {
            Add(uses, id, at);
            site.TryAdd((at.File, at.Pointer), id);
        }

        void Declare(Symbol id, SourceSpan navSpan, string? sitePointer)
        {
            Add(declarations, id, navSpan);
            if (sitePointer is not null)
                site.TryAdd((navSpan.File, sitePointer), id);
        }

        foreach (var r in model.Refs.ComponentIds)
            Use(new Symbol(SymbolKind.Component, r.Value, AppPaths.ScopeOf(r.InTaskId, r.Position.File)), r.Position);
        foreach (var r in model.Refs.PageFiles)
            Use(new Symbol(SymbolKind.Page, r.Value, AppPaths.ScopeOf(r.InTaskId, r.Position.File)), r.Position);
        foreach (var r in model.Refs.DataTypes)
            Use(new Symbol(SymbolKind.DataType, r.Value), r.Position);
        foreach (var r in model.Refs.TextResources)
            Use(new Symbol(SymbolKind.TextKey, r.Value), r.Position);
        foreach (var r in model.Refs.TaskIds)
            Use(new Symbol(SymbolKind.Task, r.Value), r.Position);
        foreach (var r in model.Refs.OptionsIds)
            Use(new Symbol(SymbolKind.OptionsId, r.Value), r.Position);
        foreach (var r in model.Refs.LayoutSets)
            Use(new Symbol(SymbolKind.LayoutSet, r.Value), r.Position);
        foreach (var r in model.Refs.CSharp)
            Use(new Symbol(SymbolKind.CSharpClass, r.Value), r.Position);

        foreach (var set in model.LayoutSets)
        {
            foreach (var comp in set.AllComponents)
                Declare(
                    new Symbol(SymbolKind.Component, comp.Id, comp.LayoutSet),
                    comp.Position,
                    comp.Position.Pointer + "/id"
                );
        }
        foreach (var dt in model.DataTypes)
            Declare(new Symbol(SymbolKind.DataType, dt.Id), dt.Position, dt.Position.Pointer);
        foreach (var tr in model.TextResources)
        {
            foreach (var (key, span) in tr.Ids)
                Declare(new Symbol(SymbolKind.TextKey, key), span, span.Pointer);
        }
        foreach (var t in model.Tasks)
            Declare(new Symbol(SymbolKind.Task, t.Id), t.Position, sitePointer: null);
        foreach (var file in model.LayoutFiles)
            Declare(
                new Symbol(SymbolKind.Page, Path.GetFileNameWithoutExtension(file), AppPaths.SetIdOf(file)),
                new SourceSpan(file, "", 1, 1),
                sitePointer: null
            );
        foreach (var optionsId in model.OptionsFiles.Keys)
            Declare(
                new Symbol(SymbolKind.OptionsId, optionsId),
                new SourceSpan("App/options/" + optionsId + ".json", "", 1, 1),
                sitePointer: null
            );
        foreach (var set in model.LayoutSets)
            Declare(
                new Symbol(SymbolKind.LayoutSet, set.Id),
                new SourceSpan(set.Position.File, "", 1, 1),
                sitePointer: null
            );
        foreach (var (fqn, info) in model.CSharpModel)
        {
            if (info.Span is not { } span)
                continue;
            Declare(new Symbol(SymbolKind.CSharpClass, fqn), span, sitePointer: null);
            var dot = fqn.LastIndexOf('.');
            if (dot >= 0)
                Declare(new Symbol(SymbolKind.CSharpClass, fqn[(dot + 1)..]), span, sitePointer: null);
        }

        return new SymbolIndex(Freeze(declarations), Freeze(uses), site);
    }

    private static void Add(Dictionary<Symbol, List<SourceSpan>> map, Symbol id, SourceSpan span)
    {
        if (!map.TryGetValue(id, out var list))
            map[id] = list = new List<SourceSpan>();
        list.Add(span);
    }

    private static IReadOnlyDictionary<Symbol, IReadOnlyList<SourceSpan>> Freeze(
        Dictionary<Symbol, List<SourceSpan>> map
    )
    {
        var frozen = new Dictionary<Symbol, IReadOnlyList<SourceSpan>>(map.Count);
        foreach (var (id, spans) in map)
            frozen[id] = spans;
        return frozen;
    }
}
