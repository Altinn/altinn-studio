using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class LayoutSetModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; }
    [JsonPropertyName("dataType")]
    public string DataType { get; set; }
    [JsonPropertyName("type")]
    public string Type { get; set; } // Decides if layout set is subform
    [JsonPropertyName("task")]
    public TaskModel Task { get; set; }
}

