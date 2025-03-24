using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class Group
{
    [JsonPropertyName("name")]
    public string name { get; set; }

    [JsonPropertyName("pages")]
    public List<Page> pages { get; set; }
}
