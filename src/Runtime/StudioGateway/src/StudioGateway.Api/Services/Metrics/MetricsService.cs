using Microsoft.Extensions.Options;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Models.Metrics;
using StudioGateway.Api.TypedHttpClients.MetricsClient;

namespace StudioGateway.Api.Services.Metrics;

public class MetricsService(
    IServiceProvider serviceProvider,
    IOptions<MetricsClientSettings> metricsClientSettings
) : IMetricsService
{
    private readonly MetricsClientSettings _metricsClientSettings = metricsClientSettings.Value;

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetMetricsAsync(string app, int time, CancellationToken cancellationToken = default)
    {
        IMetricsClient client = serviceProvider.GetRequiredKeyedService<IMetricsClient>(_metricsClientSettings.Provider);

        List<string> appMetrics = [
            "altinn_app_lib_instances_created",
            "altinn_app_lib_instances_completed",
            "altinn_app_lib_instances_deleted",
            "altinn_app_lib_instances_duration",
            "altinn_app_lib_processes_started",
            "altinn_app_lib_processes_ended",
            "altinn_app_lib_processes_duration",
            "altinn_app_lib_correspondence_orders",
            "altinn_app_lib_data_patched",
            "altinn_app_lib_maskinporten_token_requests",
            "altinn_app_lib_maskinporten_altinn_exchange_requests",
            "altinn_app_lib_notification_orders",
            "altinn_app_lib_signing_delegations",
            "altinn_app_lib_signing_delegation_revokes",
            "altinn_app_lib_singing_get_service_owner_party",
            "altinn_app_lib_signing_notify_signees"
        ];

        IEnumerable<AppMetric> metrics = await client.GetMetricsAsync(app, time, appMetrics, cancellationToken);

        return metrics;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<AppMetric>> GetFailedProcessNextRequestsAsync(string app, int time, CancellationToken cancellationToken = default)
    {
        IMetricsClient client = serviceProvider.GetRequiredKeyedService<IMetricsClient>(_metricsClientSettings.Provider);

        IEnumerable<AppMetric> metrics = await client.GetFailedProcessNextRequestsAsync(app, time, cancellationToken);

        return metrics;
    }
}
