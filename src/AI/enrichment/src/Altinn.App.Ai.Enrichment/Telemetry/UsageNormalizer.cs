using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Telemetry;

/// <summary>
/// Turns a gateway's OpenAI-shaped <c>usage</c> block into the flat numeric map
/// Langfuse expects in <c>usage_details</c>.
///
/// Two things make this less trivial than a rename. The block is nested — real
/// gateways return <c>completion_tokens_details: { reasoning_tokens: 0 }</c> —
/// and its values arrive as <see cref="JsonElement"/>, not numbers, because the
/// chat response models it as <c>object?</c>. Anything that is not a number is
/// dropped rather than passed through: a non-numeric value in usage_details is
/// rejected by the exporter, and a fabricated one would be multiplied by the
/// model's price.
/// </summary>
internal static class UsageNormalizer
{
    private static readonly Dictionary<string, string> CanonicalNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["prompt_tokens"] = "input",
        ["completion_tokens"] = "output",
        ["total_tokens"] = "total",
    };

    public static IReadOnlyDictionary<string, long> Normalize(IReadOnlyDictionary<string, object?> usage)
    {
        var result = new Dictionary<string, long>(StringComparer.Ordinal);
        if (usage.Count == 0)
            return result;

        foreach (var (key, value) in usage)
            Collect(result, key, value);

        return result;
    }

    private static void Collect(Dictionary<string, long> result, string key, object? value)
    {
        var name = CanonicalNames.TryGetValue(key, out var canonical) ? canonical : key;

        switch (value)
        {
            case null:
                return;

            case JsonElement { ValueKind: JsonValueKind.Number } number when number.TryGetInt64(out var parsed):
                result[name] = parsed;
                return;

            case JsonElement { ValueKind: JsonValueKind.Object } nested:
                // Flatten one level: *_details sub-objects carry their own token counts.
                foreach (var property in nested.EnumerateObject())
                    Collect(result, property.Name, property.Value);
                return;

            case int or long or short or byte:
                result[name] = Convert.ToInt64(value);
                return;

            case double or float or decimal:
                result[name] = Convert.ToInt64(value);
                return;
        }
    }
}
