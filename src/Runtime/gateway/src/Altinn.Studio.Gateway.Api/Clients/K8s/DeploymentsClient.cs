using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class DeploymentsClient(IKubernetes _kubernetes)
{
    private const string ReleaseLabel = "release";

    /// <summary>
    /// Gets the app's Deployment by its <c>release</c> label rather than by name, since apps deployed before GitOps
    /// carry the same label.
    /// </summary>
    /// <returns>The Deployment, or null when the app has none.</returns>
    public async Task<RunningAppDeployment?> GetRunning(
        string org,
        string app,
        string @namespace,
        CancellationToken cancellationToken
    )
    {
        var release = $"{org}-{app}".ToLowerInvariant();
        var deployments = await _kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            @namespace,
            labelSelector: $"{ReleaseLabel}={release}",
            cancellationToken: cancellationToken
        );

        if (deployments.Items is not [var deployment, ..])
        {
            return null;
        }

        var image = deployment.Spec?.Template?.Spec?.Containers is [var container, ..] ? container.Image : null;
        return new RunningAppDeployment(release, ContainerImage.TagOf(image));
    }
}
