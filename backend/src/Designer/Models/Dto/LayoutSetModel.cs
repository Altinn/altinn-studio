using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class LayoutSetModel
{
    [JsonPropertyName("id")]
    public string id { get; set; }
    [JsonPropertyName("dataType")]
    public string dataType { get; set; }
    [JsonPropertyName("type")]
    public string type { get; set; }
    [JsonPropertyName("task")]
    public TaskModel task { get; set; }
}

