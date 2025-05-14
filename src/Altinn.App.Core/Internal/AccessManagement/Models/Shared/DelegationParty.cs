using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models.Shared;

/// <summary>
/// Represents a delegation party.
/// </summary>
public class DelegationParty
{
    /// <summary>
    /// Gets or sets the type of the id. Default is <see cref="DelegationConst.Party"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = DelegationConst.Party;

    /// <summary>
    /// Gets or sets the id.
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; set; }
}
