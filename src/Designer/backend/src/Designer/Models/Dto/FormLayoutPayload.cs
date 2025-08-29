using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class FormLayoutPayload
{
    [JsonPropertyName("componentIdsChange")]
    public List<ComponentIdChange> ComponentIdsChange { get; set; }
    [JsonPropertyName("layout")]
    public JsonNode Layout { get; set; }
}
