using System.Globalization;
using System.Text.Json;

namespace Altinn.App.Ai.Enrichment.Tools;

/// <summary>
/// Whole calendar days between two ISO-dates (start inclusive, end exclusive).
/// Negative result if to_date precedes from_date.
/// </summary>
public sealed class DaysBetweenTool : ITool
{
    public string Name => "days_between";

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
