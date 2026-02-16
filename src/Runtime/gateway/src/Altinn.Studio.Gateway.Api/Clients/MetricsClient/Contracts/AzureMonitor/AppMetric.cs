namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class AppMetric
{
    public required string Name { get; set; }
    public required IEnumerable<DataPoint> DataPoints { get; set; }
}
