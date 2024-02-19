using System.Text.Json.Serialization;
using Altinn.App.Core.Models.UserAction;

namespace Altinn.App.Api.Models;

/// <summary>
/// Response object from action endpoint
/// </summary>
public class UserActionResponse
{
    /// <summary>
    /// Data models that have been updated
    /// </summary>
    [JsonPropertyName("updatedDataModels")]
    public Dictionary<string, object?>? UpdatedDataModels { get; set; }
    
    /// <summary>
    /// Actions the client should perform after action has been performed backend
    /// </summary>
    [JsonPropertyName("clientActions")]
    public List<ClientAction>? ClientActions { get; set; }
    
    /// <summary>
    /// Validation issues that occured when processing action
    /// </summary>
    [JsonPropertyName("error")]
    public ActionError? Error { get; set; }
}
