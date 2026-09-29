using System.Text.Json;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using static Altinn.Studio.AppConfig.Parsers.JsonRead;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ContainerRefsCollector
{
    public static void CollectChildren(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c,
        bool multiPage
    )
    {
        if (!c.TryGetProperty("children", out var ch) || ch.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var e in ch.EnumerateArray())
        {
            if (e.ValueKind == JsonValueKind.String)
            {
                var s = e.GetString();
                if (!string.IsNullOrEmpty(s))
                {
                    app.Refs.ComponentIds.Add(
                        new ComponentIdReference(
                            MultiPageChildren.ChildId(s, multiPage),
                            ownerId,
                            new SourceSpan(file, $"{basePtr}/children/{i}")
                        )
                    );
                }
            }
            i++;
        }
    }

    public static void CollectContainerNestedRefs(
        AppModelBuilder app,
        string ownerId,
        string type,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        switch (type)
        {
            case "Tabs":
                CollectItemArrayChildren(app, ownerId, file, basePtr, c, "tabs");
                CollectItemArrayTextKey(app, ownerId, file, basePtr, c, "tabs", "title");
                break;
            case "Cards":
                CollectItemArrayChildren(app, ownerId, file, basePtr, c, "cards");
                CollectItemArrayField(app, ownerId, file, basePtr, c, "cards", "media");
                CollectItemArrayTextKey(app, ownerId, file, basePtr, c, "cards", "title");
                break;
            case "Grid":
                CollectGridCellRefs(app, ownerId, file, basePtr, c);
                break;
            case "RepeatingGroup":
                if (c.TryGetProperty("tableColumns", out var cols) && cols.ValueKind == JsonValueKind.Object)
                    foreach (var col in cols.EnumerateObject())
                        AddComponentRef(
                            app,
                            ownerId,
                            col.Name,
                            new SourceSpan(file, $"{basePtr}/tableColumns/{col.Name}", Key: true)
                        );
                break;
            case "Summary":
                CollectStringArrayRefs(app, ownerId, file, basePtr, c, "excludedChildren");
                break;
        }
    }

    private static void AddComponentRef(AppModelBuilder app, string ownerId, string? value, SourceSpan pos)
    {
        if (!string.IsNullOrEmpty(value))
            app.Refs.ComponentIds.Add(new ComponentIdReference(value, ownerId, pos));
    }

    private static void CollectItemArrayChildren(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c,
        string prop
    )
    {
        if (!c.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var item in arr.EnumerateArray())
        {
            if (
                item.ValueKind == JsonValueKind.Object
                && item.TryGetProperty("children", out var ch)
                && ch.ValueKind == JsonValueKind.Array
            )
            {
                int j = 0;
                foreach (var e in ch.EnumerateArray())
                {
                    if (e.ValueKind == JsonValueKind.String)
                        AddComponentRef(
                            app,
                            ownerId,
                            e.GetString(),
                            new SourceSpan(file, $"{basePtr}/{prop}/{i}/children/{j}")
                        );
                    j++;
                }
            }
            i++;
        }
    }

    private static void CollectItemArrayField(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c,
        string prop,
        string field
    )
    {
        if (!c.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object && TryString(item, field) is { } v)
                AddComponentRef(app, ownerId, v, new SourceSpan(file, $"{basePtr}/{prop}/{i}/{field}"));
            i++;
        }
    }

    private static void CollectItemArrayTextKey(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c,
        string prop,
        string field
    )
    {
        if (!c.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var item in arr.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.Object && TryString(item, field) is { } v && LooksLikeTextKey(v))
                app.Refs.TextResources.Add(
                    new TextResourceReference(v, ownerId, field, new SourceSpan(file, $"{basePtr}/{prop}/{i}/{field}"))
                );
            i++;
        }
    }

    private static void CollectGridCellRefs(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c
    )
    {
        if (!c.TryGetProperty("rows", out var rows) || rows.ValueKind != JsonValueKind.Array)
            return;
        int ri = 0;
        foreach (var row in rows.EnumerateArray())
        {
            if (
                row.ValueKind == JsonValueKind.Object
                && row.TryGetProperty("cells", out var cells)
                && cells.ValueKind == JsonValueKind.Array
            )
            {
                int ci = 0;
                foreach (var cell in cells.EnumerateArray())
                {
                    if (cell.ValueKind == JsonValueKind.Object)
                    {
                        if (TryString(cell, "component") is { } comp)
                            AddComponentRef(
                                app,
                                ownerId,
                                comp,
                                new SourceSpan(file, $"{basePtr}/rows/{ri}/cells/{ci}/component")
                            );
                        if (TryString(cell, "labelFrom") is { } lf)
                            AddComponentRef(
                                app,
                                ownerId,
                                lf,
                                new SourceSpan(file, $"{basePtr}/rows/{ri}/cells/{ci}/labelFrom")
                            );
                    }
                    ci++;
                }
            }
            ri++;
        }
    }

    private static void CollectStringArrayRefs(
        AppModelBuilder app,
        string ownerId,
        string file,
        string basePtr,
        JsonElement c,
        string prop
    )
    {
        if (!c.TryGetProperty(prop, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return;
        int i = 0;
        foreach (var e in arr.EnumerateArray())
        {
            if (e.ValueKind == JsonValueKind.String)
                AddComponentRef(app, ownerId, e.GetString(), new SourceSpan(file, $"{basePtr}/{prop}/{i}"));
            i++;
        }
    }
}
