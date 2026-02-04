namespace StudioGateway.Api.Settings;

internal sealed class MetricsClientSettings
{
    internal enum MetricsClientProvider
    {
        AzureMonitor,
    }

    public required MetricsClientProvider Provider { get; set; }
}
