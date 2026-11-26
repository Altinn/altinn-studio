using System.Text.RegularExpressions;
using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.App;

/// <summary>
/// Lets a request choose which published app frontend version the index page loads, through the
/// <c>frontendVersion</c> query parameter. Used to try a new or preview frontend in a test environment.
/// </summary>
/// <remarks>
/// The version must match the rule app-dist itself uses, so it can only name a version directory on app-dist: it
/// cannot contain <c>/</c>, <c>:</c> or quotes, so a link cannot make the app load scripts from another host or
/// inject markup. The override is off in production and in environments we do not recognize.
/// </remarks>
internal static partial class FrontendVersionOverride
{
    public const string QueryParameterName = "frontendVersion";

    public const string AppDistBaseUrl = "https://altinn.studio/designer/app-dist";

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

    public static bool IsValidVersion(string? version) => version is not null && VersionRegex().IsMatch(version);

    // The same rule as AppDistController.VersionPattern in Designer, with \z instead of $ so a trailing newline does
    // not match.
    [GeneratedRegex(@"^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}\z", RegexOptions.CultureInvariant)]
    private static partial Regex VersionRegex();
}
