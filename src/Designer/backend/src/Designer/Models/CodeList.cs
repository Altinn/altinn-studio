#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models;

public class CodeList
{
    [JsonPropertyName("codes")]
    public required List<Code> Codes { get; set; }

    [JsonPropertyName("source")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Source? Source { get; set; }

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

        if (other.TagNames is null || TagNames is null)
        {
            return false;
        }

        if (other.TagNames.SequenceEqual(TagNames) is false)
        {
            return false;
        }

        return other.Codes.SequenceEqual(Codes);
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Source?.GetHashCode(), Codes, TagNames);
    }
}

public class Source
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Version { get; set; }

    [JsonPropertyName("queryParameters")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? QueryParameters { get; set; }

    public override bool Equals(object? obj)
    {
        Source? other = obj as Source;
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Name, Name) is false)
        {
            return false;
        }

        if (Equals(other.Version, Version) is false)
        {
            return false;
        }

        if (QueryParameters.IsEqualTo(other.QueryParameters) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Name, Version,  QueryParameters);
    }
}
