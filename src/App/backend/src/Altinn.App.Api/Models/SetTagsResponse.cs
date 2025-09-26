using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from the set tags API endpoint providing a list of tags and current validation issues.
/// </summary>
public sealed class SetTagsResponse
{
    /// <summary>
    /// A list of tags represented as string values.
    /// </summary>
    [JsonPropertyName("tags")]
    public List<string> Tags { get; init; } = [];

    /// <summary>
    /// List of validation issues that changed as a result of updating tags.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<ValidationSourcePair>? ValidationIssues { get; init; }
}
