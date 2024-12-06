using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class TaskModel
{
    [JsonPropertyName("id")]
    public string id { get; set; }
    [JsonPropertyName("type")]
    public string type { get; set; }
}

