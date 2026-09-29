using System.Text.Json;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class MultiPageChildren
{
    public static bool IsEnabled(JsonElement component) =>
        component.TryGetProperty("edit", out var edit)
        && edit.ValueKind == JsonValueKind.Object
        && edit.TryGetProperty("multiPage", out var mp)
        && mp.ValueKind == JsonValueKind.True;

    public static string ChildId(string child, bool multiPage)
    {
        if (!multiPage)
            return child;
        var colon = child.IndexOf(':');
        if (colon <= 0)
            return child;
        for (var i = 0; i < colon; i++)
            if (!char.IsAsciiDigit(child[i]))
                return child;
        return child[(colon + 1)..];
    }
}
