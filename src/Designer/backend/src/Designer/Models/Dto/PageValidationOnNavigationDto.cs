using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PageValidationOnNavigationDto
{
    [JsonPropertyName("task")]
    public required string Task { get; set; }

    [JsonPropertyName("pages")]
    public List<string> Pages { get; set; } = [];

    [JsonPropertyName("page")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Page { get; set; }

    [JsonPropertyName("show")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Show { get; set; }
}
