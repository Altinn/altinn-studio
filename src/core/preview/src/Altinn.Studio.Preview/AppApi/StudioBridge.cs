using System.Net;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The script that preview adds to an app's page, through which Studio and the page tell each other what changed.
/// <c>studio-bridge.js</c> says how, and the README which messages they send.
/// </summary>
internal static class StudioBridge
{
    private const string ResourceName = "studio-bridge.js";

    /// <summary>The script, for a <c>script</c> element of its own.</summary>
    public static string Script { get; } = Read();

    /// <summary>The bridge's <c>script</c> element, for a page that Studio's page at <paramref name="studioOrigin"/> frames.</summary>
    /// <param name="studioOrigin">The origin of Studio's page, the only one the bridge talks to.</param>
    /// <param name="componentErrors">
    /// Whether the bridge tells Studio which components the frontend found errors in. Only the v9 frontend logs the
    /// errors the bridge reads.
    /// </param>
    public static string Element(Uri studioOrigin, bool componentErrors)
    {
        string origin = WebUtility.HtmlEncode(studioOrigin.GetLeftPart(UriPartial.Authority));
        string errors = componentErrors ? " data-component-errors" : string.Empty;
        return $"<script data-studio-origin=\"{origin}\"{errors}>\n{Script}</script>";
    }

    private static string Read()
    {
        using Stream stream =
            typeof(StudioBridge).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"The assembly has no resource {ResourceName}.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
