#nullable enable
using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models;
public class CodeListSource
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
        CodeListSource? other = obj as CodeListSource;
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
        return HashCode.Combine(Name, Version, QueryParameters);
    }
}
