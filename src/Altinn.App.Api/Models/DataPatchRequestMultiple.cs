using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.App.Api.Controllers;
using Json.Patch;

namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the request to patch data on the <see cref="DataController"/> in the
/// version that supports multiple data models in the same request.
/// </summary>
public class DataPatchRequestMultiple
{
    /// <summary>
    /// The Patch operations to perform.
    /// </summary>
    [JsonPropertyName("patches"), Required]
    public required List<PatchListItem> Patches { get; init; }

    /// <summary>
    /// Item class for the list of patches with Id
    /// </summary>
    /// <param name="DataElementId">The guid for the data element this patch applies to</param>
    /// <param name="Patch">The JsonPatch</param>
    public record PatchListItem(
        [property: JsonPropertyName("dataElementId")] Guid DataElementId,
        [property: JsonPropertyName("patch")] JsonPatch Patch
    );

    /// <summary>
    /// List of validators to ignore during the patch operation.
    /// Issues from these validators will not be run during the save operation, but the validator will run on process/next
    /// </summary>
    [JsonPropertyName("ignoredValidators")]
    public List<string>? IgnoredValidators { get; init; }
}
