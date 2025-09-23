#nullable enable
using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed class CodeListWrapper
{
    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("codeList")]
    public CodeList? CodeList { get; set; }

    [JsonPropertyName("hasError")]
    public bool? HasError { get; set; }

    public override bool Equals(object? obj)
    {
        CodeListWrapper? other = obj as CodeListWrapper;
        if (other is null)
        {
            return false;
        }

        if (string.Equals(other.Title, Title) is false)
        {
            return false;
        }

        if (Equals(other.HasError, HasError) is false)
        {
            return false;
        }

        return Equals(other.CodeList, CodeList);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Title, CodeList, HasError);
    }
}
