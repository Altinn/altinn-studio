namespace Altinn.App.Analyzers.Utils;

/// <summary>
/// Blanks out <c>//</c> and <c>/* */</c> comments so JSON that is legal as .NET configuration
/// (which permits comments) can be parsed by <see cref="NanoJsonReader.JsonValue"/>, which does not.
/// Comment characters are replaced with spaces — never removed — so every index into the result maps
/// to the same index in the original text and reported locations stay correct.
/// </summary>
internal static class JsonCommentStripper
{
    public static string StripComments(string json)
    {
        // Fast path: no '/' at all means no comments (a '/' inside a string would still take the slow
        // path, which handles it correctly).
        if (json.IndexOf('/') < 0)
        {
            return json;
        }

        var chars = json.ToCharArray();
        var i = 0;
        while (i < chars.Length)
        {
            var c = chars[i];
            if (c == '"')
            {
                // Skip over the string; escapes guard against ending it at \".
                i++;
                while (i < chars.Length && chars[i] != '"')
                {
                    i += chars[i] == '\\' ? 2 : 1;
                }
                i++;
            }
            else if (c == '/' && i + 1 < chars.Length && chars[i + 1] == '/')
            {
                while (i < chars.Length && chars[i] != '\n' && chars[i] != '\r')
                {
                    chars[i++] = ' ';
                }
            }
            else if (c == '/' && i + 1 < chars.Length && chars[i + 1] == '*')
            {
                chars[i++] = ' ';
                chars[i++] = ' ';
                while (i < chars.Length && !(chars[i] == '*' && i + 1 < chars.Length && chars[i + 1] == '/'))
                {
                    if (chars[i] != '\n' && chars[i] != '\r')
                    {
                        chars[i] = ' ';
                    }
                    i++;
                }
                if (i < chars.Length)
                {
                    chars[i++] = ' ';
                    chars[i++] = ' ';
                }
            }
            else
            {
                i++;
            }
        }

        return new string(chars);
    }
}
