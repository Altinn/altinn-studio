#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
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
        var hash = new HashCode();
        hash.Add(Name, StringComparer.Ordinal);
        hash.Add(Version, StringComparer.Ordinal);
        if (QueryParameters is not null)
        {
            foreach (KeyValuePair<string, string> kvp in QueryParameters.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                hash.Add(kvp.Key, StringComparer.Ordinal);
                hash.Add(kvp.Value, StringComparer.Ordinal);
            }
        }
        return hash.ToHashCode();
    }
}
