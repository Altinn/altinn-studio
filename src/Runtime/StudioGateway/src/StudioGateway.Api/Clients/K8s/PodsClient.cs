using k8s;
using k8s.Models;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.Clients.K8s;

internal sealed class PodsClient(IKubernetes client, GatewayContext gatewayContext)
{
    public async Task<IList<V1Pod>> GetPodsAsync(string app, CancellationToken cancellationToken)
    {
        string org = gatewayContext.ServiceOwner;

        return (
            await client.CoreV1.ListNamespacedPodAsync(
                "default",
                null,
                null,
                null,
                $"release={org}-{app}",
                null,
                null,
                null,
                null,
                null,
                null,
                cancellationToken
            )
        ).Items;
    }
}
