using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

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
    public static InstanceInformation FromContext(AppWorkflowContext context) =>
        new()
        {
            Org = context.Org,
            App = context.App,
            InstanceOwnerPartyId = context.InstanceOwnerPartyId,
            InstanceGuid = context.InstanceGuid,
        };
}
