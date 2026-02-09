namespace Altinn.Studio.Gateway.Api.Clients.MetricsClient.Contracts.AzureMonitor;

internal sealed class FailedRequest
{
    public required string Name { get; set; }
    public required string AppName { get; set; }
    public required double Count { get; set; }
}
