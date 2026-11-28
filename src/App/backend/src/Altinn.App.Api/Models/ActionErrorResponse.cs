using System.Text.Json.Serialization;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Api.Models;

/// <summary>
/// Why a user action failed
/// </summary>
public class ActionErrorResponse
{
    /// <summary>
    /// Machine readable error code
    /// </summary>
    [JsonPropertyName("code")]
    public string? Code { get; set; }

    /// <summary>
    /// Human readable error message or text key
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Error metadata
    /// </summary>
    [JsonPropertyName("metadata")]
    public Dictionary<string, string>? Metadata { get; set; }

    /// <summary>
    /// Validation issues that made the action fail, with their text keys translated. Unless the action set an error
    /// of its own, the code and message are those of the first issue.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    public List<ValidationIssueWithSource>? ValidationIssues { get; set; }

    internal static ActionErrorResponse? From(ActionError? error, List<ValidationIssueWithSource>? validationIssues)
    {
        if (error is null && validationIssues is null)
        {
            return null;
        }

        return new ActionErrorResponse
        {
            Code = error?.Code,
            Message = error?.Message ?? string.Empty,
            Metadata = error?.Metadata,
            ValidationIssues = validationIssues,
        };
    }
}
