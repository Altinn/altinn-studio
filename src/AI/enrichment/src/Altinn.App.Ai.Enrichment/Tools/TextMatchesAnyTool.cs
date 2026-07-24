using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// Case-insensitive whole-string equality against any of a list of needles.
/// Use for enum-membership checks (e.g. "is arrangement type one of these
/// known categories?").
/// </summary>
public sealed class TextMatchesAnyTool : ITool
{
    public string Name => "text_matches_any";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var haystack = arguments.TryGetProperty("haystack", out var h) ? h.GetString() ?? "" : "";
        if (!arguments.TryGetProperty("needles", out var needlesEl) || needlesEl.ValueKind != JsonValueKind.Array)
            return new { error = "needles must be a list of strings" };

        var h0 = haystack.Trim().ToLowerInvariant();
        foreach (var needle in needlesEl.EnumerateArray())
        {
            if (needle.ValueKind != JsonValueKind.String)
                continue;
            var n = needle.GetString() ?? "";
            if (h0 == n.Trim().ToLowerInvariant())
                return new { match = true, matched = n };
        }
        return new { match = false, matched = (string?)null };
    }
}
