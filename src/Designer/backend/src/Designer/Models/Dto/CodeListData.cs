using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models.Dto;

public class CodeListData
{
    [JsonPropertyName("title")]
    public string Title { get; set; }
    [JsonPropertyName("data")]
    [CanBeNull] public CodeList Data { get; set; }
    [JsonPropertyName("hasError")]
    public bool? HasError { get; set; }

    // public override bool Equals(object obj)
    // {
    //     //TODO
    // }
}
