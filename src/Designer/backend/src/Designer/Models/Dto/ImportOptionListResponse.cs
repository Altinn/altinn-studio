#nullable disable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class ImportOptionListResponse
{
    [JsonPropertyName("optionLists")]
    public List<OptionListData> OptionLists { get; set; }
    [JsonPropertyName("textResources")]
    public Dictionary<string, TextResource> TextResources { get; set; }
}
