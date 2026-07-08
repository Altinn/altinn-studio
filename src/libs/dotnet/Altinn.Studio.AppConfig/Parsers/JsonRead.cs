using System.Text.Json;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class JsonRead
{
    public static string? TryString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    public static bool LooksLikeTextKey(string? v)
    {
        if (string.IsNullOrEmpty(v) || v.Length > 128 || !v.Contains('.'))
            return false;
        foreach (var ch in v)
            if (ch is ' ' or '\t' or '\n' or '\r' or '<' or '>' or '@' or ':' or '/' or '+')
                return false;
        return true;
    }
}
