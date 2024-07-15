using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class LayoutSetPayload
{
    [JsonPropertyName("taskType")]
    [CanBeNull] public string TaskType { get; set; }
    [JsonPropertyName("LayoutSetConfig")]
    public LayoutSetConfig LayoutSetConfig { get; set; }
}
