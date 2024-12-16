#nullable enable
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Json.Patch;

namespace Altinn.Studio.Designer.Models.Preview;

/// <summary>
/// Represents the request to patch data on the <see cref="Controllers.Preview.DataController"/>.
/// This version allows multiple patches to be applied by the same request.
/// </summary>
public class DataPatchRequestMultiple
{
    /// <summary>
    /// List of patches to apply.
    /// </summary>
    [JsonPropertyName("patches")]
    public required List<PatchListItem> Patches { get; init; }

    /// <summary>
    /// Item class for the list of Patches
    /// </summary>
    /// <param name="DataElementId">The guid of the data element to patch</param>
    /// <param name="Patch">The patch to apply</param>
    public record PatchListItem
    (
        [property: JsonPropertyName("dataElementId")] Guid DataElementId,
        [property: JsonPropertyName("patch")] JsonPatch Patch
    );

    public required List<string>? IgnoredValidators { get; init; }
}
