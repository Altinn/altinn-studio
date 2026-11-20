using System.Globalization;
using System.Net;
using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The page a v9 app serves for each of its routes: the app frontend, with the state it starts with in
/// <c>window.altinnAppGlobalData</c>, as the app library's <c>IndexPageGenerator</c> makes it.
/// </summary>
/// <remarks>
/// <para>
/// The app frontend builds every URL, its router's and its API's, from <c>/{window.org}/{window.app}</c>. Preview sets
/// <c>window.org</c> to <c>{sessionId}/{org}</c>, so the frontend's requests carry the session ID, and published
/// versions of the frontend work unchanged.
/// </para>
/// <para>
/// The frontend comes from Studio's app frontend distributions, in the version of the app library the app references,
/// as a real app gets it from that package. Studio lets any origin read the distributions, so the frontend can also
/// fetch its layout schema from there.
/// </para>
/// <para>
/// The <see cref="StudioBridge"/> runs before the frontend, since it defines functions the frontend then uses.
/// </para>
/// </remarks>
internal static class IndexPage
{
    /// <summary>The language a page starts in when the request names none, as in a real app.</summary>
    private const string DefaultLanguage = "nb";

    /// <summary>The page, or <c>null</c> when the app is not a v9 app, which is all preview shows.</summary>
    public static string? Generate(
        AppFiles files,
        SessionId sessionId,
        WorkingCopy workingCopy,
        Uri studioOrigin,
        string? requestedLanguage
    )
    {
        if (files.AppLibVersion() is not { } version || !IsV9(version))
        {
            return null;
        }

        string studio = studioOrigin.GetLeftPart(UriPartial.Authority);
        string assets = $"{studio}/designer/app-dist/{version}";
        string org = Json(JsonValue.Create($"{sessionId}/{workingCopy.Org}"));
        string app = Json(JsonValue.Create(workingCopy.App));
        string globalData = Json(GlobalData(files, workingCopy.Org, requestedLanguage));
        string title = WebUtility.HtmlEncode($"{workingCopy.Org} - {workingCopy.App}");

        return $$"""
            <!DOCTYPE html>
            <html lang="no">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
              <title>{{title}}</title>
              <link rel="icon" href="https://altinncdn.no/favicon.ico">
              <link rel="stylesheet" type="text/css" href="{{assets}}/altinn-app-frontend.css">
            </head>
            <body>
              <div id="root"></div>
              <script>
                window.org = {{org}};
                window.app = {{app}};
                window.featureToggles = {};
                window.altinnAppGlobalData = {{globalData}};
              </script>
              <script data-studio-origin="{{WebUtility.HtmlEncode(studio)}}">
            {{StudioBridge.Script}}
              </script>
              <script src="{{assets}}/altinn-app-frontend.js"></script>
            </body>
            </html>
            """;
    }

    /// <summary>
    /// What the app frontend starts with, as the app library's <c>BootstrapGlobalService</c> gathers it, with preview's
    /// user and party.
    /// </summary>
    private static JsonObject GlobalData(AppFiles files, string org, string? requestedLanguage)
    {
        IReadOnlyList<string> languages = files.Languages();
        string language = ChooseLanguage(languages, requestedLanguage);

        JsonObject applicationMetadata = files.ApplicationMetadata() ?? [];
        applicationMetadata["onEntry"] ??= new JsonObject { ["show"] = "new-instance" };
        // Any party may use the app in preview, whatever the app allows.
        applicationMetadata["partyTypesAllowed"] = new JsonObject
        {
            ["bankruptcyEstate"] = false,
            ["organisation"] = false,
            ["person"] = false,
            ["subUnit"] = false,
        };

        var ui = new JsonObject
        {
            ["folders"] = new JsonObject(
                files.UiFolders().Select(folder => KeyValuePair.Create(folder.Key, folder.Value))
            ),
        };
        if (files.GlobalUiSettings() is { } settings)
        {
            ui["settings"] = settings;
        }

        var globalData = new JsonObject
        {
            ["applicationMetadata"] = applicationMetadata,
            ["ui"] = ui,
            ["frontendSettings"] = new JsonObject(),
            ["platformFrontendSettings"] = new JsonObject
            {
                ["altinnLogoUrl"] = "https://altinncdn.no/img/Altinn-logo-blue.svg",
                ["helpCircleIllustrationUrl"] = "https://altinncdn.no/img/illustration-help-circle.svg",
                ["postalCodesUrl"] = "https://altinncdn.no/postcodes/registry.json",
                // Developers test the app here, so the frontend checks the layout and shows the errors and its
                // developer tools. Versions that don't read this decide from the host name, and the Studio bridge
                // turns on their layout check.
                ["development"] = true,
            },
            ["availableLanguages"] = new JsonArray([
                .. languages.Select(available => (JsonNode)new JsonObject { ["language"] = available }),
            ]),
            ["userProfile"] = MockUser.Profile(language),
            ["selectedParty"] = MockUser.Party(),
            // A real app has the org's names from Altinn's CDN, which preview doesn't reach. The app's appOwner and
            // appReceiver texts still name the org where the app has them.
            ["orgName"] = new JsonObject
            {
                ["nb"] = org,
                ["nn"] = org,
                ["en"] = org,
            },
        };
        if (files.Footer() is { } footer)
        {
            globalData["footer"] = footer;
        }

        if (files.TextResources(language) is { } textResources)
        {
            globalData["textResources"] = textResources;
        }

        return globalData;
    }

    /// <summary>The requested language, the default, or else any the app has texts in.</summary>
    public static string ChooseLanguage(IReadOnlyList<string> languages, string? requestedLanguage)
    {
        if (requestedLanguage is not null && languages.Contains(requestedLanguage, StringComparer.Ordinal))
        {
            return requestedLanguage;
        }

        return languages.Contains(DefaultLanguage, StringComparer.Ordinal) || languages.Count == 0
            ? DefaultLanguage
            : languages[0];
    }

    /// <summary>Whether the app references a v9 or later app library.</summary>
    public static bool IsV9(string version) =>
        int.TryParse(version.Split('.')[0], NumberStyles.None, CultureInfo.InvariantCulture, out int major)
        && major >= 9;

    /// <summary>
    /// JSON for the page's script. The default encoder escapes <c>&lt;</c>, <c>&gt;</c>, <c>&amp;</c> and quotes, so
    /// a value from the repository can't end the script element.
    /// </summary>
    private static string Json(JsonNode? node) => node?.ToJsonString() ?? "null";
}
