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
///
/// Requires IANA tzdata at runtime — the Alpine runtime image installs the
/// 'tzdata' apk so /usr/share/zoneinfo/Europe/Oslo is present. On Windows,
/// .NET resolves the IANA ID via its built-in ICU mapping.
/// </summary>
public sealed class CurrentDateTool : ITool
{
    private const string NorwegianTimeZoneId = "Europe/Oslo";

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
        _norwegianTz = TimeZoneInfo.FindSystemTimeZoneById(NorwegianTimeZoneId);
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
}
