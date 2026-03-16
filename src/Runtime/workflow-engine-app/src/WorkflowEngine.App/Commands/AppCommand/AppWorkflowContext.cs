using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>Workflow.Context shape for Altinn app commands.</summary>
public sealed record AppWorkflowContext
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
}
