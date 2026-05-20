using System.Globalization;
using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Whole calendar days between two ISO-dates (start inclusive, end exclusive).
/// Negative result if to_date precedes from_date.
/// </summary>
public sealed class DaysBetweenTool : ITool
{
    public string Name => "days_between";

    public ToolDefinition Definition { get; } = new()
    {
        Function = new ToolFunctionDefinition
        {
            Name = "days_between",
            Description =
                "Antall kalenderdager mellom to ISO-datoer (start inkludert, slutt ekskludert). " +
                "Bruk dette for å beregne varighet av arrangement eller saksbehandlingstid.",
            Parameters = JsonDocument.Parse("""
                {
                  "type": "object",
                  "properties": {
                    "from_date": { "type": "string", "description": "Startdato (YYYY-MM-DD)" },
                    "to_date":   { "type": "string", "description": "Sluttdato (YYYY-MM-DD)" }
                  },
                  "required": ["from_date", "to_date"]
                }
                """).RootElement.Clone(),
        },
    };

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var fromStr = arguments.TryGetProperty("from_date", out var f) ? f.GetString() : null;
        var toStr = arguments.TryGetProperty("to_date", out var t) ? t.GetString() : null;

        if (!DateOnly.TryParseExact(fromStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var from)
            || !DateOnly.TryParseExact(toStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var to))
        {
            return new { error = "Invalid date format. Expected YYYY-MM-DD." };
        }

        return new { days = to.DayNumber - from.DayNumber };
    }
}
