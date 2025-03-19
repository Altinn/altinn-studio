using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class TaskNavigationModel
{
    [JsonPropertyName("taskId")]
    public string taskId { get; set; }
    [JsonPropertyName("taskType")]
    public string taskType { get; set; }
}

