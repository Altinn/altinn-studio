namespace StudioGateway.Api.Configuration;

/// <summary>
/// Grafana settings
/// </summary>
public class GrafanaSettings
{
    public Dictionary<string, string> BaseUri { get; set; }
    public string Token { get; set; }

    public string GetBaseUri(string org, string env)
    {
        var key = env?.Trim().ToLower() == "prod" ? "Prod" : "Test";
        if (!BaseUri.TryGetValue(key, out var baseUri))
        {
            throw new ArgumentException($"Invalid environment '{env}'. Expected keys: {string.Join(", ", BaseUri.Keys)}");
        }
        return baseUri.Replace("{org}", org);
    }
}
