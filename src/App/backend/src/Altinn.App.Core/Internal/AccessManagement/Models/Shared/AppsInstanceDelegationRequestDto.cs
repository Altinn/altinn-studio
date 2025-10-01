using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models.Shared;

/// <summary>
/// Request model for performing delegation of access to an app instance from Apps
/// </summary>
public class AppsInstanceDelegationRequestDto
{
    /// <summary>
    /// Gets or sets the urn identifying the party to delegate from
    /// </summary>
    [JsonPropertyName("from")]
    public required DelegationParty From { get; set; }

    /// <summary>
    /// Gets or sets the urn identifying the party to be delegated to
    /// </summary>
    [JsonPropertyName("to")]
    public required DelegationParty To { get; set; }

    /// <summary>
    /// Gets or sets the rights to delegate
    /// </summary>
    [JsonPropertyName("rights")]
    public required IEnumerable<RightDto> Rights { get; set; }
}
