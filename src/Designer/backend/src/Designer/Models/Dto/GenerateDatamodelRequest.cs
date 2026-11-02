using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed class GenerateDatamodelRequest
{
    /// <summary>
    /// The name of the JSON schema file of the data model, without <c>.schema.json</c>. It is also the
    /// <c>id</c> of the data type.
    /// </summary>
    [Required]
    [MinLength(1)]
    public required string ModelName { get; init; }

    [Required]
    public required JsonNode Schema { get; init; }

    [Required]
    public required JsonObject ApplicationMetadata { get; init; }

    /// <summary>
    /// The <c>useNullableReferenceTypes</c> value in <c>.altinnstudio/settings.json</c> of the app. If the app
    /// does not have this file, the value is false.
    /// </summary>
    public bool UseNullableReferenceTypes { get; init; }

    public bool IsV9OrNewer { get; init; }
}
