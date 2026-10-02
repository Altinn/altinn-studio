using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Models;

/// <summary>
/// Helpers for turning raw application JSON into the document the enrichment
/// pipeline operates on.
/// </summary>
public static class EnrichmentData
{
    /// <summary>
    /// Parses application JSON, unwrapping a legacy <c>{ "FlatData": {...} }</c>
    /// envelope when present. The pipeline's tools and mappers navigate the
    /// unwrapped shape with paths like <c>Innsender.Foedselsnummer</c>.
    /// </summary>
    public static JsonDocument Parse(byte[] json)
    {
        using var wrapper = JsonDocument.Parse(json);
        if (!wrapper.RootElement.TryGetProperty("FlatData", out var flat))
        {
            // No envelope — re-parse rather than clone so the returned document
            // owns its memory independently of the wrapper being disposed.
            return JsonDocument.Parse(json);
        }
        return JsonDocument.Parse(flat.GetRawText());
    }
}
