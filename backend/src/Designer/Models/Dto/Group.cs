using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class Group
{
    [JsonPropertyName("name")]
    public string Name { get; set; }

    [JsonPropertyName("pages")]
    public List<Page> pages { get; set; }
}
