using System;

namespace StudioGateway.Api.Configuration;

/// <summary>
/// Grafana settings
/// </summary>
public class GrafanaSettings
{
    public string BaseUri { get; set; }
    public string Token { get; set; }

    public string GetBaseUri(string org)
    {
        return BaseUri.Replace("{org}", org);
    }
}
