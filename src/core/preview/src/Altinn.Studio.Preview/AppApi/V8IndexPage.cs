using System.Net;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.AppApi;

internal static partial class V8IndexPage
{
    public static string? Generate(AppFiles files, SessionId sessionId, WorkingCopy workingCopy)
    {
        if (files.StartPage() is not { } startPage)
        {
            return null;
        }

        string html = RazorToken()
            .Replace(
                startPage,
                token =>
                    token.Value.ToUpperInvariant() switch
                    {
                        "@VIEWBAG.ORG" => WebUtility.HtmlEncode(workingCopy.Org),
                        "@VIEWBAG.APP" => WebUtility.HtmlEncode(workingCopy.App),
                        _ => "@",
                    }
            );
        // HACK: the app's own page sets window.org and window.app from the first two path segments, which in preview
        // are the session ID and the org. This script must run before the page's, wherever that is, so it goes before
        // the html element, from where the HTML parser moves a script into the head. It stays after the doctype, since
        // a page that doesn't start with one renders in quirks mode.
        return html.Insert(LeadingDoctype().Match(html).Length, AppPathThatThePageCannotChange(sessionId, workingCopy));
    }

    private static string AppPathThatThePageCannotChange(SessionId sessionId, WorkingCopy workingCopy)
    {
        string org = Json($"{sessionId}/{workingCopy.Org}");
        string app = Json(workingCopy.App);
        return $$"""
            <script>
              (() => {
                const pin = (name, value) => Object.defineProperty(window, name, { get: () => value, set: () => {} });
                pin("org", {{org}});
                pin("app", {{app}});
              })();
            </script>
            """;
    }

    private static string Json(string value) => JsonValue.Create(value).ToJsonString();

    [GeneratedRegex(
        @"@@|@ViewBag\.(?:Org|App)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        matchTimeoutMilliseconds: 1000
    )]
    private static partial Regex RazorToken();

    [GeneratedRegex(
        @"\A(?:\s|<!--.*?-->)*<!doctype[^>]*>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.CultureInvariant,
        matchTimeoutMilliseconds: 1000
    )]
    private static partial Regex LeadingDoctype();
}
