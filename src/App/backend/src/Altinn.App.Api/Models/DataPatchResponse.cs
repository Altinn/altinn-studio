using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="DataController"/>.
/// </summary>
public class DataPatchResponse
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    public required Dictionary<string, List<ValidationIssueWithSource>> ValidationIssues { get; init; }

    /// <summary>
    /// The current data model after the patch operation.
    /// </summary>
    [JsonPropertyName("newDataModel")]
    public required object NewDataModel { get; init; }

    /// <summary>
    /// The instance object after patching. Used for frontend to detect added or removed data elements.
    /// </summary>
    [JsonPropertyName("instance")]
    public required Instance Instance { get; set; }
}
