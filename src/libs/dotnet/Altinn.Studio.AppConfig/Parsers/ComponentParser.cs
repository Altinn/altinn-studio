using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ComponentParser
{
    public static void Parse(
        AppModelBuilder app,
        LayoutSetBuilder set,
        string page,
        string file,
        int idx,
        JsonElement c
    )
    {
        var id = TryString(c, "id") ?? "";
        var type = TryString(c, "type") ?? "";
        var basePtr = $"/data/layout/{idx}";
        var pos = new SourceSpan(file, basePtr);
        var multiPage = MultiPageChildren.IsEnabled(c);

        if (!string.IsNullOrEmpty(id))
        {
            var comp = new LayoutComponent
            {
                Id = id,
                Type = type,
                Page = page,
                LayoutSet = set.Id,
                Bindings = ExtractBindings(c),
                Children = ExtractChildren(c, multiPage),
                HasOptionSource =
                    c.TryGetProperty("optionsId", out _)
                    || c.TryGetProperty("options", out _)
                    || c.TryGetProperty("source", out _),
                Position = pos,
            };
            set.AllComponents.Add(comp);
            if (!set.Components.ContainsKey(id))
                set.Components[id] = comp;
        }
        ContainerRefsCollector.CollectChildren(app, id, file, basePtr, c, multiPage);
        ContainerRefsCollector.CollectContainerNestedRefs(app, id, type, file, basePtr, c);
        CollectSummaryRef(app, id, file, basePtr, c);
        if (type == "Summary2")
            Summary2RefsCollector.CollectSummary2Refs(app, id, file, basePtr, c);
        CollectSubformRef(app, file, basePtr, c);
        ComponentBindingsCollector.CollectDataModelBindings(app, id, type, file, basePtr, c);
        ComponentBindingsCollector.CollectTextResourceBindings(app, id, file, basePtr, c);
        OptionTextCollector.CollectOptionTextKeys(app, id, file, basePtr, c);
        CollectOptionsId(app, id, file, basePtr, c);
        ExpressionWalker.Collect(app, id, file, basePtr, c);
    }

    private static Dictionary<string, ComponentBinding> ExtractBindings(JsonElement c)
    {
        var bindings = new Dictionary<string, ComponentBinding>(StringComparer.Ordinal);
        if (!c.TryGetProperty("dataModelBindings", out var b) || b.ValueKind != JsonValueKind.Object)
            return bindings;
        foreach (var p in b.EnumerateObject())
        {
            if (ReadBinding(p.Value) is { } binding)
                bindings[p.Name] = binding;
        }
        return bindings;
    }

    private static ComponentBinding? ReadBinding(JsonElement v)
    {
        switch (v.ValueKind)
        {
            case JsonValueKind.String:
                var s = v.GetString();
                return string.IsNullOrEmpty(s) ? null : new ComponentBinding(s, ExplicitDataType: null);
            case JsonValueKind.Object:
                var field = TryString(v, "field");
                if (string.IsNullOrEmpty(field))
                    return null;
                var dt = TryString(v, "dataType");
                return new ComponentBinding(field, string.IsNullOrEmpty(dt) ? null : dt);
            default:
                return null;
        }
    }

    private static List<string> ExtractChildren(JsonElement c, bool multiPage)
    {
        var children = new List<string>();
        if (!c.TryGetProperty("children", out var ch) || ch.ValueKind != JsonValueKind.Array)
            return children;
        foreach (var e in ch.EnumerateArray())
        {
            if (e.ValueKind == JsonValueKind.String)
            {
                var s = e.GetString();
                if (!string.IsNullOrEmpty(s))
                    children.Add(MultiPageChildren.ChildId(s, multiPage));
            }
        }
        return children;
    }

    private static void CollectSummaryRef(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        var v = TryString(c, "componentRef");
        if (string.IsNullOrEmpty(v))
            return;
        app.Refs.ComponentIds.Add(
            new ComponentIdReference(v, ownerId, new SourceSpan(file, basePtr + "/componentRef"))
        );
    }

    private static void CollectSubformRef(AppModelBuilder app, string file, string basePtr, JsonElement c)
    {
        var v = TryString(c, "layoutSet");
        if (string.IsNullOrEmpty(v))
            return;
        app.Refs.LayoutSets.Add(new LayoutSetReference(v, new SourceSpan(file, basePtr + "/layoutSet")));
    }

    private static void CollectOptionsId(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        var v = TryString(c, "optionsId");
        if (string.IsNullOrEmpty(v))
            return;
        app.Refs.OptionsIds.Add(new OptionsIdReference(v, ownerId, new SourceSpan(file, basePtr + "/optionsId")));
    }
}
