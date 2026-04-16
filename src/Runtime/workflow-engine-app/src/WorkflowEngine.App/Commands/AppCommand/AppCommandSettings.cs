using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Configuration settings for Altinn app command integration.
/// </summary>
internal sealed record AppCommandSettings
{
    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports
    /// Org, App, InstanceOwnerPartyId, InstanceGuid placeholders.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public required string CommandEndpoint { get; set; }
}
