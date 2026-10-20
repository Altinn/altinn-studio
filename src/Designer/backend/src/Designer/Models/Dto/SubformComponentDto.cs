using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// A Subform component with its source layout set and the layout set and data type of the subform it opens.
/// Unresolved subform fields are serialized as null.
/// </summary>
public class SubformComponentDto
{
    [JsonPropertyName("componentId")]
    public required string ComponentId { get; set; }

    [JsonPropertyName("layoutSetId")]
    public required string LayoutSetId { get; set; }

    [JsonPropertyName("taskType")]
    public string? TaskType { get; set; }

    [JsonPropertyName("layoutName")]
    public required string LayoutName { get; set; }

    [JsonPropertyName("subformLayoutSetId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? SubformLayoutSetId { get; set; }

    [JsonPropertyName("subformDataTypeId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.Never)]
    public string? SubformDataTypeId { get; set; }
}
