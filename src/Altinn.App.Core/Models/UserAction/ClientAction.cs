using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.UserAction;

/// <summary>
/// Defines an action that should be performed by the client
/// </summary>
public class ClientAction
{
    /// <summary>
    /// Id of the action. This is used in the frontend to identify
    /// which action to run.
    /// </summary>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

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
        var frontendAction = new ClientAction() { Id = "nextPage" };
        return frontendAction;
    }

    /// <summary>
    /// Creates a previousPage client action
    /// </summary>
    /// <returns></returns>
    public static ClientAction PreviousPage()
    {
        var frontendAction = new ClientAction() { Id = "previousPage" };
        return frontendAction;
    }

    /// <summary>
    /// Creates a navigateToPage client action
    /// </summary>
    /// <param name="page">The page that should be navigated to</param>
    /// <returns></returns>
    public static ClientAction NavigateToPage(string page)
    {
        var frontendAction = new ClientAction()
        {
            Id = "navigateToPage",
            Metadata = new Dictionary<string, object> { { "page", page } },
        };
        return frontendAction;
    }
}
