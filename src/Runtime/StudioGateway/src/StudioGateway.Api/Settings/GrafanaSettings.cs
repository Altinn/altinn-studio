namespace StudioGateway.Api.Settings;

internal sealed class GrafanaSettings
{
    public required string Token { get; set; }
    public required Uri Url { get; set; }
}
