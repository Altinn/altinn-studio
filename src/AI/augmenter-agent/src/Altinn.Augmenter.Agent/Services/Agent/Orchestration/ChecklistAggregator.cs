using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

/// <summary>
/// Folds per-punkt verdicts into the {sjekkliste:{section:{label, punkter:{...}}}}
/// shape expected by <c>config/templates/checklist.typ</c>. Punkter without a
/// verdict get the schema's default status plus a "no rule" merknad — so a
/// missing rule file is visible in the PDF rather than silently absent.
/// </summary>
public static class ChecklistAggregator
{
    public static JsonDocument Aggregate(
        JsonDocument sjekklisteSchema,
        IReadOnlyDictionary<string, PunktVerdict> verdicts)
    {
        var schemaRoot = sjekklisteSchema.RootElement;
        var defaultStatus = schemaRoot.TryGetProperty("defaultStatus", out var dsEl) && dsEl.ValueKind == JsonValueKind.String
            ? dsEl.GetString() ?? "ikke_vurdert"
            : "ikke_vurdert";

        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = true }))
        {
            writer.WriteStartObject();
            writer.WriteStartObject("sjekkliste");

            if (!schemaRoot.TryGetProperty("seksjoner", out var seksjonerEl) || seksjonerEl.ValueKind != JsonValueKind.Array)
                throw new InvalidOperationException("Sjekkliste schema missing 'seksjoner' array.");

            foreach (var seksjon in seksjonerEl.EnumerateArray())
            {
                var sectionId = seksjon.GetProperty("id").GetString()!;
                var sectionLabel = seksjon.GetProperty("label").GetString() ?? sectionId;

                writer.WriteStartObject(sectionId);
                writer.WriteString("label", sectionLabel);

                writer.WriteStartObject("punkter");
                foreach (var punkt in seksjon.GetProperty("punkter").EnumerateArray())
                {
                    var punktId = punkt.GetProperty("id").GetString()!;
                    var punktLabel = punkt.GetProperty("label").GetString() ?? punktId;
                    var key = $"{sectionId}.{punktId}";

                    writer.WriteStartObject(punktId);
                    writer.WriteString("label", punktLabel);
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
