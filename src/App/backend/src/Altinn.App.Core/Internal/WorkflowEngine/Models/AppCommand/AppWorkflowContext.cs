using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

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
    /// JWT minted by the app at enqueue time, carried opaquely by the engine and replayed in the
    /// <c>Altinn-Workflow-Callback-Token</c> header on every callback so the app can authenticate the engine.
    /// </summary>
    [JsonPropertyName("callbackToken")]
    public required string CallbackToken { get; init; }
}
