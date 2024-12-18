using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Models.Preview;

/// <summary>
/// Represents the response from a data patch operation on the <see cref="Controllers.Preview.DataController"/>.
/// </summary>
public class DataPatchResponseMultiple
{
    /// <summary>
    /// The validation issues that were found during the patch operation.
    /// </summary>
    [JsonPropertyName("validationIssues")]
    public required List<ValidationSourcePair> ValidationIssues { get; init; }

    /// <summary>
    /// The current data in all data models updated by the patch operation.
    /// </summary>
    [JsonPropertyName("newDataModels")]
    public required List<DataModelPairResponse> NewDataModels { get; init; }

    /// <summary>
    /// The instance with updated dataElement list.
    /// </summary>
    [JsonPropertyName("instance")]
    public required Instance Instance { get; init; }
}

/// <summary>
/// Pair of Guid and data object.
/// </summary>
/// <param name="DataElementId">The guid of the DataElement</param>
/// <param name="Data">The form data of the data element</param>
public record DataModelPairResponse(
    [property: JsonPropertyName("dataElementId")] Guid DataElementId,
    [property: JsonPropertyName("data")] object Data
);
