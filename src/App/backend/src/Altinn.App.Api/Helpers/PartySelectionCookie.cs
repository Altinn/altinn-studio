using System.Globalization;
using Altinn.App.Core.Configuration;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Writes the cookie that carries the user's party selection.
/// </summary>
/// <remarks>
/// Other components write this cookie on parent domains such as <c>altinn.no</c>, which are sent to every
/// host below them, so writing or clearing a selection also expires it on every parent domain.
/// </remarks>
internal static class PartySelectionCookie
{
    /// <summary>
    /// Records <paramref name="partyId"/> as the selected party.
    /// </summary>
    internal static void Set(HttpResponse response, GeneralSettings settings, int partyId)
    {
        string hostName = settings.HostName;
        string cookieName = settings.GetAltinnPartyCookieName;

        Expire(response, cookieName, ParentDomains(hostName));

        response.Cookies.Append(
            cookieName,
            partyId.ToString(CultureInfo.InvariantCulture),
            new CookieOptions { Domain = hostName }
        );
    }

    /// <summary>
    /// Removes the party selection.
    /// </summary>
    internal static void Clear(HttpResponse response, GeneralSettings settings)
    {
        Expire(
            response,
            settings.GetAltinnPartyCookieName,
            ParentDomains(settings.HostName).Prepend(settings.HostName)
        );
    }

    private static void Expire(HttpResponse response, string cookieName, IEnumerable<string> domains)
    {
        response.Cookies.Delete(cookieName);
        foreach (string domain in domains)
            response.Cookies.Delete(cookieName, new CookieOptions { Domain = domain });
    }

    /// <summary>
    /// The parent domains of <paramref name="hostName"/> down to two labels: for <c>tt02.altinn.no</c> just <c>altinn.no</c>.
    /// </summary>
    internal static IEnumerable<string> ParentDomains(string hostName)
    {
        string[] labels = hostName.Split('.');
        for (int skip = 1; labels.Length - skip >= 2; skip++)
            yield return string.Join('.', labels, skip, labels.Length - skip);
    }
}
