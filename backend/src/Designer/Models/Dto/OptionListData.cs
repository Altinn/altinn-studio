using System.Collections.Generic;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class OptionListData
{
    [JsonPropertyName("title")]
    public string Title { get; set; }
    [JsonPropertyName("data")]
    [CanBeNull] public List<Option> Data { get; set; }
    [JsonPropertyName("hasError")]
    public bool? HasError { get; set; }
}
