using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Orchestration;

/// <summary>
/// Folds per-item verdicts into the <c>{&lt;rootKey&gt;:{section:{label, punkter:{...}}}}</c>
/// shape the Typst template (and the stored enrichment JSON) expects. The root key
/// comes from the output schema's optional <c>rootKey</c> property (default
/// <c>sjekkliste</c>). Items without a verdict get the schema's default status plus
/// a "no rule" merknad — so a missing rule file is visible in the output rather
/// than silently absent.
/// </summary>
public static class VerdictAggregator
{
    public const string DefaultRootKey = "sjekkliste";

    public static JsonDocument Aggregate(
        JsonDocument schema,
        IReadOnlyDictionary<string, ItemVerdict> verdicts)
    {
        var schemaRoot = schema.RootElement;
        var defaultStatus = schemaRoot.TryGetProperty("defaultStatus", out var dsEl) && dsEl.ValueKind == JsonValueKind.String
            ? dsEl.GetString() ?? "ikke_vurdert"
            : "ikke_vurdert";
        var rootKey = schemaRoot.TryGetProperty("rootKey", out var rkEl) && rkEl.ValueKind == JsonValueKind.String
            ? rkEl.GetString() ?? DefaultRootKey
            : DefaultRootKey;

        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true }))
        {
            writer.WriteStartObject();
            writer.WriteStartObject(rootKey);

            if (!schemaRoot.TryGetProperty("sections", out var sectionsEl) || sectionsEl.ValueKind != JsonValueKind.Array)
                throw new InvalidOperationException("Output schema missing 'sections' array.");

            foreach (var section in sectionsEl.EnumerateArray())
            {
                var sectionId = section.GetProperty("id").GetString()!;
                var sectionLabel = section.GetProperty("label").GetString() ?? sectionId;

                writer.WriteStartObject(sectionId);
                writer.WriteString("label", sectionLabel);

                writer.WriteStartObject("punkter");
                foreach (var item in section.GetProperty("items").EnumerateArray())
                {
                    var itemId = item.GetProperty("id").GetString()!;
                    var itemLabel = item.GetProperty("label").GetString() ?? itemId;
                    var key = $"{sectionId}.{itemId}";

                    writer.WriteStartObject(itemId);
                    writer.WriteString("label", itemLabel);
                    if (verdicts.TryGetValue(key, out var verdict))
                    {
                        writer.WriteString("status", verdict.Status);
                        writer.WriteString("merknad", verdict.Merknad);
                    }
                    else
                    {
                        writer.WriteString("status", defaultStatus);
                        writer.WriteString("merknad", "Ingen markdown-regel for dette punktet.");
                    }
                    writer.WriteEndObject();
                }
                writer.WriteEndObject();
                writer.WriteEndObject();
            }

            writer.WriteEndObject();
            writer.WriteEndObject();
        }
        stream.Position = 0;
        return JsonDocument.Parse(stream);
    }
}
