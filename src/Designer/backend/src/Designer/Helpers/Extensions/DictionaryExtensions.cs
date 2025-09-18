#nullable enable
using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Helpers.Extensions;

public static class DictionaryExtensions
{
    public static bool IsEqualTo(
        this Dictionary<string, string>? first,
        Dictionary<string, string>? second)
    {
        if (first is null && second is null)
        {
            return true;
        }

        if (first is null || second is null)
        {
            return false;
        }

        if (first.GetHashCode() == second.GetHashCode())
        {
            return true;
        }

        if (first.Count != second.Count)
        {
            return false;
        }

        foreach (KeyValuePair<string, string> kvp in first)
        {
            if (second.TryGetValue(kvp.Key, out string? value) is false)
            {
                return false;
            }

            if (StringComparer.Ordinal.Equals(kvp.Value, value) is false)
            {
                return false;
            }
        }

        return true;
    }
}
