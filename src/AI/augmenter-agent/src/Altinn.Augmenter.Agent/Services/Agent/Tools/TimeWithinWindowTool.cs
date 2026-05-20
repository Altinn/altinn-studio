using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Pure containment check: does the period [start_time, end_time] fit fully
/// inside the window [window_start, window_end]? End-before-start in either
/// pair is treated as crossing midnight (next day), so both the period and
/// the window may wrap. Domain semantics (which window applies to which
/// case) live in the rule prose, not this tool.
/// </summary>
public sealed partial class TimeWithinWindowTool : ITool
{
    public string Name => "time_within_window";

    [GeneratedRegex(@"^(\d{1,2}):(\d{2})$")]
    private static partial Regex TimeRegex();

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var startStr = arguments.TryGetProperty("start_time", out var s) ? s.GetString() : null;
        var endStr = arguments.TryGetProperty("end_time", out var e) ? e.GetString() : null;
        var winStartStr = arguments.TryGetProperty("window_start", out var ws) ? ws.GetString() : null;
        var winEndStr = arguments.TryGetProperty("window_end", out var we) ? we.GetString() : null;

        var startMinutes = TryToMinutes(startStr);
        var endMinutes = TryToMinutes(endStr);
        var winStartMinutes = TryToMinutes(winStartStr);
        var winEndMinutes = TryToMinutes(winEndStr);
        if (startMinutes is null || endMinutes is null || winStartMinutes is null || winEndMinutes is null)
        {
            return new
            {
                error = "Invalid time format. Expected HH:MM (0-23 hour, 0-59 min) for all four inputs.",
            };
        }

        // Unwrap both intervals past midnight if end < start.
        var periodEnd = endMinutes.Value <= startMinutes.Value ? endMinutes.Value + 24 * 60 : endMinutes.Value;
        var winEnd = winEndMinutes.Value <= winStartMinutes.Value ? winEndMinutes.Value + 24 * 60 : winEndMinutes.Value;

        var within = startMinutes.Value >= winStartMinutes.Value && periodEnd <= winEnd;
        return new
        {
            within,
            window_start = winStartStr,
            window_end = winEndStr,
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
