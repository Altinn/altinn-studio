using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Information about an instance.
/// </summary>
public sealed record InstanceInformation
{
    /// <summary>
    /// The organization that the instance belongs to.
    /// </summary>
    [JsonPropertyName("org")]
    public required string Org { get; init; }

    /// <summary>
    /// The app that created the instance.
    /// </summary>
    [JsonPropertyName("app")]
    public required string App { get; init; }

    /// <summary>
    /// The instance owner's party ID.
    /// </summary>
    [JsonPropertyName("instanceOwnerPartyId")]
    public required int InstanceOwnerPartyId { get; init; }

    /// <summary>
    /// The instance ID.
    /// </summary>
    [JsonPropertyName("instanceGuid")]
    public required Guid InstanceGuid { get; init; }

    /// <inheritdoc />
    public bool Equals(InstanceInformation? other)
    {
        if (other is null)
            return false;

        return Org.Equals(other.Org, StringComparison.OrdinalIgnoreCase)
            && App.Equals(other.App, StringComparison.OrdinalIgnoreCase)
            && InstanceOwnerPartyId == other.InstanceOwnerPartyId
            && InstanceGuid == other.InstanceGuid;
    }

    /// <inheritdoc />
    public override int GetHashCode() =>
        HashCode.Combine(Org.ToLowerInvariant(), App.ToLowerInvariant(), InstanceOwnerPartyId, InstanceGuid);
};
