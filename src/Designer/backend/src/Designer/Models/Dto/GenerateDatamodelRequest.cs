using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A data model and the app files that generating its model files reads, from a caller that edits
/// the app outside the developer's repository in Designer.
/// </summary>
public sealed class GenerateDatamodelRequest
{
    /// <summary>
    /// The name of the data model's JSON schema file without <c>.schema.json</c>, which is also the id
    /// of its data type.
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string ModelName { get; init; }

    /// <summary>
    /// The JSON schema of the data model.
    /// </summary>
    [Required]
    public required JsonNode Schema { get; init; }

    /// <summary>
    /// The contents of the app's <c>App/config/applicationmetadata.json</c>.
    /// </summary>
    [Required]
    public required JsonObject ApplicationMetadata { get; init; }

    /// <summary>
    /// The <c>useNullableReferenceTypes</c> setting in the app's <c>.altinnstudio/settings.json</c>, or
    /// false when the app has no such file.
    /// </summary>
    public bool UseNullableReferenceTypes { get; init; }

    /// <summary>
    /// Whether the app uses the v9 app backend or newer.
    /// </summary>
    public bool IsV9OrNewer { get; init; }
}
