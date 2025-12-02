using System.Diagnostics.CodeAnalysis;
using k8s;
using k8s.Models;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.KubernetesClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class KubernetesClient(IConfiguration configuration, Kubernetes client) : IKubernetesClient
{
    /// <inheritdoc/>
    public async Task<HealthMetric> GetReadinessAsync(string app, CancellationToken cancellationToken)
    {
        string org =
            configuration["GATEWAY_SERVICEOWNER"]
            ?? throw new InvalidOperationException("Configuration value 'GATEWAY_SERVICEOWNER' is missing.");

        V1PodList pods = await client.ListNamespacedPodAsync(
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
            null,
            cancellationToken
        );

        var items = pods.Items;
        int readyPods = items.Count(pod =>
            pod.Spec.Containers.All(container =>
                pod.Status.ContainerStatuses.FirstOrDefault(s => s.Name == container.Name)?.Ready == true
            )
        );

        return new HealthMetric() { Name = "readiness", Value = items.Any() ? readyPods / items.Count * 100 : 0 };
    }
}
