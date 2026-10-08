using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// Counts attachments on the application, optionally filtered by a case-insensitive
/// substring match on filename. Walks "Vedlegg" and "Attachments" lists wherever
/// they appear in the JSON tree.
/// </summary>
public sealed class CountAttachmentsTool : ITool
{
    public string Name => "count_attachments";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        string? filter = null;
        if (arguments.TryGetProperty("name_contains", out var f) && f.ValueKind == JsonValueKind.String)
            filter = f.GetString();

        var names = new List<string>();
        Walk(application.RootElement, names);

        if (!string.IsNullOrEmpty(filter))
        {
            var needle = filter.ToLowerInvariant();
            names = names.Where(n => n.ToLowerInvariant().Contains(needle)).ToList();
        }

        return new { count = names.Count, names };
    }

    private static void Walk(JsonElement node, List<string> sink)
    {
        switch (node.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var prop in node.EnumerateObject())
                {
                    if ((prop.Name == "Vedlegg" || prop.Name == "Attachments") && prop.Value.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var item in prop.Value.EnumerateArray())
                            CollectAttachmentName(item, sink);
                    }
                    else
                    {
                        Walk(prop.Value, sink);
                    }
                }
                break;
            case JsonValueKind.Array:
                foreach (var item in node.EnumerateArray())
                    Walk(item, sink);
                break;
        }
    }

    private static void CollectAttachmentName(JsonElement item, List<string> sink)
    {
        if (item.ValueKind == JsonValueKind.String)
        {
            var s = item.GetString();
            if (!string.IsNullOrEmpty(s))
                sink.Add(s);
            return;
        }
        if (item.ValueKind != JsonValueKind.Object)
            return;

        foreach (var key in (string[])["FileName", "Filename", "Name"])
        {
            if (item.TryGetProperty(key, out var nameEl) && nameEl.ValueKind == JsonValueKind.String)
            {
                var s = nameEl.GetString();
                if (!string.IsNullOrEmpty(s))
                {
                    sink.Add(s);
                    return;
                }
            }
        }
    }
}
