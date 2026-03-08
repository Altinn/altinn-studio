using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Altinn;

/// <summary>
/// Represents the user/entity on whose behalf the engine is executing tasks.
/// Altinn-specific: used only by <see cref="AppCommandHandler"/>.
/// </summary>
public sealed record Actor
{
    [JsonPropertyName("userIdOrOrgNumber")]
    public required string UserIdOrOrgNumber { get; init; }

    [JsonPropertyName("language")]
    public string? Language { get; init; }
}

/// <summary>
/// Configuration settings for Altinn app command integration.
/// </summary>
public sealed record AppCommandSettings
{
    /// <summary>
    /// The API key used to authenticate requests between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public required string ApiKey { get; set; }

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports
    /// Org, App, InstanceOwnerPartyId, InstanceGuid placeholders.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public required string CommandEndpoint { get; set; }

    /// <summary>
    /// The header name used for API key authentication between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKeyHeaderName")]
    public string ApiKeyHeaderName { get; set; } = "X-Api-Key";
}

/// <summary>
/// Payload sent to the Altinn application when an AppCommand is executed.
/// </summary>
public sealed record AppCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }
}

/// <summary>
/// Response body from a successful Altinn app callback.
/// </summary>
public sealed record AppCallbackResponse
{
    [JsonPropertyName("state")]
    public string? State { get; init; }
}

/// <summary>
/// Convenience record for extracting Altinn instance information from workflow labels and tenant ID.
/// </summary>
public sealed record InstanceInformation
{
    [JsonPropertyName("org")]
    public required string Org { get; init; }

    [JsonPropertyName("app")]
    public required string App { get; init; }

    [JsonPropertyName("instanceOwnerPartyId")]
    public required int InstanceOwnerPartyId { get; init; }

    [JsonPropertyName("instanceGuid")]
    public required Guid InstanceGuid { get; init; }

    /// <summary>
    /// Extracts instance information from workflow context.
    /// </summary>
    public static InstanceInformation FromContext(AppCommandHandler.AppWorkflowContext context) =>
        new()
        {
            Org = context.Org,
            App = context.App,
            InstanceOwnerPartyId = context.InstanceOwnerPartyId,
            InstanceGuid = context.InstanceGuid,
        };
}
