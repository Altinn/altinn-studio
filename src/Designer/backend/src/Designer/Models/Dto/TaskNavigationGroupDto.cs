#nullable disable
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class TaskNavigationGroupDto
{
    [JsonPropertyName("taskId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string TaskId { get; set; }

    [JsonPropertyName("taskType")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string TaskType { get; set; }

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string Name { get; set; }
}
