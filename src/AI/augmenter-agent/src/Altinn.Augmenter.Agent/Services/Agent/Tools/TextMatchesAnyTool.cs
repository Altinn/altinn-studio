using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Case-insensitive whole-string equality against any of a list of needles.
/// Use for enum-membership checks (e.g. "is arrangement type one of these
/// known categories?").
/// </summary>
public sealed class TextMatchesAnyTool : ITool
{
    public string Name => "text_matches_any";

    public ToolDefinition Definition { get; } = new()
    {
        Function = new ToolFunctionDefinition
        {
            Name = "text_matches_any",
            Description =
                "Eksakt tekst-likhet (case-insensitiv) mot en liste alternativer. " +
                "Bruk for å sjekke om en kategori er i en kjent enum (f.eks. arrangement-type).",
            Parameters = JsonDocument.Parse("""
                {
                  "type": "object",
                  "properties": {
                    "haystack": { "type": "string", "description": "Verdi å sjekke" },
                    "needles":  { "type": "array", "items": { "type": "string" }, "description": "Liste med gyldige alternativer" }
                  },
                  "required": ["haystack", "needles"]
                }
                """).RootElement.Clone(),
        },
    };

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
