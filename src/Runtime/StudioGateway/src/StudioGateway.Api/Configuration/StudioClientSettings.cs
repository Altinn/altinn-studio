namespace StudioGateway.Api.Configuration;

/// <summary>
/// Studio client settings
/// </summary>
public class StudioClientSettings
{
    public required string BaseUri { get; set; }
    public required string Token { get; set; }
}
