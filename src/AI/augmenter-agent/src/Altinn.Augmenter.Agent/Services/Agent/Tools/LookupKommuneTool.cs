using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Looks up a Norwegian kommune by 4-digit kommunenummer. Initial registry
/// covers the Agder-kommuner relevant for the current pilot; extend as more
/// kommuner come on board.
/// </summary>
public sealed class LookupKommuneTool : ITool
{
    public string Name => "lookup_kommune";

    private static readonly IReadOnlyDictionary<string, (string Name, string Fylke)> Registry =
        new Dictionary<string, (string, string)>
        {
            ["4204"] = ("Kristiansand", "Agder"),
            ["4205"] = ("Vennesla", "Agder"),
            ["1001"] = ("Kristiansand", "Agder"), // historic; still in use in some sources
            ["4221"] = ("Vennesla", "Agder"),
        };

    public ToolDefinition Definition { get; } = new()
    {
        Function = new ToolFunctionDefinition
        {
            Name = "lookup_kommune",
            Description = "Slå opp kommunenavn fra 4-sifret kommunenummer.",
            Parameters = JsonDocument.Parse("""
                {
                  "type": "object",
                  "properties": {
                    "kommunenummer": { "type": "string", "description": "4-sifret kommunenummer" }
                  },
                  "required": ["kommunenummer"]
                }
                """).RootElement.Clone(),
        },
    };

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var nr = arguments.TryGetProperty("kommunenummer", out var k) ? k.GetString()?.Trim() ?? "" : "";
        if (!Registry.TryGetValue(nr, out var hit))
        {
            var known = string.Join(", ", Registry.Keys.OrderBy(x => x));
            return new { error = $"Unknown kommunenummer: '{nr}'. Known: [{known}]" };
        }
        return new { name = hit.Name, fylke = hit.Fylke };
    }
}
