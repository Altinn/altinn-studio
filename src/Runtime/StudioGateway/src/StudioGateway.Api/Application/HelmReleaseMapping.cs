using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Contracts.Deploy;

internal static class HelmReleaseMapping
{
    public static bool TryCreateAppDeployment(
        HelmRelease helmRelease,
        string targetEnvironment,
        [NotNullWhen(true)] out AppDeployment? deployment,
        [NotNullWhen(false)] out string? error
    )
    {
        deployment = null;
        error = null;

        var labels = helmRelease.GetLabels();

        if (
            !labels.TryGetValue(StudioLabels.Org, out var org)
            || !labels.TryGetValue(StudioLabels.App, out var app)
            || !labels.TryGetValue(StudioLabels.SourceEnvironment, out var sourceEnv)
            || !labels.TryGetValue(StudioLabels.BuildId, out var buildId)
        )
        {
            error = "HelmRelease is missing required labels.";
            return false;
        }

        var imageTag = helmRelease.GetImageTag();
        if (imageTag is null)
        {
            error = "HelmRelease is missing image tag.";
            return false;
        }

        deployment = new AppDeployment(org, targetEnvironment, app, sourceEnv, buildId, imageTag);
        return true;
    }
}
