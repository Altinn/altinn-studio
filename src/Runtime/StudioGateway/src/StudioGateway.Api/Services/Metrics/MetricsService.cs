using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.TypedHttpClients.KubernetesClient;
using StudioGateway.Api.TypedHttpClients.MetricsClient;

namespace StudioGateway.Api.Services.Metrics;

[SuppressMessage(
    "Microsoft.Performance",
    "CA1812:AvoidUninstantiatedInternalClasses",
    Justification = "Class is instantiated via dependency injection"
)]
internal sealed class MetricsService(
    IServiceProvider serviceProvider,
    IOptions<MetricsClientSettings> metricsClientSettings,
    IKubernetesClient kubernetesClient
) : IMetricsService
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<Metric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken)
    {
        IMetricsClient metricsClient = serviceProvider.GetRequiredKeyedService<IMetricsClient>(
            _metricsClientSettings.Provider
        );

        IEnumerable<Metric> kubernetesReadiness = await kubernetesClient.GetReadinessAsync(app, cancellationToken);
        IEnumerable<Metric> metrics = await metricsClient.GetMetricsAsync(app, time, cancellationToken);

        return kubernetesReadiness.Concat(metrics);
    }
}
