using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Models;

internal static class BindingResolver
{
    public static string? Resolve(AppModel app, DataModelReference r)
    {
        if (!string.IsNullOrEmpty(r.ExplicitDataType))
            return r.ExplicitDataType;
        return ResolveFromOwner(app, OwnerSegment(r.Position.File));
    }

    public static string? Resolve(AppModel app, LayoutSet owningSet, ComponentBinding binding)
    {
        if (!string.IsNullOrEmpty(binding.ExplicitDataType))
            return binding.ExplicitDataType;
        return ResolveFromOwner(app, owningSet.Id);
    }

    public static string? DefaultDataTypeFor(AppModel app, string setId) => ResolveFromOwner(app, setId);

    public static IReadOnlyDictionary<string, string>? SchemaFor(AppModel app, string dataType) =>
        app.SchemaPropertiesByFile.TryGetValue(AppPaths.SchemaFile(dataType), out var props) ? props : null;

    private static string? ResolveFromOwner(AppModel app, string? owner)
    {
        if (owner is null)
            return null;
        foreach (var set in app.LayoutSets)
        {
            if (
                string.Equals(set.Id, owner, StringComparison.Ordinal)
                && set.DefaultDataReq is { Value: var dt }
                && dt.Length > 0
            )
                return dt;
        }
        string? candidate = null;
        foreach (var dataType in app.DataTypes)
        {
            if (!dataType.IsForm)
                continue;
            if (!string.Equals(dataType.TaskId, owner, StringComparison.Ordinal))
                continue;
            if (candidate is not null)
                return null;
            candidate = dataType.Id;
        }
        return candidate;
    }

    private static string? OwnerSegment(string file)
    {
        var set = AppPaths.SetIdOf(file);
        return string.IsNullOrEmpty(set) ? null : set;
    }
}

public sealed record ComponentBinding(string Path, string? ExplicitDataType = null);
