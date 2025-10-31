#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PageDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
}
