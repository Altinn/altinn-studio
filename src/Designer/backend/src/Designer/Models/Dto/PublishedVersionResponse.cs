
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;
/// <summary>
/// Response model for published version
/// </summary>
public class PublishedVersionResponse
{
    /// <summary>
    /// The published version string
    /// </summary>
    [JsonPropertyName("publishedVersion")]
    public string PublishedVersion { get; set; } = string.Empty;
}
