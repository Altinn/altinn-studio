using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class OptionListReference
{
    [JsonPropertyName("optionListId")]
    public string OptionListId { get; set; }

    [JsonPropertyName("optionListIdSources")]
    public List<OptionListIdSource> OptionListIdSources { get; set; }
}

public class OptionListIdSource
{
    [JsonPropertyName("taskId")]
    public string TaskId { get; set; }

    [JsonPropertyName("taskType")]
    public string TaskType { get; set; }

    [JsonPropertyName("layoutSetId")]
    public string LayoutSetId { get; set; }

    [JsonPropertyName("layoutName")]
    public string LayoutName { get; set; }

    [JsonPropertyName("componentIds")]
    public List<string> ComponentIds { get; set; }
}
