using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// The shape of preview's URLs: the session ID first, then the app's path, <c>/{org}/{app}</c>, as the app frontend
/// expects it.
/// </summary>
internal static class PreviewUrls
{
    /// <summary>The route prefix of every public endpoint.</summary>
    public const string RoutePrefix = "/{sessionId}/{org}/{app}";

    /// <summary>What <see cref="WithoutSessionId"/> puts in place of a session ID.</summary>
    public const string SessionIdPlaceholder = "{sessionId}";

    /// <summary>The URL that opens a working copy's app in preview.</summary>
    public static Uri AppRoot(Uri publicBaseUrl, SessionId sessionId, WorkingCopy workingCopy) =>
        new($"{publicBaseUrl.AbsoluteUri.TrimEnd('/')}/{sessionId}/{workingCopy.Org}/{workingCopy.App}/");

    /// <summary>
    /// The path with its session ID replaced, or <c>null</c> when it doesn't start with one. Telemetry records this
    /// rather than the path, because the ID opens the session.
    /// </summary>
    public static string? WithoutSessionId(string? path)
    {
        if (path is null || path.Length < SessionId.Length + 1 || path[0] != '/')
        {
            return null;
        }

        string rest = path[(SessionId.Length + 1)..];
        bool isSessionSegment = rest.Length == 0 || rest[0] == '/';
        return isSessionSegment && SessionId.TryParse(path[1..(SessionId.Length + 1)], out _)
            ? $"/{SessionIdPlaceholder}{rest}"
            : null;
    }
}
