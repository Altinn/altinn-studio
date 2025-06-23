using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class ImportOptionListResponse
{
    [JsonPropertyName("optionList")]
    public List<OptionListData> OptionList { get; set; }
    [JsonPropertyName("textResources")]
    public Dictionary<string, TextResource> TextResources { get; set; }
}
