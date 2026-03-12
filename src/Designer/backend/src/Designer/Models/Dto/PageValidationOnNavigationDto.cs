using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PageValidationOnNavigationDto
{
    [JsonPropertyName("task")]
    public string Task { get; set; } = string.Empty;

    [JsonPropertyName("pages")]
    public List<string> Pages { get; set; } = [];

    [JsonPropertyName("page")]
    public string Page { get; set; } = string.Empty;

    [JsonPropertyName("show")]
    public List<string> Show { get; set; } = [];
}
