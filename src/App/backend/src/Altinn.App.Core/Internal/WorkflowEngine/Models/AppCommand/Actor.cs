using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

/// <summary>
/// Represents the user/entity on whose behalf the engine is executing tasks.
/// </summary>
public sealed record Actor
{
    /// <summary>
    /// The user ID or organization number of the actor.
    /// </summary>
    [JsonPropertyName("userIdOrOrgNumber")]
    public required string UserIdOrOrgNumber { get; init; }

    /// <summary>
    /// The language preference of the actor.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; init; }
}
