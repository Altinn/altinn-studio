using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the request to patch data on the <see cref="DataController"/>.
/// </summary>
public class DataPatchRequest
{
    /// <summary>
    /// The JSON Patch (RFC 6902) to apply to the data element, as an ordered list of operations.
    /// </summary>
    [JsonPropertyName("patch")]
    public required List<JsonPatchOperation> Patch { get; init; }

    /// <summary>
    /// List of validators to ignore during the patch operation.
    /// Issues from these validators will not be run during the save operation, but the validator will run on process/next
    /// </summary>
    [JsonPropertyName("ignoredValidators")]
    public List<string>? IgnoredValidators { get; init; }
}
