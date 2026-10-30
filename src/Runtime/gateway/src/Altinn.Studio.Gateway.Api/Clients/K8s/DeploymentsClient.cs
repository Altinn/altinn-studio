using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;
using k8s.Models;

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

        return deployments.Items is [var deployment, ..] ? ToRunningAppDeployment(release, deployment) : null;
    }

    /// <summary>
    /// The deploy pipeline annotates the pod template rather than the Deployment, because the app chart passes only
    /// pod annotations through. A Helm rollback restores the template, annotations included.
    /// </summary>
    internal static RunningAppDeployment ToRunningAppDeployment(string release, V1Deployment deployment)
    {
        var template = deployment.Spec?.Template;
        var image = template?.Spec?.Containers is [var container, ..] ? container.Image : null;
        var annotations = template?.Metadata?.Annotations;

        return new RunningAppDeployment(
            release,
            ContainerImage.TagOf(image),
            Annotation(annotations, StudioLabels.BuildId),
            Annotation(annotations, StudioLabels.SourceEnvironment),
            Annotation(annotations, StudioLabels.DeploymentId)
        );
    }

    private static string? Annotation(IDictionary<string, string>? annotations, string key) =>
        annotations is not null && annotations.TryGetValue(key, out var value) && value.Length > 0 ? value : null;
}
