using System.Text.Json.Serialization;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;

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
    public Dictionary<string, object>? UpdatedDataModels { get; set; }

    /// <summary>
    /// Gets a dictionary of updated validation issues. The first key is the data model id, the second key is the validator id
    /// Validators that are not listed in the dictionary are assumed to have not been executed
    /// </summary>
    [JsonPropertyName("updatedValidationIssues")]
    public Dictionary<
        string,
        Dictionary<string, List<ValidationIssueWithSource>>
    >? UpdatedValidationIssues { get; set; }

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

    /// <summary>
    /// If the action requires the client to redirect to another url, this property should be set
    /// </summary>
    [JsonPropertyName("redirectUrl")]
    public Uri? RedirectUrl { get; set; }
}
