using System.Diagnostics.CodeAnalysis;
using StudioGateway.Api.Models.Metrics;

namespace StudioGateway.Api.TypedHttpClients.KubernetesClient;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1515:AvoidUninstantiatedPublicTypes",
    Justification = "Instantiated via dependency injection and exposed externally"
)]
public interface IKubernetesClient
{
    public Task<AppHealthMetric> GetReadyPodsMetricAsync(string app, CancellationToken cancellationToken);
}
