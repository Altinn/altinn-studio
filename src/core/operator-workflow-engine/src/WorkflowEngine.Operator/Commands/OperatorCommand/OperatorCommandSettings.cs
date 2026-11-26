using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// How the command calls the core operator. The defaults are those of the Studio cluster.
/// </summary>
internal sealed record OperatorCommandSettings
{
#pragma warning disable S5332 // The callback router is a cluster-local HTTP endpoint.
    /// <summary>
    /// The URL of the operator's callback router. The command appends the command key to it.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public string CommandEndpoint { get; set; } =
        "http://operator.core-operator.svc.cluster.local:8090/workflow-engine-callbacks/";
#pragma warning restore S5332

    /// <summary>
    /// The file with the projected ServiceAccount token the command sends as its bearer token. An empty path sends no
    /// token, and the operator answers 401. Use an empty path only with a stub of the operator.
    /// </summary>
    [JsonPropertyName("tokenPath")]
    public string TokenPath { get; set; } = "/var/run/secrets/core-operator/token";
}
