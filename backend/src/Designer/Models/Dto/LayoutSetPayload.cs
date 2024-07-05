using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class LayoutSetPayload
{
    [JsonPropertyName("taskType")]
    public string TaskType { get; set; }
    [JsonPropertyName("LayoutSetConfig")]
    public LayoutSetConfig LayoutSetConfig { get; set; }
}
