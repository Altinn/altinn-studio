using System.Collections.Generic;
using System.Text.Json.Serialization;
using Json.Patch;

namespace Altinn.Studio.Designer.Models.Preview;

/// <summary>
/// Represents the request to patch data on the <see cref="Controllers.Preview.DataController"/>.
/// </summary>
public class DataPatchRequest
{
    /// <summary>
    /// The Patch operation to perform.
    /// </summary>
    [JsonPropertyName("patch")]
    public required JsonPatch Patch { get; init; }

    /// <summary>
    /// List of validators to ignore during the patch operation.
    /// Issues from these validators will not be run during the save operation, but the validator will run on process/next
    /// </summary>
    [JsonPropertyName("ignoredValidators")]
    public required List<string>? IgnoredValidators { get; init; }
}
