namespace Altinn.Studio.AppConfig.Documents.Text;

/// <summary>RFC 6901 JSON-Pointer segment escaping.</summary>
internal static class JsonPointerEscaping
{
    public static string Escape(string segment)
    {
        if (segment.IndexOf('~') < 0 && segment.IndexOf('/') < 0)
            return segment;
        return segment.Replace("~", "~0").Replace("/", "~1");
    }

    public static string Unescape(string segment) =>
        segment.IndexOf('~') < 0 ? segment : segment.Replace("~1", "/").Replace("~0", "~");
}
