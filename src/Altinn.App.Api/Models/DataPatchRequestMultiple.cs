using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the request to patch data on the <see cref="DataController"/> in the
/// version that supports multiple data models in the same request.
/// </summary>
public class DataPatchRequestMultiple
{
    /// <summary>
    /// The Patch operation to perform in a dictionary keyed on the <see cref="DataElement.Id"/>.
    /// </summary>
    [JsonPropertyName("patches")]
    public required Dictionary<Guid, JsonPatch> Patches { get; init; }

    /// <summary>
    /// List of validators to ignore during the patch operation.
    /// Issues from these validators will not be run during the save operation, but the validator will run on process/next
    /// </summary>
    [JsonPropertyName("ignoredValidators")]
    public required List<string>? IgnoredValidators { get; init; }
}
