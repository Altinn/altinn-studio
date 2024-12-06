using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class ComponentIdChange
{
    [JsonPropertyName("oldComponentId")]
    public string OldComponentId { get; set; }
    [JsonPropertyName("newComponentId")]
    public string NewComponentId { get; set; }
}


