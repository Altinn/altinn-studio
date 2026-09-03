using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;

namespace Altinn.Studio.AppConfig.Models;

internal static class ReferenceResolver
{
    public static List<ResolvedBinding> ResolveBindings(AppModel model)
    {
        var result = new List<ResolvedBinding>(model.Refs.DataModel.Count);
        foreach (var r in model.Refs.DataModel)
        {
            var effective = BindingResolver.Resolve(model, r);
            var props = effective is null ? null : BindingResolver.SchemaFor(model, effective);
            result.Add(new ResolvedBinding(r, effective, props));
        }
        return result;
    }

    public static List<UnresolvedReference> ResolveDangling(AppModel model, IReadOnlyList<ResolvedBinding> bindings)
    {
        var unresolved = new List<UnresolvedReference>();
        var setsById = model.LayoutSets.ToDictionary(s => s.Id, s => s, StringComparer.Ordinal);

        foreach (var r in model.Refs.ComponentIds)
        {
            var scope = AppPaths.ScopeOf(r.InTaskId, r.Position.File);
            var hasSet = setsById.TryGetValue(scope, out var set);
            if (set?.Components.ContainsKey(r.Value) == true)
                continue;
            unresolved.Add(
                new UnresolvedReference(
                    SymbolKind.Component,
                    r.Value,
                    scope,
                    r.Position,
                    OwningComponentId: r.OwningComponentId,
                    ScopeExists: r.InTaskId is null || hasSet
                )
            );
        }

        foreach (var r in model.Refs.PageFiles)
        {
            var scope = AppPaths.ScopeOf(r.InTaskId, r.Position.File);
            var scopeExists = r.InTaskId is null || setsById.ContainsKey(scope);
            if (scopeExists && model.LayoutFiles.Contains("App/ui/" + scope + "/layouts/" + r.Value + ".json"))
                continue;
            unresolved.Add(
                new UnresolvedReference(SymbolKind.Page, r.Value, scope, r.Position, ScopeExists: scopeExists)
            );
        }

        var dataTypes = new HashSet<string>(model.DataTypes.Select(d => d.Id), StringComparer.Ordinal);
        foreach (var r in model.Refs.DataTypes)
            if (!dataTypes.Contains(r.Value))
                unresolved.Add(new UnresolvedReference(SymbolKind.DataType, r.Value, "", r.Position));

        var tasks = new HashSet<string>(model.Tasks.Select(t => t.Id), StringComparer.Ordinal);
        foreach (var r in model.Refs.TaskIds)
            if (!tasks.Contains(r.Value))
                unresolved.Add(new UnresolvedReference(SymbolKind.Task, r.Value, "", r.Position));

        foreach (var r in model.Refs.LayoutSets)
            if (!setsById.ContainsKey(r.Value))
                unresolved.Add(new UnresolvedReference(SymbolKind.LayoutSet, r.Value, "", r.Position));

        var textKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var tr in model.TextResources)
        {
            foreach (var k in tr.Ids.Keys)
                textKeys.Add(k);
        }
        textKeys.UnionWith(BuiltinTextKeys.Keys);
        foreach (var r in model.Refs.TextResources)
            if (!textKeys.Contains(r.Value))
                unresolved.Add(
                    new UnresolvedReference(
                        SymbolKind.TextKey,
                        r.Value,
                        "",
                        r.Position,
                        OwningComponentId: r.OwningComponentId,
                        BindingName: r.BindingName
                    )
                );

        foreach (var r in model.Refs.OptionsIds)
            if (!model.OptionsFiles.ContainsKey(r.Value) && !model.OptionsProviders.Contains(r.Value))
                unresolved.Add(new UnresolvedReference(SymbolKind.OptionsId, r.Value, "", r.Position));

        foreach (var r in model.Refs.CSharp)
            if (!(model.CSharpClasses.TryGetValue(r.Value, out var ok) && ok))
                unresolved.Add(new UnresolvedReference(SymbolKind.CSharpClass, r.Value, "", r.Position));

        foreach (var rb in bindings)
        {
            var r = rb.Reference;
            if (rb.EffectiveDataType is null)
            {
                if (!ModelPath.Exists(model.SchemaProperties, r.Value) && !ResolvesInCSharpModel(model, null, r.Value))
                    unresolved.Add(DanglingPath(r, new DataModelFacts(EffectiveDataType: null, SchemaPresent: false)));
                continue;
            }
            if (rb.Props is null)
            {
                if (!ResolvesInCSharpModel(model, rb.EffectiveDataType, r.Value))
                    unresolved.Add(DanglingPath(r, new DataModelFacts(rb.EffectiveDataType, SchemaPresent: false)));
            }
            else if (
                !ModelPath.Exists(rb.Props, r.Value) && !ResolvesInCSharpModel(model, rb.EffectiveDataType, r.Value)
            )
                unresolved.Add(DanglingPath(r, new DataModelFacts(rb.EffectiveDataType, SchemaPresent: true)));
        }

        return unresolved;
    }

    private static UnresolvedReference DanglingPath(DataModelReference r, DataModelFacts facts) =>
        new(
            SymbolKind.DataModelPath,
            r.Value,
            facts.EffectiveDataType ?? "",
            r.Position,
            OwningComponentId: r.OwningComponentId,
            BindingName: r.BindingName,
            DataModel: facts
        );

    private static bool ResolvesInCSharpModel(AppModel model, string? dataType, string path)
    {
        if (dataType is null)
            return false;
        var classRef = model
            .DataTypes.FirstOrDefault(d => string.Equals(d.Id, dataType, StringComparison.Ordinal))
            ?.ClassRef;
        return !string.IsNullOrEmpty(classRef)
            && CSharpModelPath.Resolve(model.CSharpModel, classRef, path) is not null;
    }
}
