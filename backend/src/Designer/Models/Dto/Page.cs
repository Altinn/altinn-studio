using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class Page
{
    [JsonPropertyName("id")]
    public string id { get; set; }
}
