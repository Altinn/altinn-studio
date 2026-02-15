using Altinn.Studio.Gateway.Api.Settings;
using k8s;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal sealed class PodsClient(IKubernetes client, IOptionsMonitor<GatewayContext> gatewayContextMonitor)
{
    private GatewayContext _gatewayContext => gatewayContextMonitor.CurrentValue;

    public async Task<double> GetReadyPodsCountAsync(string app, CancellationToken cancellationToken)
    {
        string org = _gatewayContext.ServiceOwner;

        var namespaceName = "default";

        var deployment = await client.AppsV1.ReadNamespacedDeploymentAsync(
            $"{org}-{app}-deployment-v2",
            namespaceName,
            cancellationToken: cancellationToken
        );

        int desiredReplicas = deployment.Spec.Replicas ?? 0;

        if (desiredReplicas == 0)
        {
            return 100;
        }

        var selector = deployment.Spec.Selector.MatchLabels;
        if (selector == null || selector.Count == 0)
        {
            throw new InvalidOperationException(
                $"Deployment {org}-{app}-deployment-v2 has no label selector configured."
            );
        }

        string labelSelector = string.Join(",", selector.Select(kv => $"{kv.Key}={kv.Value}"));

        var pods = await client.CoreV1.ListNamespacedPodAsync(
            namespaceName,
            labelSelector: labelSelector,
            cancellationToken: cancellationToken
        );
        var readyPodsCount = pods.Items.Count(pod =>
            pod.Status.Conditions?.Any(c => c.Type == "Ready" && c.Status == "True") == true
        );
        var count = Math.Round((double)readyPodsCount / desiredReplicas * 100);

        return Math.Min(count, 100);
    }
}
