using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class GiteaBadRequestDto
{
    [JsonPropertyName("message")]
    public string? Message { get; set; }
    [JsonPropertyName("url")]
    public string? Url { get; set; }
}
