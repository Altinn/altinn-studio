using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using Altinn.Studio.Designer.Infrastructure.DeveloperSession;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaAuthHeadersProvider(IDeveloperContextProvider developerContextProvider)
    : IGitServerAuthHeadersProvider
{
    public Dictionary<string, string> GetAuthHeaders()
    {
        var headers = new Dictionary<string, string>();
        var context = developerContextProvider.DeveloperContext;

        if (context == null)
        {
            return headers;
        }

        headers["X-WEBAUTH-USER"] = context.Username;

        string fullName = $"{context.GivenName} {context.FamilyName}".Trim();
        if (!string.IsNullOrEmpty(fullName))
        {
            headers["X-WEBAUTH-FULLNAME"] = ToAscii(fullName);
        }

        return headers;
    }

    /// <summary>
    /// Converts a string to ASCII for HTTP header compatibility.
    /// Norwegian letters are explicitly transliterated (æ→ae, ø→oe, å→aa).
    /// Other accented characters (e.g. ö, é, ñ) are normalized via Unicode decomposition,
    /// which strips diacritical marks (ö→o, é→e, ñ→n).
    /// </summary>
    internal static string ToAscii(string value)
    {
        string replaced = value
            .Replace("æ", "ae")
            .Replace("Æ", "AE")
            .Replace("ø", "oe")
            .Replace("Ø", "OE")
            .Replace("å", "aa")
            .Replace("Å", "AA");

        string normalized = replaced.Normalize(NormalizationForm.FormD);

        return new string(
            normalized
                .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark && c <= 127)
                .ToArray()
        );
    }
}
