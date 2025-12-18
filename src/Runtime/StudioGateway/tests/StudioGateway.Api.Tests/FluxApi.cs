using System.Text.RegularExpressions;

namespace StudioGateway.Api.Tests;

internal static partial class FluxApi
{
    // Pattern for RFC3339 timestamp with 7-digit fractional seconds (matches OciRepositoryClient.TimestampFormat)
    [GeneratedRegex(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$")]
    public static partial Regex TimestampPattern();

    public const string FluxSystemNamespace = "flux-system";

    // HelmRelease
    public const string HelmReleaseGroup = "helm.toolkit.fluxcd.io";
    public const string HelmReleasePlural = "helmreleases";

    // HelmRepository
    public const string HelmRepoGroup = "source.toolkit.fluxcd.io";
    public const string HelmRepoPlural = "helmrepositories";

    // OCIRepository
    public const string OciRepoGroup = "source.toolkit.fluxcd.io";
    public const string OciRepoPlural = "ocirepositories";

    // Notification
    public const string NotificationGroup = "notification.toolkit.fluxcd.io";
    public const string AlertsPlural = "alerts";
    public const string ProvidersPlural = "providers";

    // Versions
    public const string V1 = "v1";
    public const string V2 = "v2";
    public const string V1Beta3 = "v1beta3";
}
