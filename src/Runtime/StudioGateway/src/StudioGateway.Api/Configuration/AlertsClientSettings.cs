namespace StudioGateway.Api.Configuration;

/// <summary>
/// Alerts client settings
/// </summary>
public class AlertsClientSettings
{
    public required string Provider { get; set; }
    public required string BaseUri { get; set; }
    public required string Token { get; set; }
}
