using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Gateway.Api.Clients.K8s;

namespace Altinn.Studio.Gateway.Api.Application;

internal static class HelmReleaseMapping
{
    public static bool TryGetDeploymentMetadata(
        HelmRelease helmRelease,
        [NotNullWhen(true)] out DeploymentMetadata? metadata,
        [NotNullWhen(false)] out string? error
    )
    {
        metadata = null;
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

        metadata = new DeploymentMetadata(org, app, sourceEnv, buildId);
        return true;
    }

    internal sealed record DeploymentMetadata(string Org, string App, string SourceEnvironment, string BuildId);
}
