using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class FooterFile
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; }

    [JsonPropertyName("footer")]
    public List<FooterConfig> Footer { get; set; }
}

public class FooterConfig
{
    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("icon")]
    public string Icon { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("target")]
    public string Target { get; set; }
}
