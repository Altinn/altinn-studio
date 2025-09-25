using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Response object for POST to /org/app/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataType}
/// </summary>
public class DataDeleteResponse
{
    /// <summary>
    /// The instance with updated data
    /// </summary>
    [JsonPropertyName("instance")]
    public required Instance Instance { get; init; }

    /// <summary>
    /// List of validation issues that reported to have relevant changes after a new data element was added
    /// </summary>
    [JsonPropertyName("validationIssues")]
    public required List<ValidationSourcePair> ValidationIssues { get; init; }

    /// <summary>
    /// List of updated DataModels caused by dataProcessing
    /// </summary>
    [JsonPropertyName("newDataModels")]
    public required List<DataModelPairResponse> NewDataModels { get; init; }
}
