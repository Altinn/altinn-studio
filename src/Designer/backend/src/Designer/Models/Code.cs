using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models;

public sealed record Code(
    string Value,
    Dictionary<string, string> Label,
    Dictionary<string, string>? Description,
    Dictionary<string, string>? HelpText,
    List<string>? Tags)
{
    public bool Equals(Code? other)
    {
        if (other is null)
        {
            return false;
        }

        if (Equals(other.Value, Value) is false)
        {
            return false;
        }

        if (Label.IsEqualTo(other.Label) is false)
        {
            return false;
        }

        if (HelpText.IsEqualTo(other.HelpText) is false)
        {
            return false;
        }

        if (Description.IsEqualTo(other.Description) is false)
        {
            return false;
        }

        if (other.Tags is null || Tags is null)
        {
            if (other.Tags != Tags)
            {
                return false;
            }
            return true;
        }

        if (other.Tags.SequenceEqual(Tags) is false)
        {
            return false;
        }
        return true;
    }

    public override int GetHashCode()
    {
        var hash = new HashCode();

        hash.Add(Value, StringComparer.Ordinal);

        foreach (KeyValuePair<string, string> kvp in Label.OrderBy(k => k.Key, StringComparer.Ordinal))
        {
            hash.Add(kvp.Key, StringComparer.Ordinal);
            hash.Add(kvp.Value, StringComparer.Ordinal);
        }

        if (Description is not null)
        {
            foreach (KeyValuePair<string, string> kvp in Description.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                hash.Add(kvp.Key, StringComparer.Ordinal);
                hash.Add(kvp.Value, StringComparer.Ordinal);
            }
        }

        if (HelpText is not null)
        {
            foreach (KeyValuePair<string, string> kvp in HelpText.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                hash.Add(kvp.Key, StringComparer.Ordinal);
                hash.Add(kvp.Value, StringComparer.Ordinal);
            }
        }

        if (Tags is not null)
        {
            foreach (string tag in Tags)
            {
                hash.Add(tag, StringComparer.Ordinal);
            }
        }
        return hash.ToHashCode();
    }
}
