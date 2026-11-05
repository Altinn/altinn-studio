using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Configuration settings for the core operator integration. The defaults are those of the Studio cluster.
/// </summary>
internal sealed record OperatorCommandSettings
{
#pragma warning disable S5332 // The callback router is a cluster-local HTTP endpoint.
    /// <summary>
    /// The URL of the operator's callback router. The command appends the command key to it.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public string CommandEndpoint { get; set; } =
        "http://core-operator.core-operator.svc.cluster.local:8090/workflow-engine-callbacks/";
#pragma warning restore S5332

    /// <summary>
    /// The file that holds the projected ServiceAccount token the command sends as its bearer token. The default is
    /// where the Deployment mounts it. Empty sends no token, which only a local operator without authentication
    /// accepts.
    /// </summary>
    [JsonPropertyName("tokenPath")]
    public string TokenPath { get; set; } = "/var/run/secrets/core-operator/token";
}
