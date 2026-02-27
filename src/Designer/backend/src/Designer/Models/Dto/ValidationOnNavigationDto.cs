using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class ValidationOnNavigationDto
{
    [JsonPropertyName("tasks")]
    public List<string> Tasks { get; set; } = [];

    [JsonPropertyName("show")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Show { get; set; }

    [JsonPropertyName("page")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Page { get; set; }
}
