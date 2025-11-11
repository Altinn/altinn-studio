#nullable disable
using Altinn.Studio.Designer.Enums;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class LayoutSetPayload
{
    [JsonPropertyName("taskType")]
    public TaskType? TaskType { get; set; }
    [JsonPropertyName("LayoutSetConfig")]
    public LayoutSetConfig LayoutSetConfig { get; set; }
}
