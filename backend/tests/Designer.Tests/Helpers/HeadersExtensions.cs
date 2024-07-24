using System.Collections.Generic;
using System.Linq;
using System.Net.Http;

namespace Designer.Tests.Helpers;

public static class HeadersExtensions
{
    public static void AddCookies(this HttpRequestMessage request, IEnumerable<string> cookies)
    {
        foreach (string cookie in cookies)
        {
            request.Headers.Add("Cookie", cookie);
        }
    }

    public static IEnumerable<string> GetCookies(this HttpResponseMessage response)
    {
        return response.Headers.TryGetValues("Set-Cookie", out IEnumerable<string> values)
            ? values
            : new List<string>();
    }

    public static IEnumerable<string> GetGiteaAuthCookies(this HttpResponseMessage response)
    {
        var cookies = response.GetCookies();
        return cookies.Where(x => x.Contains("i_like_gitea") || x.Contains("_flash"));
    }

    public static IEnumerable<string> GetCookies(this HttpResponseMessage response, string searchTerm)
    {
        return response.GetCookies().Where(x => x.Contains(searchTerm));
    }
}

