using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models.Shared;

/// <summary>
/// Represents an action.
/// </summary>
public class AltinnAction
{
    /// <summary>
    /// Gets or sets the type of the action.
    /// Default value is <see cref="DelegationConst.ActionId"/>.
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = DelegationConst.ActionId;

    /// <summary>
    /// Gets or sets the value.
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; set; }
}
