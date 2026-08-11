using System.Linq;
using System.Net;
using Json.Pointer;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Extension methods for formatting JSON pointers.
/// </summary>
public static class JsonPointerExtensions
{
    /// <summary>
    /// Formats a JSON pointer as a URI fragment.
    /// </summary>
    public static string ToUriEncodedString(this JsonPointer pointer) =>
        "#"
        + string.Concat(
            pointer.Select(segment => "/" + WebUtility.UrlEncode(segment.Replace("~", "~0").Replace("/", "~1")))
        );
}
