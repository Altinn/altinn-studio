namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal static class HelmReleaseLabelSelector
{
    public static string ForOrgAndSourceEnvironment(string org, string sourceEnvironment) =>
        $"{StudioLabels.Org}={org},{StudioLabels.SourceEnvironment}={sourceEnvironment}";
}
