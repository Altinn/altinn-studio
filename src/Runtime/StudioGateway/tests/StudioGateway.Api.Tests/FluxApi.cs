namespace StudioGateway.Api.Tests;

internal static class FluxApi
{
    public const string FluxSystemNamespace = "flux-system";

    // HelmRelease
    public const string HelmReleaseGroup = "helm.toolkit.fluxcd.io";
    public const string HelmReleasePlural = "helmreleases";

    // HelmRepository
    public const string HelmRepoGroup = "source.toolkit.fluxcd.io";
    public const string HelmRepoPlural = "helmrepositories";

    // Notification
    public const string NotificationGroup = "notification.toolkit.fluxcd.io";
    public const string AlertsPlural = "alerts";
    public const string ProvidersPlural = "providers";

    // Versions
    public const string V1 = "v1";
    public const string V2 = "v2";
    public const string V1Beta3 = "v1beta3";
}
