using System.Diagnostics.CodeAnalysis;
using k8s;
using k8s.Models;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.Settings;

namespace StudioGateway.Api.TypedHttpClients.KubernetesClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class KubernetesClient(IKubernetes client, IOptions<GeneralSettings> generalSettings)
    : IKubernetesClient
{
    private readonly GeneralSettings _generalSettings = generalSettings.Value;

    /// <inheritdoc/>
    public async Task<AppHealthMetric> GetReadyPodsMetricAsync(string app, CancellationToken cancellationToken)
    {
        string org = _generalSettings.ServiceOwner;

        IList<V1Pod> items = (
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

        var readyPodsCount = items.Count(pod =>
            pod.Spec.Containers.All(container =>
                pod.Status.ContainerStatuses.FirstOrDefault(s => s.Name == container.Name)?.Ready == true
            )
        );

        return new AppHealthMetric()
        {
            Name = "ready_pods",
            Count = Math.Round((double)readyPodsCount / items.Count * 100),
        };
    }
}
