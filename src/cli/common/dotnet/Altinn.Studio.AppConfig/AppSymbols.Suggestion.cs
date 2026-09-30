using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig;

public sealed partial class AppSymbols
{
    public string? SuggestCorrection(string file, int line, int col)
    {
        if (_config.ResolveNodeAt(file, line, col) is not { } node)
            return null;
        var ptr = node.Pointer;
        var model = _config.Current;

        foreach (var r in model.Refs.DataModel)
            if (Same(r.Position, file, ptr))
                return DataModelPathCorrection(r.Value, EffectiveSchema(model, r));
        foreach (var r in model.Refs.TextResources)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(r.Value, model.TextResources.SelectMany(t => t.Ids.Keys));
        foreach (var r in model.Refs.DataTypes)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(r.Value, model.DataTypes.Select(d => d.Id));
        foreach (var r in model.Refs.ComponentIds)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(
                    r.Value,
                    model.LayoutSets.SelectMany(s => s.AllComponents).Select(c => c.Id)
                );
        foreach (var r in model.Refs.OptionsIds)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(r.Value, model.OptionsFiles.Keys.Concat(model.OptionsProviders.Keys));
        foreach (var r in model.Refs.PageFiles)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(
                    r.Value,
                    model.LayoutFiles.Select(f => Path.GetFileNameWithoutExtension(f) ?? "")
                );
        foreach (var r in model.Refs.TaskIds)
            if (Same(r.Position, file, ptr))
                return NameDistance.Closest(r.Value, model.Tasks.Select(t => t.Id));
        return null;
    }

    private static string? DataModelPathCorrection(string path, IReadOnlyDictionary<string, string> schema) =>
        ModelPath.Exists(schema, path)
            ? null
            : ModelPath.DeclaredCaseOf(schema, path) ?? NameDistance.Closest(path, schema.Keys);
}
