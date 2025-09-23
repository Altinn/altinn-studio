#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Helpers.JsonConverterHelpers;

namespace Altinn.Studio.Designer.Models;

public sealed class Code
{
    /// <summary>
    /// Value that connects the option to the data model.
    /// </summary>
    [NotNullable]
    [JsonPropertyName("value")]
    [JsonConverter(typeof(OptionValueConverter))]
    public required object Value { get; set; }

    /// <summary>
    /// Label to present to the user.
    /// </summary>
    [NotNullable]
    [JsonPropertyName("label")]
    public required Dictionary<string, string> Label { get; set; }

    /// <summary>
    /// Description, typically displayed below the label.
    /// </summary>
    [JsonPropertyName("description")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? Description { get; set; }

    /// <summary>
    /// Help text, typically wrapped inside a popover.
    /// </summary>
    [JsonPropertyName("helpText")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string>? HelpText { get; set; }

    [JsonPropertyName("tags")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? Tags { get; set; }

    public override bool Equals(object? obj)
    {
        Code? other = obj as Code;
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
