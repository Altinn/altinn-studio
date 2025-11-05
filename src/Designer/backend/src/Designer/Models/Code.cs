using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Models;

public sealed record Code
{
    public Code(string value,
        Dictionary<string, string> label,
        Dictionary<string, string>? description,
        Dictionary<string, string>? helpText,
        List<string>? tags)
    {
        Value = value;
        Label = label;
        Description = description;
        HelpText = helpText;
        Tags = tags;
    }
    public string Value { get; init; }
    public Dictionary<string, string> Label { get; init; }
    public Dictionary<string, string>? Description { get; init; }
    public Dictionary<string, string>? HelpText { get; init; }
    public List<string>? Tags { get; init; }

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

        hash.Add(Value);

        if (Label is not null)
        {
            foreach (KeyValuePair<string, string> kvp in Label.OrderBy(k => k.Key, StringComparer.Ordinal))
            {
                hash.Add(kvp.Key, StringComparer.Ordinal);
                hash.Add(kvp.Value, StringComparer.Ordinal);
            }
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
                hash.Add(tag);
            }
        }
        return hash.ToHashCode();
    }
}
