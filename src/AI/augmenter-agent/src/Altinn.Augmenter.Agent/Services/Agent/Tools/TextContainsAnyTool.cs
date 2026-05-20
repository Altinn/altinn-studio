using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Case-insensitive substring search: true if any needle appears anywhere in
/// the haystack. Use for checks like "does this venue name contain 'restaurant'
/// or 'kro'?".
/// </summary>
public sealed class TextContainsAnyTool : ITool
{
    public string Name => "text_contains_any";

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var haystack = arguments.TryGetProperty("haystack", out var h) ? h.GetString() ?? "" : "";
        if (!arguments.TryGetProperty("needles", out var needlesEl) || needlesEl.ValueKind != JsonValueKind.Array)
            return new { error = "needles must be a list of strings" };

        var h0 = haystack.ToLowerInvariant();
        foreach (var needle in needlesEl.EnumerateArray())
        {
            if (needle.ValueKind != JsonValueKind.String)
                continue;
            var n = needle.GetString() ?? "";
            var nLower = n.ToLowerInvariant();
            if (nLower.Length > 0 && h0.Contains(nLower))
                return new { contains = true, matched = n };
        }
        return new { contains = false, matched = (string?)null };
    }
}
