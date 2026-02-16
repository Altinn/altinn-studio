namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class DataPoint
{
    public DateTimeOffset DateTimeOffset { get; set; }
    public double Count { get; set; }
}
