namespace Altinn.Studio.AppConfig.Documents.Text;

/// <summary>RFC 6901 JSON-Pointer segment escaping.</summary>
internal static class JsonPointerEscaping
{
    public static string Escape(string segment)
    {
        if (segment.IndexOf('~', StringComparison.Ordinal) < 0 && segment.IndexOf('/', StringComparison.Ordinal) < 0)
            return segment;
        return segment.Replace("~", "~0", StringComparison.Ordinal).Replace("/", "~1", StringComparison.Ordinal);
    }

    public static string Unescape(string segment) =>
        segment.IndexOf('~', StringComparison.Ordinal) < 0
            ? segment
            : segment.Replace("~1", "/", StringComparison.Ordinal).Replace("~0", "~", StringComparison.Ordinal);
}
