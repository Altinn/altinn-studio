using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models.Shared;

/// <summary>
/// Represents the rights to delegate.
/// </summary>
public class RightDto
{
    /// <summary>
    /// Gets or sets the resource.
    /// </summary>
    [JsonPropertyName("resource")]
    public required List<Resource> Resource { get; set; }

    /// <summary>
    /// Gets or sets the action.
    /// </summary>
    [JsonPropertyName("action")]
    public required AltinnAction Action { get; set; }
}
