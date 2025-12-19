using k8s;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.K8s;

internal sealed class PodsClient(IKubernetes client, GatewayContext gatewayContext)
{
    public async Task<double> GetReadyPodsCountAsync(string app, CancellationToken cancellationToken)
    {
        string org = gatewayContext.ServiceOwner;

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
