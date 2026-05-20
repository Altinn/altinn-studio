using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Reads a value from the application JSON via a dotted path with optional
/// [index] segments. Returns { present: false, missing_at: "..." } when an
/// intermediate step is missing so the LLM can reason about absent fields.
/// </summary>
public sealed partial class PathValueTool : ITool
{
    public string Name => "path_value";

    public ToolDefinition Definition { get; } = new()
    {
        Function = new ToolFunctionDefinition
        {
            Name = "path_value",
            Description =
                "Les en verdi fra søknads-JSON via dot-path med valgfri [index]. " +
                "Eksempel: 'Bevillingsansvarlig.Styrer.Foedselsnummer'. " +
                "Returnerer present=False hvis et mellomliggende steg mangler — bruk det " +
                "for å avgjøre om dokumentasjon/felt er oppgitt eller mangler.",
            Parameters = JsonDocument.Parse("""
                {
                  "type": "object",
                  "properties": {
                    "json_path": { "type": "string", "description": "Dot-path med valgfri [n]-indeks" }
                  },
                  "required": ["json_path"]
                }
                """).RootElement.Clone(),
        },
    };

    [GeneratedRegex(@"^([^\[\]]+)(?:\[(\d+)\])?$")]
    private static partial Regex SegmentRegex();

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var path = arguments.TryGetProperty("json_path", out var p) ? p.GetString() : null;
        if (string.IsNullOrEmpty(path))
            return new { error = "Empty json_path" };

        var cursor = application.RootElement;
        var walked = new List<string>();

        foreach (var raw in path.Split('.'))
        {
            var match = SegmentRegex().Match(raw);
            if (!match.Success)
                return new { error = $"Malformed path segment: '{raw}'" };

            var key = match.Groups[1].Value;
            walked.Add(key);

            if (cursor.ValueKind != JsonValueKind.Object || !cursor.TryGetProperty(key, out var next))
                return new { present = false, missing_at = string.Join('.', walked) };

            cursor = next;

            if (match.Groups[2].Success)
            {
                var idx = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
                if (cursor.ValueKind != JsonValueKind.Array || idx >= cursor.GetArrayLength())
                    return new { present = false, missing_at = $"{string.Join('.', walked)}[{idx}]" };
                cursor = cursor[idx];
            }
        }

        // Surface the value as a JsonElement clone so the registry can serialize it.
        return new { value = cursor.Clone(), present = true };
    }
}
