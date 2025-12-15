namespace StudioGateway.Api.Settings;

internal sealed class MetricsClientSettings
{
    public required string Provider { get; set; }
    public required string ApplicationLogAnalyticsWorkspaceId { get; set; }
}
