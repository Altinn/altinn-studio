using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class TaskModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; }
}
