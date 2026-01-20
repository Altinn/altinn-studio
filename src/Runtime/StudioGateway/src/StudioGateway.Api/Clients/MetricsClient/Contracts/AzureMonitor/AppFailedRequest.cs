namespace StudioGateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class AppFailedRequest
{
    public required string Name { get; set; }
    public required IEnumerable<DataPoint> DataPoints { get; set; }
}
