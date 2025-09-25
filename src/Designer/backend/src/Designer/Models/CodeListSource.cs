#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models;

public sealed record CodeListSource(string Name, string? Version = null, Dictionary<string, string>? QueryParameters = null)
{
    public bool Equals(CodeListSource? other)
    {
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
