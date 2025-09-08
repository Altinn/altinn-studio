#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models;

public class CodeList
{
    [JsonPropertyName("sourceName")]
    public string SourceName { get; set; } = string.Empty;

    [JsonPropertyName("codes")]
    public required List<Code> Codes { get; set; }

    [JsonPropertyName("customColumns")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? CustomColumns { get; set; }

    public override bool Equals(object? obj)
    {
        CodeList? other = obj as CodeList;
        if (other is null)
        {
            return false;
        }

        if (!Equals(other.SourceName, SourceName))
        {
            return false;
        }

        if (other.CustomColumns is null || CustomColumns is null)
        {
            return false;
        }

        if (!other.CustomColumns.SequenceEqual(CustomColumns))
        {
            return false;
        }

        return other.Codes.SequenceEqual(Codes);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(SourceName, Codes);
    }
}

