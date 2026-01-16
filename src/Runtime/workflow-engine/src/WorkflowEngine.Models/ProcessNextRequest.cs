using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// A request to move the process forward from one element (task) to another.
/// </summary>
public sealed record ProcessNextRequest
{
    /// <summary>
    /// The current BPMN element (task) ID.
    /// </summary>
    [JsonPropertyName("currentElementId")]
    public required string CurrentElementId { get; init; }

    /// <summary>
    /// The desired BPMN element (task) ID.
    /// </summary>
    [JsonPropertyName("desiredElementId")]
    public required string DesiredElementId { get; init; }

    /// <summary>
    /// The actor this request is executed on behalf of.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    /// <summary>
    /// Process engine tasks associated with this request.
    /// </summary>
    [JsonPropertyName("tasks")]
    public required IEnumerable<CommandRequest> Tasks { get; init; }

    /// <summary>
    /// Converts this request to a <see cref="Request"/> with the provided instance information.
    /// </summary>
    public Request ToProcessEngineRequest(InstanceInformation instanceInformation) =>
        new(
            $"{instanceInformation.InstanceGuid}/next/from-{CurrentElementId}-to-{DesiredElementId}",
            instanceInformation,
            Actor,
            Tasks
        );
};
