namespace Altinn.Studio.Gateway.Api.Settings;

internal sealed class AlertsClientSettings
{
    internal enum AlertsClientProvider
    {
        Grafana,
    }

    public required AlertsClientProvider Provider { get; set; }
}
