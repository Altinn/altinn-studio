#nullable enable
using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class CodeListData
{
    [JsonPropertyName("title")]
    public required string Title { get; set; }
    [JsonPropertyName("data")]
    public CodeList? Data { get; set; }
    [JsonPropertyName("hasError")]
    public bool? HasError { get; set; }

    public override bool Equals(object? obj)
    {
        CodeListData? other = obj as CodeListData;
        if (other is null)
        {
            return false;
        }

        if (!Equals(other.Title, Title))
        {
            return false;
        }

        if (!Equals(other.HasError, HasError))
        {
            return false;
        }

        return Equals(other.Data, Data);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Title, Data, HasError);
    }
}
