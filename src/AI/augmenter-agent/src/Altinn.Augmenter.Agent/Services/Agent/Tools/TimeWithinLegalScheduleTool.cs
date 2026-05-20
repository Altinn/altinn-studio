using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Checks whether a serving period falls within alkohollovens § 4-4 max-schedule
/// for the given vare-group. Group 1-2 (øl/vin): 06:00-03:00. Group 3 (brennevin):
/// 13:00-03:00. End times past midnight are handled via wrap-around.
/// </summary>
public sealed partial class TimeWithinLegalScheduleTool : ITool
{
    public string Name => "time_within_legal_schedule";

    [GeneratedRegex(@"^(\d{1,2}):(\d{2})$")]
    private static partial Regex TimeRegex();

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var startStr = arguments.TryGetProperty("start_time", out var s) ? s.GetString() : null;
        var endStr = arguments.TryGetProperty("end_time", out var e) ? e.GetString() : null;
        var grp = arguments.TryGetProperty("vare_gruppe", out var g) ? g.GetString() ?? "" : "";

        var startMinutes = TryToMinutes(startStr);
        var endMinutes = TryToMinutes(endStr);
        if (startMinutes is null || endMinutes is null)
        {
            return new
            {
                error = $"Invalid time format. Expected HH:MM (0-23 hour, 0-59 min), got start='{startStr}', end='{endStr}'",
            };
        }

        var endValue = endMinutes.Value;
        if (endValue <= startMinutes.Value)
            endValue += 24 * 60; // wrap past midnight

        var grpLower = grp.ToLowerInvariant();
        var isGroup3 = grpLower.Contains("tre") || grpLower.Contains('3') || grpLower.Contains("brennevin");

        if (isGroup3)
        {
            var within = startMinutes.Value >= 13 * 60 && endValue <= 27 * 60;
            return new { within, group = "3", law = "13:00-03:00" };
        }
        else
        {
            var within = startMinutes.Value >= 6 * 60 && endValue <= 27 * 60;
            return new { within, group = "1-2", law = "06:00-03:00" };
        }
    }

    private static int? TryToMinutes(string? hhmm)
    {
        if (string.IsNullOrWhiteSpace(hhmm))
            return null;
        var match = TimeRegex().Match(hhmm.Trim());
        if (!match.Success)
            return null;
        var hh = int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
        var mm = int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture);
        if (hh > 23 || mm > 59)
            return null;
        return hh * 60 + mm;
    }
}
