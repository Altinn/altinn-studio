using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

/// <summary>
/// Workflow.Context shape for Altinn app commands.
/// </summary>
internal sealed record AppWorkflowContext
{
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

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
    /// <c>Authorization: Bearer</c> header on every callback so the app can authenticate the engine.
    /// </summary>
    [JsonPropertyName("callbackToken")]
    public required string CallbackToken { get; init; }

    /// <summary>
    /// The Altinn.App.Core version that planned the workflow's steps, which the engine echoes as
    /// <see cref="AppCallbackPayload.PlannerVersion"/> on every callback without reading it. An enqueue whose steps this
    /// pod planned sets <see cref="Altinn.App.Core.Internal.WorkflowEngine.PlannerVersion.Current"/>, and one that
    /// enqueues steps another workflow planned passes that workflow's version on. <c>null</c> only for steps planned
    /// before the stamp existed.
    /// </summary>
    /// <remarks>
    /// The engine leaves the context out of the enqueue fingerprint. A replay from another version therefore still
    /// matches when it plans the same steps, and the engine keeps the first attempt's context, whose version planned
    /// the steps it stored.
    /// </remarks>
    [JsonPropertyName("plannerVersion")]
    public required string? PlannerVersion { get; init; }

    /// <summary>
    /// The oldest Altinn.App.Core version that may run the workflow's steps, which the engine echoes as
    /// <see cref="AppCallbackPayload.RunnableFromVersion"/>. Set from
    /// <see cref="Altinn.App.Core.Internal.WorkflowEngine.PlannerVersion.RunnableFrom"/> wherever
    /// <see cref="PlannerVersion"/> is, and left out of the JSON when <c>null</c>: then only
    /// <see cref="PlannerVersion"/> and newer run them.
    /// </summary>
    /// <remarks>
    /// Not <c>required</c>, unlike <see cref="PlannerVersion"/>: the serializer would then reject a context that leaves
    /// it out.
    /// </remarks>
    [JsonPropertyName("runnableFromVersion")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RunnableFromVersion { get; init; }
}
