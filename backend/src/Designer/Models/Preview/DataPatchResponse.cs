using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Validation;

namespace Altinn.Studio.Designer.Models.Preview;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="Controllers.Preview.DataController"/>.
/// </summary>
public class DataPatchResponse
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    public required Dictionary<string, List<ValidationIssue>> ValidationIssues { get; init; }

    /// <summary>
    /// The current data model after the patch operation.
    /// </summary>
    [JsonPropertyName("newDataModel")]
    public required object NewDataModel { get; init; }
}
