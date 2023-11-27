using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Defines an action that should be performed by frontend
/// </summary>
public class FrontendAction
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
    /// Creates a nextPage frontend action
    /// </summary>
    /// <returns></returns>
    public static FrontendAction NextPage()
    {
        var frontendAction = new FrontendAction()
        {
            Name = "nextPage"
        };
        return frontendAction;
    }
}
