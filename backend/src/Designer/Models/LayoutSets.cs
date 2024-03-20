using System.Collections.Generic;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets
{
    [JsonPropertyName("sets")]
    public List<LayoutSetConfig> Sets { get; set; }
}

public class LayoutSetConfig
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("dataType")]
    [CanBeNull] public string DataType { get; set; }

    [JsonPropertyName("tasks")]
    public List<string> Tasks { get; set; }
}
