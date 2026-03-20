using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Workflow.Context shape for Altinn app commands.
/// </summary>
internal sealed record AppWorkflowContext
{
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("org")]
    public required string Org { get; init; }

    [JsonPropertyName("app")]
    public required string App { get; init; }

    [JsonPropertyName("instanceOwnerPartyId")]
    public required int InstanceOwnerPartyId { get; init; }

    [JsonPropertyName("instanceGuid")]
    public required Guid InstanceGuid { get; init; }

    /// <summary>
    /// The full callback endpoint URL where the engine should POST command callbacks.
    /// The <c>commandKey</c> is appended as a relative path segment.
    /// Example: <c>http://app:5005/ttd/basic/instances/501337/{guid}/workflow-engine-callbacks</c>
    /// </summary>
    [JsonPropertyName("callbackUrl")]
    public required string CallbackUrl { get; init; }
}
