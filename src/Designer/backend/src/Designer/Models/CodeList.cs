#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public sealed class CodeList
{
    [JsonPropertyName("codes")]
    public required List<Code> Codes { get; set; }

    [JsonPropertyName("source")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public CodeListSource? Source { get; set; }

    [JsonPropertyName("tagNames")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? TagNames { get; set; }

    public override bool Equals(object? obj)
    {
        CodeList? other = obj as CodeList;
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Source, Source) is false)
        {
            return false;
        }

        if (other.Codes.SequenceEqual(Codes) is false)
        {
            return false;
        }

        if (other.TagNames is null || TagNames is null)
        {
            return false;
        }

        if (other.TagNames is null || TagNames is null)
        {
            if (other.TagNames != TagNames)
            {
                return false;
            }
            return true;
        }

        return other.TagNames.SequenceEqual(TagNames);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Source?.GetHashCode(), Codes, TagNames);
    }
}
