namespace Altinn.Studio.Observability.Proxy.Tests;

/// <summary>A proxy with one query token and one ingest token, and every backend at one downstream.</summary>
internal static class ProxyConfiguration
{
    public const string QueryToken = "query-token";

    public const string IngestToken = "ingest-token";

    public static Dictionary<string, string?> WithBothTokens(string downstreamAddress)
    {
        return new Dictionary<string, string?>
        {
            ["ObservabilityProxy:Downstreams:Agents:Traces"] = downstreamAddress,
            ["ObservabilityProxy:Downstreams:Agents:Metrics"] = downstreamAddress,
            ["ObservabilityProxy:Downstreams:Agents:Logs"] = downstreamAddress,
            ["ObservabilityProxy:Downstreams:Storage:Traces:0"] = downstreamAddress,
            ["ObservabilityProxy:Downstreams:Storage:Metrics:0"] = downstreamAddress,
            ["ObservabilityProxy:Downstreams:Storage:Logs:0"] = downstreamAddress,
            ["ObservabilityProxy:Authentication:Tokens:0:Token"] = QueryToken,
            ["ObservabilityProxy:Authentication:Tokens:0:SourceIdentity"] = "grafana",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:0"] = "traces",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:1"] = "metrics",
            ["ObservabilityProxy:Authentication:Tokens:0:AllowedRouteGroups:2"] = "logs",
            ["ObservabilityProxy:Authentication:Tokens:1:Token"] = IngestToken,
            ["ObservabilityProxy:Authentication:Tokens:1:SourceIdentity"] = "runtime-prod",
            ["ObservabilityProxy:Authentication:Tokens:1:AllowedRouteGroups:0"] = "otlp",
        };
    }
}
