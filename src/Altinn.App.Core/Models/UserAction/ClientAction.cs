using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Defines an action that should be performed by the client
/// </summary>
public class ClientAction
{
    /// <summary>
    /// Name of the action
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Metadata for the action
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, object>? Metadata { get; set; }
    
    /// <summary>
    /// Creates a nextPage client action
    /// </summary>
    /// <returns></returns>
    public static ClientAction NextPage()
    {
        var frontendAction = new ClientAction()
        {
            Name = "nextPage"
        };
        return frontendAction;
    }
}
