using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

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
    /// Opaque token minted by the app at enqueue time. The engine never inspects it; it is replayed
    /// in the <c>Authorization: Bearer</c> header on every callback so the app can authenticate the engine.
    /// </summary>
    [JsonPropertyName("callbackToken")]
    public required string CallbackToken { get; init; }

    /// <summary>
    /// The app library version that planned the workflow. The engine never inspects it. It echoes it as
    /// <see cref="AppCallbackPayload.PlannerVersion"/> on every callback, so a pod on an older version can refuse a
    /// step that a newer one planned. Absent from workflows that apps enqueued before they set it.
    /// </summary>
    [JsonPropertyName("plannerVersion")]
    public string? PlannerVersion { get; init; }

    /// <summary>
    /// The oldest app library version that may run the workflow, which the planner can declare next to
    /// <see cref="PlannerVersion"/>. The engine never inspects it. It echoes it as
    /// <see cref="AppCallbackPayload.RunnableFromVersion"/> on every callback. Absent unless the planner declared one.
    /// </summary>
    [JsonPropertyName("runnableFromVersion")]
    public string? RunnableFromVersion { get; init; }
}
