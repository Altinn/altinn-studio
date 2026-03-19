namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class AppFailedRequest
{
    public required string Name { get; set; }
    public required IEnumerable<long> Timestamps { get; set; }
    public required IEnumerable<double> Counts { get; set; }
}
