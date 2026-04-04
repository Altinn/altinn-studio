using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class DeploymentsClient(IKubernetes _kubernetes)
{
    public async Task<IReadOnlyList<KubernetesDeployment>> List(
        string @namespace,
        string? labelSelector = null,
        CancellationToken cancellationToken = default
    )
    {
        var deployments = await _kubernetes.AppsV1.ListNamespacedDeploymentAsync(
            namespaceParameter: @namespace,
            labelSelector: labelSelector,
            cancellationToken: cancellationToken
        );

        var result = new List<KubernetesDeployment>(deployments.Items.Count);
        foreach (var deployment in deployments.Items)
        {
            var release = TryGetRelease(deployment);
            var version = TryGetVersion(deployment);
            result.Add(new KubernetesDeployment(release, version));
        }

        return result;
    }

    private static string? TryGetRelease(V1Deployment deployment)
    {
        var labels = deployment.Metadata?.Labels;
        if (labels is not null && labels.TryGetValue("release", out var release))
        {
            return release;
        }

        return null;
    }

    private static string? TryGetVersion(V1Deployment deployment)
    {
        var image = deployment.Spec?.Template?.Spec?.Containers?.FirstOrDefault()?.Image;
        if (string.IsNullOrWhiteSpace(image))
        {
            return null;
        }

        // Kept intentionally compatible with kubernetes-wrapper parsing behavior.
        var split = image.Split(':');
        return split.Length > 1 ? split[1] : null;
    }
}
