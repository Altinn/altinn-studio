using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

// TODO: UserIdOrOrgNumber should probably be represented by a more specific type here. Eg. `Authenticated` or similar.
/// <summary>
/// Represents the user/entity on whose behalf the process engine is executing tasks.
/// </summary>
public sealed record ProcessEngineActor
{
    /// <summary>
    /// The user-id or org number of the actor.
    /// </summary>
    [JsonPropertyName("userIdOrOrgNumber")]
    public required string UserIdOrOrgNumber { get; init; }

    /// <summary>
    /// Optional language code to associate with actions on behalf of this actor.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; init; }
}
