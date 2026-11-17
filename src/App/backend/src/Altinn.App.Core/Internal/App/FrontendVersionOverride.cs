using System.Text.RegularExpressions;
using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Lets a request choose which published app frontend version the index page loads, through the
/// <c>frontendVersion</c> query parameter. Used to try a new or preview frontend in a test environment.
/// </summary>
/// <remarks>
/// Only a version number is accepted, never a URL, so a link cannot make the app load scripts from another host.
/// The override is off in production and in environments we do not recognize.
/// </remarks>
internal static partial class FrontendVersionOverride
{
    public const string QueryParameterName = "frontendVersion";

    public const string AppDistBaseUrl = "https://altinn.studio/designer/app-dist";

    private const int MaxVersionLength = 64;

    public static string? GetAssetBaseUrl(string? version, HostingEnvironment environment)
    {
        if (environment is not (HostingEnvironment.Development or HostingEnvironment.Staging))
        {
            return null;
        }

        if (!IsValidVersion(version))
        {
            return null;
        }

        return $"{AppDistBaseUrl}/{version}";
    }

    public static bool IsValidVersion(string? version) =>
        !string.IsNullOrEmpty(version) && version.Length <= MaxVersionLength && VersionRegex().IsMatch(version);

    // A semantic version with an optional prerelease part, such as 9.0.0 or 9.0.0-preview.6. Uses [0-9] rather
    // than \d, because \d also matches digits from other scripts.
    [GeneratedRegex(@"^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?\z", RegexOptions.CultureInvariant)]
    private static partial Regex VersionRegex();
}
