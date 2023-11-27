#nullable enable
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
    /// Actions frontend should perform after action has been performed backend
    /// </summary>
    [JsonPropertyName("frontendActions")]
    public List<FrontendAction>? FrontendActions { get; set; }
    
    /// <summary>
    /// Validation issues that occured when processing action
    /// </summary>
    [JsonPropertyName("error")]
    public ActionError? Error { get; set; }
}
