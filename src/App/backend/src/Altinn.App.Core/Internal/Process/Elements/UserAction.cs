using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.Elements;

/// <summary>
/// Defines an altinn action for a task
/// </summary>
public class UserAction
{
    /// <summary>
    /// Gets or sets the ID of the action
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    /// <summary>
    /// Gets or sets if the user is authorized to perform the action
    /// </summary>
    [JsonPropertyName("authorized")]
    public bool Authorized { get; set; }

    /// <summary>
    /// Gets or sets the type of action
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    [JsonPropertyName("type")]
    public ActionType ActionType { get; set; }
}
