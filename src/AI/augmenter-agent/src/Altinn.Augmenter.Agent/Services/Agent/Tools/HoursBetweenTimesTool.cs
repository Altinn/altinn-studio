using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Decimal hours between two HH:MM times within a single 24-hour period.
/// If <c>end_time</c> ≤ <c>start_time</c> the interval is treated as
/// crossing midnight (next day) — matching the wrap semantics in
/// <see cref="TimeWithinWindowTool"/>. The result is always in
/// [0, 24); for multi-day arrangements use <see cref="DaysBetweenTool"/>.
/// </summary>
public sealed partial class HoursBetweenTimesTool : ITool
{
    public string Name => "hours_between_times";

    [GeneratedRegex(@"^(\d{1,2}):(\d{2})$")]
    private static partial Regex TimeRegex();

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var startStr = arguments.TryGetProperty("start_time", out var s) ? s.GetString() : null;
        var endStr = arguments.TryGetProperty("end_time", out var e) ? e.GetString() : null;

        var startMinutes = TryToMinutes(startStr);
        var endMinutes = TryToMinutes(endStr);
        if (startMinutes is null || endMinutes is null)
        {
            return new { error = "Invalid time format. Expected HH:MM (0-23 hour, 0-59 min) for both inputs." };
        }

        var wrapsMidnight = endMinutes.Value <= startMinutes.Value;
        var endUnwrapped = wrapsMidnight ? endMinutes.Value + 24 * 60 : endMinutes.Value;
        var totalMinutes = endUnwrapped - startMinutes.Value;
        var hours = Math.Round(totalMinutes / 60.0, 2, MidpointRounding.AwayFromZero);

        return new
        {
            hours,
            wraps_midnight = wrapsMidnight,
        };
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
