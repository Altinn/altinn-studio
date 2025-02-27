using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class Pages
{
    [JsonPropertyName("pages")]
    public List<Page> pages { get; set; }
}
