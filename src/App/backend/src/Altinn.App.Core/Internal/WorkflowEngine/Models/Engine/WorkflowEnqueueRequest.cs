using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// A request to enqueue one or more workflows for execution.
/// </summary>
internal sealed record WorkflowEnqueueRequest
{
    /// <summary>
    /// Indexed key-value pairs for filtering, grouping, and dashboard queries.
    /// Applied to all workflows in this batch.
    /// </summary>
    [JsonPropertyName("labels")]
    public Dictionary<string, string>? Labels { get; init; }

    /// <summary>
    /// Opaque context passed to command handlers at execution time.
    /// Contains <see cref="AppWorkflowContext"/> with actor, lock token, and instance identification.
    /// The engine never inspects this.
    /// </summary>
    [JsonPropertyName("context")]
    public JsonElement? Context { get; init; }

    /// <summary>
    /// The workflows to enqueue.
    /// </summary>
    [JsonPropertyName("workflows")]
    public required IReadOnlyList<WorkflowRequest> Workflows { get; init; }
}
