using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;
using Altinn.Studio.Designer.Models.App;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed class GenerateDatamodelRequest
{
    /// <summary>
    /// The name of the JSON schema file of the data model, without <c>.schema.json</c>. It is also the
    /// <c>id</c> of the data type.
    /// </summary>
    [Required]
    public required string ModelName { get; init; }

    /// <summary>
    /// The JSON schema of the data model.
    /// </summary>
    [Required]
    public required JsonNode Schema { get; init; }

    /// <summary>
    /// The application metadata of the app.
    /// </summary>
    [Required]
    public required ApplicationMetadata ApplicationMetadata { get; init; }

    /// <summary>
    /// The <c>useNullableReferenceTypes</c> value in <c>.altinnstudio/settings.json</c> of the app. If the app
    /// does not have this file, the value is false.
    /// </summary>
    public bool UseNullableReferenceTypes { get; init; }

    /// <summary>
    /// If true, the app uses version 9 or a newer version of the app backend.
    /// </summary>
    public bool IsV9OrNewer { get; init; }
}
