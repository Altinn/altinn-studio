using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Models.Preview;

/// <summary>
/// Response object for POST and DELETE to /org/app/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/data/{dataType}
/// </summary>
public class DataPostResponse
{
    /// <summary>
    /// The Id of the created data element
    /// </summary>
    [JsonPropertyName("newDataElementId")]
    public required Guid NewDataElementId { get; init; }

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

/// <summary>
/// Extension of ProblemDetails to include Validation issues from the file upload.
/// </summary>
public class DataPostErrorResponse : ProblemDetails
{
    /// <summary>
    /// Constructor for simple initialization from upload validation issues.
    /// </summary>
    public DataPostErrorResponse(string detail, List<ValidationIssueWithSource> validationIssues)
    {
        Title = "File validation failed";
        Detail = detail;
        Status = (int)HttpStatusCode.BadRequest;
        UploadValidationIssues = validationIssues;
    }

    /// <summary>
    /// List of the validators that reported to have relevant changes after a new data element was added
    /// </summary>
    [JsonPropertyName("uploadValidationIssues")]
    public List<ValidationIssueWithSource> UploadValidationIssues { get; }
}
