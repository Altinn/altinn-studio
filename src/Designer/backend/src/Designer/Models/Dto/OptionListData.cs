#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class OptionListData
{
    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("data")]
    public List<Option> Data { get; set; }

    [JsonPropertyName("hasError")]
    public bool? HasError { get; set; }
}
