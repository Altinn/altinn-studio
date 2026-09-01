using System.Text.RegularExpressions;

namespace Altinn.Studio.Gateway.Api.Application;

/// <summary>
/// The single home for validating caller-supplied Studio app names: an app name starts with a
/// letter and contains only lowercase letters, digits, and hyphens (Studio's app naming rules).
/// <para>
/// Note: the deploy routes currently accept app route parameters without validating this shape —
/// <see cref="Clients.K8s.HelmReleaseNameHelper"/> merely interpolates them into HelmRelease
/// names (whose parse is laxer: it allows an app to start with a digit or hyphen). They can
/// adopt this helper later; this type deliberately does not change their behavior.
/// </para>
/// </summary>
internal static partial class AppName
{
    [GeneratedRegex("^[a-z][a-z0-9-]{0,62}$")]
    private static partial Regex AppNameRegex();

    public static bool IsValid(string app) => AppNameRegex().IsMatch(app);
}
