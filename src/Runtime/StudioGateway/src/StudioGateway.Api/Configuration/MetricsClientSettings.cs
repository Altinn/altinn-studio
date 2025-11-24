namespace StudioGateway.Api.Configuration;

/// <summary>
/// Metrics client settings
/// </summary>
public class MetricsClientSettings
{
    public string Provider { get; set; }
    public string ApplicationLogAnalyticsWorkspaceId { get; set; }
    public string Token { get; set; }
}
