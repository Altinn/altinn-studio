using System.Globalization;
using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services.Agent.Tools;

/// <summary>
/// Today's date in Norwegian local time (Europe/Oslo). Exists because the
/// LLM otherwise hallucinates "today" from its training-date prior, which
/// breaks rules like "≥ 90 days between vedtaksdato and arrangementsstart".
///
/// UTC is intentionally NOT used: a saksbehandler clicking "vurder" at 00:30
/// CET on May 22 expects "2026-05-22", not "2026-05-21" (UTC).
/// </summary>
public sealed class CurrentDateTool : ITool
{
    public string Name => "current_date";

    private readonly Func<DateTimeOffset> _nowUtc;
    private readonly TimeZoneInfo _norwegianTz;

    public CurrentDateTool()
        : this(() => DateTimeOffset.UtcNow)
    {
    }

    internal CurrentDateTool(Func<DateTimeOffset> nowUtc)
    {
        _nowUtc = nowUtc;
        _norwegianTz = ResolveNorwegianTimeZone();
    }

    public object Invoke(JsonElement arguments, JsonDocument application)
    {
        var local = TimeZoneInfo.ConvertTime(_nowUtc(), _norwegianTz);
        return new
        {
            date = local.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            timezone = _norwegianTz.Id,
        };
    }

    private static TimeZoneInfo ResolveNorwegianTimeZone()
    {
        // .NET 6+ accepts both IANA and Windows IDs on either platform, but fall
        // back to the Windows ID if the runtime image lacks tzdata.
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time");
        }
    }
}
