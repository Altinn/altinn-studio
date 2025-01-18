using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="DataController"/>.
/// </summary>
public class DataPatchResponseMultiple
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    [JsonPropertyName("validationIssues"), Required]
    public required List<ValidationSourcePair> ValidationIssues { get; init; }

    /// <summary>
    /// The current data in all data models updated by the patch operation.
    /// </summary>
    [JsonPropertyName("newDataModels"), Required]
    public required List<DataModelPairResponse> NewDataModels { get; init; }

    /// <summary>
    /// The instance with updated dataElement list.
    /// </summary>
    [JsonPropertyName("instance"), Required]
    public required Instance Instance { get; init; }
}

/// <summary>
/// Pair of Guid and data object.
/// </summary>
/// <param name="DataElementId">The guid of the DataElement</param>
/// <param name="Data">The form data of the data element</param>
public record DataModelPairResponse(
    [property: JsonPropertyName("dataElementId"), Required] Guid DataElementId,
    [property: JsonPropertyName("data"), Required] object Data
);
