using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ExpressionWalker
{
    internal enum RefKind
    {
        Component,
        Page,
        TextKey,
        OptionsId,
        DataType,

        DataModelPath,
    }

    internal static RefKind? RefArgKindAt(string fn, int argIndex)
    {
        if (fn == "dataModel")
            return argIndex switch
            {
                1 => RefKind.DataModelPath,
                2 => RefKind.DataType,
                _ => null,
            };
        if (_refArgs.TryGetValue(fn, out var descriptors))
            foreach (var (arg, kind) in descriptors)
                if (arg == argIndex)
                    return kind;
        return null;
    }

    private static readonly Dictionary<string, (int Arg, RefKind Kind)[]> _refArgs = new(StringComparer.Ordinal)
    {
        ["component"] = new[] { (1, RefKind.Component) },
        ["displayValue"] = new[] { (1, RefKind.Component) },
        ["linkToComponent"] = new[] { (2, RefKind.Component) },
        ["linkToPage"] = new[] { (2, RefKind.Page) },
        ["text"] = new[] { (1, RefKind.TextKey) },
        ["optionLabel"] = new[] { (1, RefKind.OptionsId) },
        ["countDataElements"] = new[] { (1, RefKind.DataType) },
    };

    public static void Collect(AppModelBuilder app, string ownerId, string file, string basePtr, JsonElement c)
    {
        if (c.ValueKind != JsonValueKind.Object)
            return;
        foreach (var p in c.EnumerateObject())
        {
            if (_structural.Contains(p.Name))
                continue;
            CollectValue(app, ownerId, file, $"{basePtr}/{p.Name}", p.Value);
        }
    }

    public static void CollectValue(
        AppModelBuilder app,
        string ownerId,
        string file,
        string ptr,
        JsonElement node,
        IReadOnlySet<string>? functions = null,
        Func<string, SourceSpan>? spanAt = null
    )
    {
        switch (node.ValueKind)
        {
            case JsonValueKind.Array:
                MatchExpression(app, ownerId, file, ptr, node, functions, spanAt);
                int i = 0;
                foreach (var child in node.EnumerateArray())
                {
                    CollectValue(app, ownerId, file, $"{ptr}/{i}", child, functions, spanAt);
                    i++;
                }
                break;
            case JsonValueKind.Object:
                foreach (var p in node.EnumerateObject())
                {
                    CollectValue(app, ownerId, file, $"{ptr}/{p.Name}", p.Value, functions, spanAt);
                }
                break;
        }
    }

    private static void MatchExpression(
        AppModelBuilder app,
        string ownerId,
        string file,
        string ptr,
        JsonElement arr,
        IReadOnlySet<string>? functions,
        Func<string, SourceSpan>? spanAt
    )
    {
        int len = arr.GetArrayLength();
        if (len < 1 || arr[0].ValueKind != JsonValueKind.String)
            return;
        var fn = arr[0].GetString();
        if (fn is null || (functions is not null && !functions.Contains(fn)))
            return;

        SourceSpan ArgSpan(int arg) => spanAt is null ? new SourceSpan(file, $"{ptr}/{arg}") : spanAt($"{ptr}/{arg}");

        if (fn == "dataModel")
        {
            string? explicitType = LiteralArg(arr, len, 2);
            if (explicitType is not null)
                app.Refs.DataTypes.Add(new DataTypeReference(explicitType, ArgSpan(2)));
            var path = LiteralArg(arr, len, 1);
            if (path is not null)
                app.Refs.DataModel.Add(new DataModelReference(path, ownerId, "expression", ArgSpan(1), explicitType));
            return;
        }

        if (!_refArgs.TryGetValue(fn, out var descriptors))
            return;
        foreach (var (arg, kind) in descriptors)
        {
            var value = LiteralArg(arr, len, arg);
            if (value is not null)
                Record(app, ownerId, ArgSpan(arg), kind, value);
        }
    }

    private static string? LiteralArg(JsonElement arr, int len, int arg)
    {
        if (arg >= len || arr[arg].ValueKind != JsonValueKind.String)
            return null;
        var v = arr[arg].GetString();
        return string.IsNullOrEmpty(v) ? null : v;
    }

    private static void Record(AppModelBuilder app, string ownerId, SourceSpan pos, RefKind kind, string value)
    {
        switch (kind)
        {
            case RefKind.Component:
                app.Refs.ComponentIds.Add(new ComponentIdReference(value, ownerId, pos));
                break;
            case RefKind.Page:
                app.Refs.PageFiles.Add(new PageFileReference(value, pos, Ordered: false));
                break;
            case RefKind.TextKey:
                app.Refs.TextResources.Add(new TextResourceReference(value, ownerId, "expression", pos));
                break;
            case RefKind.OptionsId:
                app.Refs.OptionsIds.Add(new OptionsIdReference(value, ownerId, pos));
                break;
            case RefKind.DataType:
                app.Refs.DataTypes.Add(new DataTypeReference(value, pos));
                break;
        }
    }

    private static readonly HashSet<string> _structural = new(StringComparer.Ordinal)
    {
        "id",
        "type",
        "children",
        "componentRef",
        "layoutSet",
        "dataModelBindings",
        "textResourceBindings",
        "optionsId",
        "image",
        "$schema",
    };
}
