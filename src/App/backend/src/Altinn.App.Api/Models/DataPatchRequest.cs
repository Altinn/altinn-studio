using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;
using Json.Patch;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the request to patch data on the <see cref="DataController"/>.
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
    public List<string>? IgnoredValidators { get; init; }
}
