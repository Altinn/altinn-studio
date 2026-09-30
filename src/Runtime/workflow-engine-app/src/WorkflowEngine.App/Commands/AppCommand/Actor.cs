using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Represents the user/entity on whose behalf the engine is executing tasks.
/// </summary>
internal sealed record Actor
{
    /// <summary>
    /// The authenticated user ID when the workflow was initiated by a user.
    /// </summary>
    [JsonPropertyName("userId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? UserId { get; init; }

    /// <summary>
    /// The platform user org identifier to use for emitted instance events.
    /// </summary>
    [JsonPropertyName("orgId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? OrgId { get; init; }

    /// <summary>
    /// The authentication level of the actor.
    /// </summary>
    [JsonPropertyName("authenticationLevel")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? AuthenticationLevel { get; init; }

    /// <summary>
    /// The national identity number of the authenticated user, if available.
    /// </summary>
    [JsonPropertyName("nationalIdentityNumber")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? NationalIdentityNumber { get; init; }

    /// <summary>
    /// The system user identifier when the workflow was initiated by a system user.
    /// </summary>
    [JsonPropertyName("systemUserId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Guid? SystemUserId { get; init; }

    /// <summary>
    /// The owning organization number of the system user, if available.
    /// </summary>
    [JsonPropertyName("systemUserOwnerOrgNo")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SystemUserOwnerOrgNo { get; init; }

    /// <summary>
    /// The display name of the system user, if available.
    /// </summary>
    [JsonPropertyName("systemUserName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SystemUserName { get; init; }

    /// <summary>
    /// The language preference of the actor.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; init; }
}
